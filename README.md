# Jev x AI SDK Form Router

Three forms use [Jev](https://vercel.com/i/what-is-jev) to route submissions by context, with `openai/gpt-6-luna-fast` handling uncertain or failed evaluations. Includes editable samples, routing details, and optional email delivery.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fjev-ai-sdk-form-router)

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Next.js 16 and React 19 | App Router, shared form UI, and Server Actions |
| AI SDK 7 and Vercel AI Gateway | Typed model calls and provider access |
| shadcn/ui, Base UI, and Tailwind CSS 4 | Components and styling |
| React Email and Resend | Email previews and optional delivery |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm package manager

### 1. Clone and install

```sh
git clone https://github.com/vercel-labs/jev-ai-sdk-form-router.git
cd jev-ai-sdk-form-router
pnpm install
```

### 2. Configure AI Gateway

Routing a submission, including a sample, makes live model calls and requires AI Gateway access to both `typesafe-ai/jev` and `openai/gpt-6-luna-fast`. Choose one of the authentication options below, or skip this step to explore the forms and load sample inputs without generating routing results.

**API Key**

Copy the environment example:

```sh
cp .env.example .env.local
```

Create a [Vercel AI Gateway key](https://vercel.com/d?to=%2F%5Bteam%5D%2F~%2Fai-gateway%2Fapi-keys) and set `AI_GATEWAY_API_KEY` in `.env.local`.

**Vercel OIDC**

Vercel deployments use automatic OIDC authentication through the SDK, without an API key. To use OIDC locally, install the Vercel CLI if needed, then link the project and pull its environment variables:

```sh
npm install --global vercel
vercel link
vercel env pull .env.local
```

### 3. Start the app

```sh
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The home page redirects to `/leads`.

| Example | Route | Routes to |
| --- | --- | --- |
| Lead | `/leads` | Startup, growth, enterprise, or sales teams |
| Contact | `/contact` | Billing, support, or general inquiries |
| Issue Report | `/issues` | Frontend, platform, infrastructure, identity, or engineering teams |

## How Routing Works

1. Zod validates the submission against the fields in [lib/examples.ts](lib/examples.ts).
2. Jev evaluates the complete submission using AI SDK’s `experimental_evaluate` and selects an allowed team/specialty combination.
3. The app accepts Jev’s choice when its confidence is **at least 95%**.
4. If confidence is lower, missing, or invalid, or Jev fails, `openai/gpt-6-luna-fast` independently evaluates the same submission and criteria using `generateText` and `Output.object`. Its choice becomes final.
5. The result includes the destination, deciding model, Jev statistics, model timings, and an email preview.

**Confidence and selected-option probability are separate metrics.** The threshold uses the unrounded value of `providerMetadata.typesafe.confidence.destination`. Jev’s displayed statistics remain attached to its original evaluation when the fallback model makes the final decision.

Provider calls have bounded timeouts and one transient retry. If both models fail, the app returns a retryable error and sends no email.

<details>
<summary>Optional email delivery</summary>

**Set up Resend through Vercel Marketplace**

The [Resend Marketplace integration](https://resend.com/docs/guides/vercel-marketplace-integration) creates a Resend account and connects it to your Vercel project. During setup, you can select an existing Vercel domain or purchase one.

1. If you haven't already, install the Vercel CLI and link the project:

   ```sh
   npm install --global vercel
   vercel link
   ```

2. Start the integration setup:

   ```sh
   vercel i resend
   ```

3. Select an existing domain or purchase one through Vercel, then choose a plan and connect your project. Complete onboarding in Resend, choose **Auto configure** to add the DNS records, and wait for domain verification.
4. Pull the integration's environment variables for local development:

   ```sh
   vercel env pull .env.local
   ```

5. Confirm `RESEND_API_KEY` is present and set `RESEND_FROM` in `.env.local` to a sender address on your verified domain.

If you already have a Resend account, you can instead set `RESEND_API_KEY` and `RESEND_FROM` directly using your existing API key and a [verified domain](https://resend.com/docs/dashboard/domains/introduction).

**Configure receiving inboxes**

In [lib/recipients.ts](lib/recipients.ts), replace `null` with a valid inbox for every destination on the form you want to enable. Multiple destinations can share an inbox.

An unchecked **Email the receiving team** checkbox appears on configured forms.

Recipient keys are derived from the destination registry and checked by TypeScript. Addresses stay server-side. The validated submitter email becomes `replyTo`. Forms with unconfigured inboxes continue to provide previews.

Email failures preserve the routing result. Resend acceptance does not confirm inbox delivery. If a connection drops after an opted-in submission, check Resend before resubmitting.

</details>

## Customization

| File | What to change |
| --- | --- |
| [lib/examples.ts](lib/examples.ts) | Form fields, samples, destinations, and routing criteria |
| [lib/router.ts](lib/router.ts) | Models, confidence threshold, timeouts, and fallback policy |
| [lib/recipients.ts](lib/recipients.ts) | Receiving inboxes |
| [lib/submission.ts](lib/submission.ts) | Validation, email rendering, and delivery workflow |
| [components/router-form.tsx](components/router-form.tsx) and [components/routing-result.tsx](components/routing-result.tsx) | Shared form and result UI |
| [emails/routed-submission.tsx](emails/routed-submission.tsx) | Email design |

Keep the experimental AI SDK version pinned and rerun the checks when upgrading it.

## Checks

```sh
pnpm fix       # Format and apply lint fixes
pnpm validate  # Lint, type check, Knip, and tests
pnpm build     # Production build
```

Tests mock the model providers and Resend. They make no external calls. Coverage includes confidence thresholds, fallback decisions, validation, recipient configuration, and delivery retries.

## Resources

- [Jev documentation](https://docs.typesafe.ai/introduction)
- [Jev and AI SDK guide](https://vercel.com/kb/guide/typesafe-jev-and-ai-sdk)
- [AI SDK evaluation](https://ai-sdk.dev/docs/ai-sdk-core/evaluation)
- [React Email](https://react.email/docs/introduction)
