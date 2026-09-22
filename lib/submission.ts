import "server-only";
import { createElement } from "react";
import { render, toPlainText } from "react-email";
import { Resend } from "resend";
import { z } from "zod";

import RoutedSubmissionEmail from "../emails/routed-submission";
import { destinationLabel, examples } from "./examples";
import type { Example } from "./examples";
import { routingRecipients } from "./recipients";
import type { RecipientMap } from "./recipients";
import { routeSubmission, submissionSchema } from "./router";
import type { RoutingDecision } from "./router";

/**
 * Delivery outcome after successful routing. A failed send preserves the routing result.
 * @remarks `preview` means no send was requested. `accepted` means Resend returned
 * a message ID, not confirmed inbox delivery. `failed` means configuration was
 * incomplete or acceptance could not be confirmed, not necessarily that nothing was sent.
 */
type Delivery =
  | { status: "preview" }
  | { status: "accepted"; id: string }
  | { status: "failed"; message: string };

/**
 * The serializable result returned by the form's Server Action.
 * @remarks Returned errors cover validation, Gateway configuration, and routing.
 * Success includes the email preview and a separate delivery outcome.
 * Rendering failures reject the action rather than producing this union's error branch.
 */
export type SubmissionResult =
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | {
      status: "success";
      decision: RoutingDecision;
      email: { subject: string; html: string };
      delivery: Delivery;
    };

const emailAddressSchema = z.email();

/**
 * Reports whether every destination on a page has a configured inbox.
 * @param example - The page whose destination inboxes must all be configured.
 * @param mapping - Server-owned recipient configuration, injectable for offline tests.
 * @returns Whether a Resend API key is present and the sender and every required inbox are syntactically valid.
 * @remarks This local check makes no network request and does not verify the key,
 * sender domain, or inbox deliverability. Only this boolean is sent to the client.
 * Recipient addresses remain server-side.
 */
export const isEmailConfigured = (
  example: Example,
  mapping: RecipientMap = routingRecipients
): boolean =>
  Boolean(
    process.env.RESEND_API_KEY &&
    emailAddressSchema.safeParse(process.env.RESEND_FROM).success &&
    example.destinations.every(
      (destination) =>
        emailAddressSchema.safeParse(mapping[destination.id]).success
    )
  );

/**
 * Attempts delivery to the server-configured inbox for a successful routing decision.
 * @param example - Registered form whose complete delivery configuration is required.
 * @param decision - Final decision containing a registered destination for this example.
 * @param email - Rendered subject and HTML, also used to derive the plain-text body.
 * @param replyTo - Validated submitter email address.
 * @param submissionId - Validated UUID identifying this send operation.
 * @param mapping - Server-owned destination-to-inbox map, never supplied by the client.
 * @returns Resend acceptance or a failure with uncertain acceptance after transport errors.
 * @throws {Error} When email payload preparation fails before the send attempts.
 * @remarks Makes at most two sequential attempts for transient or transport failures,
 * reusing the exact payload and idempotency key. New manual submissions have new UUIDs
 * and are not deduplicated against earlier send operations. Acceptance does not confirm delivery.
 */
const deliverEmail = async (
  example: Example,
  decision: RoutingDecision,
  email: { subject: string; html: string },
  replyTo: string,
  submissionId: string,
  mapping: RecipientMap
): Promise<Delivery> => {
  const to = mapping[decision.destination.id];
  const from = process.env.RESEND_FROM;
  if (!isEmailConfigured(example, mapping) || !to || !from) {
    return {
      message:
        "Email is not configured for this example. Your routing result and preview are available.",
      status: "failed",
    };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const payload = {
    from,
    replyTo,
    to,
    ...email,
    text: toPlainText(email.html),
  };
  const options = {
    idempotencyKey: `form-router/${example.id}/${submissionId}`,
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // Wait for each attempt before deciding whether another send is needed.
      // oxlint-disable-next-line no-await-in-loop
      const response = await resend.emails.send(payload, options);
      if (response.data) {
        return { id: response.data.id, status: "accepted" };
      }
      const statusCode = response.error?.statusCode;
      if (statusCode && statusCode < 500 && statusCode !== 429) {
        break;
      }
    } catch {
      // A lost response may follow acceptance. The same key prevents a duplicate send.
    }
  }
  return {
    message:
      "Email acceptance could not be confirmed. Your routing result is preserved. Check Resend before submitting again.",
    status: "failed",
  };
};

/**
 * Validates, routes, renders a preview, and optionally emails a submission.
 * @param formData - Registered string fields, an `example` ID, a UUID `submissionId`,
 * and optional `sendEmail`. Only the exact string `"true"` opts into delivery.
 * @param route - Injectable routing function for offline tests, which need no Gateway credentials.
 * @param mapping - Server-owned recipient configuration; never sourced from form data.
 * @returns Validation, configuration, or routing errors, or a routing success with preview and delivery status.
 * @throws {Error} When email rendering or payload preparation fails outside the handled provider calls.
 * @remarks A UUID is required even for preview-only requests. It identifies one send
 * operation and must be regenerated for a new manual submission. Provider errors are
 * converted to safe messages, while email delivery failures preserve successful routing.
 * Authentication is resolved by the SDK, including OIDC from Vercel's request context.
 */
export const processSubmission = async (
  formData: FormData,
  route: typeof routeSubmission = routeSubmission,
  mapping: RecipientMap = routingRecipients
): Promise<SubmissionResult> => {
  const id = z
    .enum(["leads", "contact", "issues"])
    .safeParse(formData.get("example"));
  const submissionId = z.uuid().safeParse(formData.get("submissionId"));
  if (!id.success || !submissionId.success) {
    return {
      message: "Invalid submission. Refresh the page and try again.",
      status: "error",
    };
  }
  const example = examples[id.data];
  const parsed = submissionSchema(example).safeParse(
    Object.fromEntries(
      example.fields.map((field) => [
        field.name,
        formData.get(field.name) ?? "",
      ])
    )
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return {
      fieldErrors,
      message: "Check the highlighted fields and try again.",
      status: "error",
    };
  }
  let decision: RoutingDecision;
  try {
    decision = await route(example, parsed.data);
  } catch (error) {
    // AI SDK wraps authentication failures with these names and drops the HTTP status.
    const authentication = z
      .union([
        z.object({ statusCode: z.literal(401) }),
        z.object({
          name: z.enum(["GatewayAuthenticationError", "GatewayError"]),
        }),
      ])
      .safeParse(error);
    if (authentication.success) {
      return {
        message:
          process.env.NODE_ENV === "development"
            ? "AI Gateway authentication failed. Set AI_GATEWAY_API_KEY in .env.local, or run vercel link and vercel env pull .env.local to use Vercel OIDC. No email was sent."
            : "AI Gateway authentication failed. Check this deployment’s Gateway credentials or Vercel OIDC configuration. No email was sent.",
        status: "error",
      };
    }
    const forbidden = z.object({ statusCode: z.literal(403) }).safeParse(error);
    if (forbidden.success) {
      return {
        message:
          "AI Gateway denied access to openai/gpt-6-luna-fast. Check this Gateway account’s model access and paid-credit configuration, then try again. No email was sent.",
        status: "error",
      };
    }
    return {
      message:
        "We couldn’t complete the routing review. Check your Gateway configuration or try again. No email was sent.",
      status: "error",
    };
  }
  const email = {
    html: await render(
      createElement(RoutedSubmissionEmail, {
        confidence: decision.jev?.confidence ?? null,
        destination: destinationLabel(decision.destination),
        example: example.title,
        fields: example.fields.map((field) => ({
          label: field.label,
          value: parsed.data[field.name],
        })),
        model: decision.model,
        selectedProbability: decision.jev?.selectedProbability ?? null,
      })
    ),
    subject: `${example.title} submission: ${decision.destination.team} (${decision.destination.specialty})`,
  };
  const delivery =
    formData.get("sendEmail") === "true"
      ? await deliverEmail(
          example,
          decision,
          email,
          parsed.data.email,
          submissionId.data,
          mapping
        )
      : { status: "preview" as const };
  return { decision, delivery, email, status: "success" };
};
