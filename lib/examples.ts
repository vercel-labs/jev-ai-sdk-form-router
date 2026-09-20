/** A supported form example and its URL segment. */
export type ExampleId = "leads" | "contact" | "issues";

/** A form control whose constraints also drive server validation. */
export interface FormField {
  name: string;
  label: string;
  placeholder: string;
  type: "text" | "email" | "textarea";
  required: boolean;
  maxLength: number;
}

/** One application-owned destination, combining its team and specialty. */
interface DestinationDefinition {
  id: string;
  team: string;
  specialty: string;
  criteria: string;
}

/** The shared source of truth for a page, its form, and both routing models. */
interface ExampleDefinition {
  id: ExampleId;
  title: string;
  description: string;
  instructions: string;
  fields: readonly FormField[];
  destinations: readonly [DestinationDefinition, ...DestinationDefinition[]];
  samples: readonly { label: string; values: Record<string, string> }[];
}

const field = (
  name: string,
  label: string,
  placeholder: string,
  type: FormField["type"] = "text",
  required = true
): FormField => ({
  label,
  maxLength: type === "textarea" ? 4000 : 254,
  name,
  placeholder,
  required,
  type,
});

const identityFields = [
  field("name", "Your name", "Alex Morgan"),
  field("email", "Email address", "alex@example.com", "email"),
];

const sampleIdentity = { email: "alex@example.com", name: "Alex Morgan" };

/** Three examples, with criteria shared verbatim between Jev and Luna. */
export const examples = {
  contact: {
    description: "Share your question and any useful account details.",
    destinations: [
      {
        criteria:
          "Invoice explanations, billing details, tax information, charges, or corrections, without a request to return money.",
        id: "billing_invoices",
        specialty: "Invoices",
        team: "Billing",
      },
      {
        criteria:
          "The primary requested resolution is a refund, reimbursement, or reversal of a payment. Routing does not approve a refund.",
        id: "billing_refunds",
        specialty: "Refunds",
        team: "Billing",
      },
      {
        criteria:
          "The immediate blocker is signing in, recovering an account, permissions, or access to a workspace, including access needed to reach billing.",
        id: "support_access",
        specialty: "Account access",
        team: "Support",
      },
      {
        criteria:
          "A customer needs help with a malfunction, integration error, configuration, or product usage; account recovery is not the primary issue.",
        id: "support_technical",
        specialty: "Technical help",
        team: "Support",
      },
      {
        criteria:
          "A clear informational inquiry such as availability, company information, or a general question unrelated to an account, billing, or a technical problem.",
        id: "general_inquiries",
        specialty: "Inquiries",
        team: "General",
      },
      {
        criteria:
          "An unclear or unsupported request, or multiple unrelated requests without an identifiable primary resolution.",
        id: "contact_triage",
        specialty: "Triage",
        team: "Contact",
      },
    ],
    fields: [
      ...identityFields,
      field("subject", "Subject", "How can we help?"),
      field(
        "message",
        "Your message",
        "What happened, and what would you like us to help with?",
        "textarea"
      ),
      field(
        "accountContext",
        "Account context",
        "Optional plan, workspace, or recent changes. Don’t include passwords.",
        "textarea",
        false
      ),
    ],
    id: "contact",
    instructions:
      "Choose the team that can resolve the main request. Distinguish a request to return money from a request to explain or correct an invoice. For mixed topics, select the owner of the immediate blocker or explicitly requested resolution. A billing mention alone does not make a message a billing request. Use contact_triage if no primary need can be established.",
    samples: [
      {
        label: "Clear request",
        values: {
          ...sampleIdentity,
          accountContext: "Pro plan, workspace Daybreak",
          message:
            "I paid invoice INV-204 twice by mistake. Both charges have settled. Please return the second payment to my original payment method.",
          subject: "Duplicate payment",
        },
      },
      {
        label: "Overlapping needs",
        values: {
          ...sampleIdentity,
          accountContext: "Workspace owner; recovery codes are unavailable",
          message:
            "I need invoices for our accountant, but my old phone broke and I can’t pass two-factor authentication. Please help me recover access first; the invoices themselves are correct.",
          subject: "Can’t get to my invoices",
        },
      },
      {
        label: "Limited context",
        values: {
          ...sampleIdentity,
          accountContext: "",
          message:
            "Something doesn’t look right. Can somebody contact me about it?",
          subject: "Need a hand",
        },
      },
    ],
    title: "Contact",
  },
  issues: {
    description: "Describe what happened and how to reproduce it.",
    destinations: [
      {
        criteria:
          "Visual rendering, layout, or client interaction failures, particularly when the underlying API returns correct data.",
        id: "frontend_interface",
        specialty: "Interface",
        team: "Frontend",
      },
      {
        criteria:
          "Keyboard, screen reader, focus, contrast, or other assistive-access barriers in the interface.",
        id: "frontend_accessibility",
        specialty: "Accessibility",
        team: "Frontend",
      },
      {
        criteria:
          "First-party API correctness, validation, response shape, or endpoint behavior, without evidence of a broader outage or authentication failure.",
        id: "platform_api",
        specialty: "API",
        team: "Platform",
      },
      {
        criteria:
          "Third-party connectors, webhook delivery, data synchronization, or external service interoperability.",
        id: "platform_integrations",
        specialty: "Integrations",
        team: "Platform",
      },
      {
        criteria:
          "Widespread availability, networking, latency, capacity, or deployment infrastructure failures across services or users.",
        id: "infrastructure_reliability",
        specialty: "Reliability",
        team: "Infrastructure",
      },
      {
        criteria:
          "Session, token, SSO, sign-in, or authentication infrastructure defects supported by the report.",
        id: "identity_authentication",
        specialty: "Authentication",
        team: "Identity",
      },
      {
        criteria:
          "Insufficient reproduction evidence, ambiguous ownership, or a problem outside the listed areas.",
        id: "engineering_triage",
        specialty: "Triage",
        team: "Engineering",
      },
    ],
    fields: [
      ...identityFields,
      field("title", "Issue title", "A short description of the problem"),
      field(
        "behavior",
        "Observed and expected behavior",
        "What happened? What should have happened?",
        "textarea"
      ),
      field(
        "steps",
        "Steps to reproduce",
        "Describe the sequence that leads to the issue.",
        "textarea"
      ),
      field(
        "environment",
        "Environment",
        "Browser, app version, deployment, or integration"
      ),
      field(
        "impact",
        "Impact",
        "Who is affected? Is there a workaround?",
        "textarea"
      ),
    ],
    id: "issues",
    instructions:
      "Select the most likely first engineering owner using observed behavior, reproduction evidence, environment, and impact. Prefer concrete evidence over a reporter’s speculation. Accessibility barriers belong to accessibility; invalid sessions or token validation belong to identity; successful API responses with incorrect rendering belong to frontend. Cross-service failures suggest infrastructure, while third-party synchronization points to integrations. Use engineering_triage when the available evidence cannot distinguish owners. This is an ownership suggestion, not a confirmed root cause.",
    samples: [
      {
        label: "Clear request",
        values: {
          ...sampleIdentity,
          behavior:
            "The close button can be clicked, but it is skipped by Tab and Escape does not close the dialog. Keyboard users should be able to dismiss it.",
          environment: "Chrome and Safari, production web app",
          impact:
            "Keyboard-only users cannot return to the page without reloading.",
          steps:
            "Open Team settings, choose Invite member, then try to close the dialog using only the keyboard.",
          title: "Invite dialog traps keyboard users",
        },
      },
      {
        label: "Overlapping needs",
        values: {
          ...sampleIdentity,
          behavior:
            "The UI shows no projects after a token refresh. The network log shows /projects returning 401 with invalid_token; signing out and back in restores the same projects.",
          environment: "Web app, all browsers, SSO workspace",
          impact:
            "Users lose access after refresh. Signing in again is a workaround.",
          steps:
            "Sign in, leave the app open until the session refreshes, then open Projects.",
          title: "Dashboard looks empty after session refresh",
        },
      },
      {
        label: "Limited context",
        values: {
          ...sampleIdentity,
          behavior:
            "The app seemed different yesterday. I can’t remember the exact error.",
          environment: "Browser unknown",
          impact: "One report so far; impact unclear.",
          steps: "I haven’t been able to reproduce it.",
          title: "It stopped working",
        },
      },
    ],
    title: "Issue Report",
  },
  leads: {
    description: "Tell us about your project and what you need.",
    destinations: [
      {
        criteria:
          "An early-stage team needs help getting started, choosing a basic setup, or launching its first project without a substantial technical blocker.",
        id: "startup_onboarding",
        specialty: "Onboarding",
        team: "Startup",
      },
      {
        criteria:
          "An early-stage project needs architecture guidance, feasibility review, or help with a specific technical challenge before launch.",
        id: "startup_technical",
        specialty: "Technical advisory",
        team: "Startup",
      },
      {
        criteria:
          "An established, growing customer wants to expand usage, discuss commercial plans, or support more teams without a specific integration or enterprise procurement requirement.",
        id: "growth_sales",
        specialty: "Sales",
        team: "Growth",
      },
      {
        criteria:
          "A growing customer needs to connect an existing stack, migrate a workflow, or implement a concrete integration.",
        id: "growth_integrations",
        specialty: "Integrations",
        team: "Growth",
      },
      {
        criteria:
          "A complex organization needs enterprise architecture, scale, SSO, deployment, security design, or a technical proof of concept.",
        id: "enterprise_solutions",
        specialty: "Solutions engineering",
        team: "Enterprise",
      },
      {
        criteria:
          "The immediate blocker is a purchasing process: vendor onboarding, contracts, legal terms, security questionnaires, or compliance paperwork. This can apply even to a small company.",
        id: "enterprise_procurement",
        specialty: "Procurement",
        team: "Enterprise",
      },
      {
        criteria:
          "There is too little information to choose an owner, incompatible requests lack a clear main need, or the inquiry does not fit the specialties.",
        id: "sales_triage",
        specialty: "Triage",
        team: "Sales",
      },
    ],
    fields: [
      ...identityFields,
      field("company", "Company", "Acme Studio"),
      field("companySize", "Company size", "e.g. 12 people"),
      field(
        "projectNeeds",
        "What are you building?",
        "Tell us about your goals, technical needs, and what’s getting in the way.",
        "textarea"
      ),
      field("timeline", "Timeline", "e.g. Launching in six weeks"),
    ],
    id: "leads",
    instructions:
      "Choose the best first owner for this sales inquiry. Consider the actual project, technical requirements, buying process, and timeline together. Company size alone must not determine the destination. Procurement requirements take precedence over general enterprise discovery; concrete integration work takes precedence over a general sales conversation. Use sales_triage when evidence is insufficient, contradictory, or outside the listed specialties.",
    samples: [
      {
        label: "Clear request",
        values: {
          ...sampleIdentity,
          company: "Daybreak",
          companySize: "4 people",
          projectNeeds:
            "We are launching our first customer portal. We have chosen the stack and need help setting up a project and understanding the getting-started checklist.",
          timeline: "First launch in three weeks",
        },
      },
      {
        label: "Overlapping needs",
        values: {
          ...sampleIdentity,
          company: "Northstar",
          companySize: "9 people",
          projectNeeds:
            "We are a small team supplying a national bank. Our proof of concept works, but before we can purchase, their vendor process requires a DPA, negotiated contract terms, and a completed security questionnaire.",
          timeline: "Procurement review next Friday",
        },
      },
      {
        label: "Limited context",
        values: {
          ...sampleIdentity,
          company: "New Venture",
          companySize: "Still deciding",
          projectNeeds:
            "We’re exploring a few ideas and would like to talk to someone. We don’t have requirements yet.",
          timeline: "Not sure",
        },
      },
    ],
    title: "Lead",
  },
} as const satisfies Record<ExampleId, ExampleDefinition>;

/** A registered example, preserving its destination IDs as literal types. */
export type Example = (typeof examples)[ExampleId];

/** An application-owned destination derived from the example registry. */
export type Destination = Example["destinations"][number];

/** The exact set of destination IDs supported by the router. */
export type DestinationId = Destination["id"];

/** Narrows an untrusted URL segment to a registered example. */
export const isExampleId = (value: string): value is ExampleId =>
  Object.hasOwn(examples, value);

/** Formats an application-owned team and specialty for display. */
export const destinationLabel = (destination: Destination): string =>
  `${destination.team} · ${destination.specialty}`;
