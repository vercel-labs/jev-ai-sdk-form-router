import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";

import { examples } from "./examples";
import type { DestinationId } from "./examples";
import { routingRecipients } from "./recipients";
import type { RecipientMap } from "./recipients";
import type { RoutingDecision } from "./router";
import { isEmailConfigured, processSubmission } from "./submission";

vi.mock("server-only", () => ({}));
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const example = examples.contact;
const contactRecipients: RecipientMap = {
  ...routingRecipients,
  billing_invoices: "billing@example.com",
  billing_refunds: "refunds@example.com",
  contact_triage: "triage@example.com",
  general_inquiries: "hello@example.com",
  support_access: "access@example.com",
  support_technical: "support@example.com",
};
const decision: RoutingDecision = {
  destination: example.destinations[0],
  fallbackReason: null,
  jev: {
    confidence: 0.97,
    destination: example.destinations[0].id,
    probabilities: null,
    selectedProbability: 0.99,
  },
  model: "typesafe-ai/jev",
  threshold: 0.95,
  timings: { jevMs: 42, lunaMs: null },
};
const route = vi.fn(() => Promise.resolve(decision));

const makeSubmission = (sendEmail = false): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(example.samples[0].values)) {
    data.set(key, value);
  }
  data.set("example", example.id);
  data.set("submissionId", "4ed16e93-8182-4970-881b-9bd970f874b6");
  data.set("sendEmail", String(sendEmail));
  return data;
};

beforeEach(() => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-gateway-key");
  vi.stubEnv("VERCEL_OIDC_TOKEN", "");
  vi.stubGlobal(Symbol.for("@vercel/request-context"), { get: () => ({}) });
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("Unexpected network request"))
  );
  vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  vi.stubEnv("RESEND_FROM", "router@example.com");
  send.mockReset();
  route.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("submission workflow", () => {
  it("explains a Gateway model-access denial without exposing provider details", async () => {
    const result = await processSubmission(makeSubmission(true), () => {
      throw Object.assign(new Error("Private provider response"), {
        statusCode: 403,
      });
    });
    expect(result).toMatchObject({
      message: expect.stringContaining(
        "denied access to openai/gpt-6-luna-fast"
      ),
      status: "error",
    });
    expect(JSON.stringify(result)).not.toContain("Private provider response");
    expect(send).not.toHaveBeenCalled();
  });
  it("renders an escaped email preview without sending by default", async () => {
    const data = makeSubmission();
    data.set("message", '<script>alert("test")</script>');
    const result = await processSubmission(data, route, contactRecipients);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.delivery.status).toBe("preview");
      expect(result.email.html).toContain("&lt;script&gt;");
      expect(result.email.html).not.toContain("<script>");
      expect(result.email.html).toContain("Billing");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("sends only to the configured recipient with the validated reply-to", async () => {
    send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const data = makeSubmission(true);
    data.set("to", "attacker@example.com");
    const result = await processSubmission(data, route, contactRecipients);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "router@example.com",
        html: expect.any(String),
        replyTo: "alex@example.com",
        text: expect.any(String),
        to: "billing@example.com",
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining("4ed16e93"),
      })
    );
    expect(result).toMatchObject({
      delivery: { id: "email-1", status: "accepted" },
      status: "success",
    });
  });

  it("retries transient delivery errors with the exact same payload and key", async () => {
    send
      .mockResolvedValueOnce({ data: null, error: { statusCode: 500 } })
      .mockResolvedValueOnce({ data: { id: "email-2" }, error: null });
    const result = await processSubmission(
      makeSubmission(true),
      route,
      contactRecipients
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
    expect(result).toMatchObject({ delivery: { status: "accepted" } });
  });

  it("preserves routing on permanent email failure without retrying", async () => {
    send.mockResolvedValue({ data: null, error: { statusCode: 422 } });
    const result = await processSubmission(
      makeSubmission(true),
      route,
      contactRecipients
    );
    expect(result).toMatchObject({
      decision,
      delivery: { status: "failed" },
      status: "success",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not call models for invalid fields", async () => {
    const data = makeSubmission();
    data.set("email", "invalid");
    const result = await processSubmission(data, route, contactRecipients);
    expect(result).toMatchObject({
      fieldErrors: { email: expect.any(Array) },
      status: "error",
    });
    expect(route).not.toHaveBeenCalled();
  });

  it("allows injected routing without Gateway environment variables", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    const result = await processSubmission(
      makeSubmission(),
      route,
      contactRecipients
    );
    expect(result).toMatchObject({
      delivery: { status: "preview" },
      status: "success",
    });
    expect(route).toHaveBeenCalledWith(example, example.samples[0].values);
  });

  it("returns a safe error and sends nothing when routing fails", async () => {
    const result = await processSubmission(makeSubmission(true), () => {
      throw new Error("Private provider details");
    });
    expect(result).toMatchObject({ status: "error" });
    expect(JSON.stringify(result)).not.toContain("Private provider details");
    expect(send).not.toHaveBeenCalled();
  });

  it("derives recipient keys from the literal destination IDs", () => {
    expectTypeOf<keyof RecipientMap>().toEqualTypeOf<DestinationId>();
    expectTypeOf<DestinationId>().not.toEqualTypeOf<string>();
  });

  it("requires only the current form's inboxes", () => {
    expect(isEmailConfigured(example, contactRecipients)).toBe(true);
    expect(isEmailConfigured(examples.leads, contactRecipients)).toBe(false);
    expect(isEmailConfigured(examples.issues, contactRecipients)).toBe(false);
  });

  it.each([null, "", "not-an-email"])(
    "disables delivery for an unconfigured or invalid inbox: %s",
    async (inbox) => {
      const mapping = { ...contactRecipients, billing_refunds: inbox };
      expect(isEmailConfigured(example, mapping)).toBe(false);
      const result = await processSubmission(
        makeSubmission(true),
        route,
        mapping
      );
      expect(result).toMatchObject({
        delivery: { status: "failed" },
        status: "success",
      });
      expect(send).not.toHaveBeenCalled();
    }
  );

  it("uses the final destination's inbox after Luna changes the owner", async () => {
    send.mockResolvedValue({ data: { id: "email-luna" }, error: null });
    await processSubmission(
      makeSubmission(true),
      () =>
        Promise.resolve<RoutingDecision>({
          ...decision,
          destination: example.destinations[2],
          fallbackReason: "low-confidence",
          model: "openai/gpt-6-luna-fast",
        }),
      contactRecipients
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "access@example.com" }),
      expect.any(Object)
    );
  });
});

describe("Gateway authentication", () => {
  it.each([
    { confidence: 0.99, source: "api-key" },
    { confidence: 0.99, source: "local-oidc" },
    { confidence: 0.99, source: "request-oidc" },
    { confidence: 0.5, source: "request-oidc" },
  ])(
    "routes using $source with Jev confidence $confidence",
    async ({ source, confidence }) => {
      const payload = Buffer.from(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString("base64url");
      const oidcToken = `e30.${payload}.test-signature`;
      vi.stubEnv(
        "NODE_ENV",
        source === "local-oidc" ? "development" : "production"
      );
      vi.stubEnv(
        "AI_GATEWAY_API_KEY",
        source === "api-key" ? "test-gateway-key" : ""
      );
      vi.stubEnv("VERCEL_OIDC_TOKEN", source === "local-oidc" ? oidcToken : "");
      if (source === "request-oidc") {
        vi.stubGlobal(Symbol.for("@vercel/request-context"), {
          get: () => ({ headers: { "x-vercel-oidc-token": oidcToken } }),
        });
      }
      const gatewayFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({
            answers: {
              destination: { choice: "billing_invoices", type: "choice" },
            },
            providerMetadata: {
              typesafe: { confidence: { destination: confidence } },
            },
          })
        )
        .mockResolvedValueOnce(
          Response.json({
            content: [
              {
                text: JSON.stringify({ destination: "support_access" }),
                type: "text",
              },
            ],
            finishReason: { raw: "stop", unified: "stop" },
            usage: {
              inputTokens: { total: 10 },
              outputTokens: { total: 5 },
            },
          })
        );
      vi.stubGlobal("fetch", gatewayFetch);

      const result = await processSubmission(makeSubmission());

      expect(result).toMatchObject({
        decision: {
          destination: {
            id: confidence < 0.95 ? "support_access" : "billing_invoices",
          },
          model:
            confidence < 0.95 ? "openai/gpt-6-luna-fast" : "typesafe-ai/jev",
        },
        delivery: { status: "preview" },
        status: "success",
      });
      expect(gatewayFetch).toHaveBeenCalledTimes(confidence < 0.95 ? 2 : 1);
      for (const [, init] of gatewayFetch.mock.calls) {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          `Bearer ${source === "api-key" ? "test-gateway-key" : oidcToken}`
        );
      }
      expect(send).not.toHaveBeenCalled();
    }
  );

  it.each(["development", "production"] as const)(
    "reports actual authentication failures appropriately in %s",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      const gatewayFetch = vi.fn<typeof fetch>().mockImplementation(() =>
        Promise.resolve(
          Response.json(
            {
              error: {
                message: "Private provider details",
                type: "authentication_error",
              },
            },
            { status: 401 }
          )
        )
      );
      vi.stubGlobal("fetch", gatewayFetch);

      const result = await processSubmission(makeSubmission(true));

      expect(result).toMatchObject({
        message: expect.stringContaining("AI Gateway authentication failed"),
        status: "error",
      });
      expect(gatewayFetch).toHaveBeenCalledTimes(2);
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("Private provider details");
      if (environment === "development") {
        expect(serialized).toContain("AI_GATEWAY_API_KEY");
        expect(serialized).toContain("vercel env pull .env.local");
      } else {
        expect(serialized).toContain("deployment");
        expect(serialized).not.toContain(".env.local");
        expect(serialized).not.toContain("restart");
      }
      expect(send).not.toHaveBeenCalled();
    }
  );
});
