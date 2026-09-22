# Agent instructions

This is a Next.js 16 / React 19 template for routing three forms with Jev and AI SDK, with an independent fallback model and optional Resend delivery. Use [ARCHITECTURE.md](ARCHITECTURE.md) for the module map, data flow, and runtime boundaries. Use [README.md](README.md) for local setup and service configuration.

## Setup and commands

Use Node.js 22+ and pnpm from the repository root. Preserve `pnpm-lock.yaml` and use the installed tool versions through package scripts.

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the Next.js development server |
| `pnpm fix` | Apply Ultracite formatting and lint fixes |
| `pnpm check` | Check formatting and lint rules |
| `pnpm typecheck` | Check TypeScript |
| `pnpm knip` | Find unused code and dependencies |
| `pnpm test` | Run all Vitest tests without external calls |
| `pnpm exec vitest run lib/router.test.ts` | Run focused routing tests |
| `pnpm validate` | Run check, typecheck, Knip, and tests |
| `pnpm build` | Build the production application |

Forms and samples can be inspected without credentials. Live routing requires Gateway access, and email delivery needs separate configuration. Unit tests supply their own mocks and environment values. Do not use real credentials or send real emails in automated tests.

## Where to make changes

- Keep fields, sample inputs, destination labels, and ownership criteria in `lib/examples.ts`. Derive validation and model choices from these definitions.
- Keep routing policy in `lib/router.ts` and workflow orchestration in `lib/submission.ts`. Keep `app/actions.ts` thin.
- Use `app/[example]/page.tsx`, `components/router-form.tsx`, and `components/routing-result.tsx` for all three examples. Avoid separate copies per form.
- Configure recipient addresses only in `lib/recipients.ts`. Its keys derive from registered destination IDs. Use `null` for unconfigured destinations.
- Use `emails/routed-submission.tsx` for both previews and delivery. Its inline styles are intentional for email compatibility.
- When adding an example, update the example-ID type, registry, server ID validation, and navigation. When adding a destination, update the recipient map and relevant tests.

## Routing and delivery invariants

- Infer ownership from the complete submission. Do not replace this with a user-selected team or a deterministic company-size rule.
- Accept Jev only when its registered answer has valid, unrounded confidence at least `0.95` from `providerMetadata.typesafe.confidence.destination`. Never substitute selected-option probability for confidence.
- Low, missing, or invalid confidence, or a Jev failure, invokes `openai/gpt-6-luna-fast`. Pass the same state and criteria without Jev's answer. The fallback destination is final, including disagreements. Do not invent a comparable fallback confidence or add another review loop.
- Validate model destinations against the current example. Keep provider timeouts and retries bounded. If routing fails, send no email.
- Keep Jev statistics attached to its original answer when displaying a fallback decision. Samples populate inputs and must not supply prerecorded results.
- Email delivery requires explicit opt-in and valid configuration for every destination on that form. Resolve the recipient from the server map and use only the validated submitter email as `replyTo`.
- Preserve successful routing when email delivery fails. Report Resend acceptance separately from inbox delivery. Retry a send with the same payload and idempotency key. A new manual submission is a new operation.

## Code standards

Ultracite configures Oxlint and Oxfmt in `oxlint.config.ts` and `oxfmt.config.ts`. Follow those rules instead of introducing another formatter or lint system. Keep the experimental `ai` version pinned and verify behavior when changing it.

- Write strict TypeScript. Prefer `unknown` over `any`, type narrowing over assertions, and `as const` or `satisfies` for registries and configuration. Use discriminated unions for outcomes.
- Keep functions focused, use descriptive names and early returns, and await promises. Catch errors where they can become a meaningful application result.
- Keep shared logic DRY without creating unnecessary files or abstractions. Use explicit imports and avoid re-export barrels.
- Add TSDoc to exported contracts and non-obvious helpers, with applicable `@param`, `@returns`, `@remarks`, and `@throws` tags.
- Use Server Components by default and client components for interactive state. Keep `server-only` protection on provider, delivery, and recipient modules. Client components may use type-only imports from server modules.
- Use function components, stable keys, complete hook dependencies, and React 19 ref props. Avoid defining components inside other components. Use App Router metadata and Next.js image components where applicable.
- Prefer existing shadcn/Base UI components and theme tokens. Read the project's shadcn skill when changing those components. Keep the neutral palette and Geist typography consistent.

## Accessibility and interaction

- Use semantic controls, associated labels, visible keyboard focus, appropriate button types, and pointer cursors for enabled buttons. Hide decorative icons from assistive technology.
- Connect validation messages with `aria-describedby` and mark invalid inputs. Keep navigation state, pending state, and result announcements accessible.
- Preserve inputs on failure. Clear stale results after edits, sample changes, reset, or email-option changes. Prevent duplicate submissions while pending.
- Check all three routes at mobile and desktop widths after layout changes. Keep forms at their natural height and leave padding between scrollable content and scrollbars. Check keyboard access to disclosures, popovers, and scroll regions.
- Preserve the sandboxed email iframe. Render submitted text through React Email rather than interpolating it into raw HTML.

## Security and scope

- Treat form fields and model output as untrusted. Validate on the server before provider calls, and never accept client-supplied recipients or routing destinations.
- Keep API keys in server environment variables. Never print credentials, commit `.env.local`, or expose private provider errors to the browser. Maintain placeholder names in `.env.example` when configuration changes.
- Use `rel="noopener noreferrer"` for links opening new tabs. Avoid `eval`, direct cookie assignments, and unsafe HTML insertion.
- The template has no database, user authentication, submission history, or application rate limiter. Do not introduce these systems or deployment changes without task scope that calls for them.

## Verification and handoff

- For routing or workflow changes, add focused tests to `lib/router.test.ts` or `lib/submission.test.ts`. Use AI SDK mocks or injected dependencies for routing and mock Resend for delivery. Exercise real application logic rather than mocking the module under test.
- Cover changed confidence boundaries, invalid metadata or output, independent fallback decisions, validation, recipient selection, and retry behavior. Keep tests deterministic, with assertions inside tests and no committed `.only` or `.skip`.
- For code changes, run `pnpm fix`, inspect the diff, then `pnpm validate` and `pnpm build`. Report any check that could not run or failed. Browser checks are manual, and live model checks require available credentials.
- For documentation-only changes, check the touched Markdown with `pnpm exec oxfmt <files> --check` and run `git diff --check`. Verify commands and links without running account provisioning or email sends.
- Keep README setup instructions and the architecture overview aligned with code changes. Prefer official Vercel, AI SDK, TypeSafe, and Resend documentation for integration details.
- Preserve unrelated user edits. Summarize what changed, the checks performed, and material limitations. Keep commit and pull request descriptions focused on the resulting behavior.
