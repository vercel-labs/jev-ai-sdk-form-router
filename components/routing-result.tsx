/* Scrollable regions need keyboard focus so users can scroll their full contents. */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex */
import { ChevronDownIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { destinationLabel } from "@/lib/examples";
import type { Example } from "@/lib/examples";
import type { FallbackReason, RoutingDecision } from "@/lib/router";
import type { SubmissionResult } from "@/lib/submission";

const percent = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? "Unavailable"
    : `${(value * 100).toFixed(2)}%`;

const disclosureClass =
  "flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden";

const DisclosureLabel = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <ChevronDownIcon
      aria-hidden="true"
      className="text-muted-foreground size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform"
    />
  </>
);

const RoutingGuide = ({ example }: { example: Example }) => (
  <Popover>
    <PopoverTrigger render={<Button variant="outline" size="sm" />}>
      Routing guide
    </PopoverTrigger>
    <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
      <div className="flex flex-col gap-4 p-2.5">
        <PopoverHeader>
          <PopoverTitle>{example.title} destinations</PopoverTitle>
          <PopoverDescription>
            Ownership is inferred from the full submission.
          </PopoverDescription>
        </PopoverHeader>
        <section
          className="focus-visible:ring-ring max-h-72 [scrollbar-width:thin] overflow-y-auto overscroll-contain px-1 py-1 pr-4 outline-none focus-visible:ring-2 focus-visible:ring-inset"
          aria-label="Destination criteria"
          tabIndex={0}
        >
          <ul className="flex flex-col gap-4">
            {example.destinations.map((destination) => (
              <li key={destination.id} className="flex flex-col gap-1">
                <p className="font-medium">{destinationLabel(destination)}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {destination.criteria}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PopoverContent>
  </Popover>
);

const DecisionDetails = ({
  decision,
  example,
}: {
  decision: RoutingDecision;
  example: Example;
}) => {
  const probabilities = decision.jev?.probabilities;
  const distribution = probabilities
    ? example.destinations.toSorted(
        (a, b) => probabilities[b.id] - probabilities[a.id]
      )
    : [];
  return (
    <details className="group border-t">
      <summary className={disclosureClass}>
        <DisclosureLabel>Decision details</DisclosureLabel>
      </summary>
      <div className="flex flex-col gap-5 pb-5">
        {distribution.length > 0 && (
          <table className="w-full text-sm">
            <caption className="text-muted-foreground pb-3 text-left">
              Jev’s destination probabilities
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Destination</th>
                <th scope="col">Probability</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((destination) => (
                <tr key={destination.id}>
                  <th
                    scope="row"
                    className="py-2 pr-4 text-left align-baseline font-normal"
                  >
                    {destinationLabel(destination)}
                  </th>
                  <td className="py-2 text-right align-baseline font-mono whitespace-nowrap tabular-nums">
                    {percent(probabilities?.[destination.id])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-muted-foreground text-sm leading-relaxed">
          Confidence measures how concentrated Jev’s distribution is. The choice
          probability belongs to Jev’s original selection, even when Luna makes
          the final decision.
        </p>
        <p className="text-muted-foreground text-sm">
          Jev: {decision.timings.jevMs} ms
          {decision.timings.lunaMs !== null &&
            ` · Luna: ${decision.timings.lunaMs} ms`}
        </p>
        <details>
          <summary className="text-muted-foreground cursor-pointer text-sm outline-none focus-visible:underline">
            Raw result
          </summary>
          <pre className="mt-3 overflow-x-auto text-xs leading-relaxed">
            {JSON.stringify(decision, null, 2)}
          </pre>
        </details>
      </div>
    </details>
  );
};

const EmailPreview = ({
  result,
}: {
  result: Extract<SubmissionResult, { status: "success" }>;
}) => (
  <details className="group border-t">
    <summary className={disclosureClass}>
      <DisclosureLabel>Email preview</DisclosureLabel>
    </summary>
    <div className="flex flex-col gap-4 pb-5">
      <dl className="flex flex-col gap-1 text-sm">
        <dt className="text-muted-foreground">Subject</dt>
        <dd>{result.email.subject}</dd>
      </dl>
      <iframe
        title="Notification email preview"
        srcDoc={result.email.html}
        sandbox=""
        referrerPolicy="no-referrer"
        className="h-80 w-full border"
        loading="lazy"
      />
      {result.delivery.status === "accepted" && (
        <p className="text-muted-foreground text-sm">
          Accepted by Resend. Inbox delivery is not yet confirmed.
        </p>
      )}
    </div>
  </details>
);

const DecisionMetric = ({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) => (
  <div className="row-span-2 grid grid-rows-subgrid">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd>
      {value === null || value === undefined ? (
        <span className="text-muted-foreground text-sm">Unavailable</span>
      ) : (
        <span className="font-mono text-xl tabular-nums sm:text-2xl">
          {percent(value)}
        </span>
      )}
    </dd>
  </div>
);

const ResultContent = ({
  example,
  result,
  pending,
}: {
  example: Example;
  result: SubmissionResult | null;
  pending: boolean;
}) => {
  if (result?.status === "success") {
    const fallbackLabels: Record<FallbackReason, string> = {
      "jev-error": "Jev’s evaluation could not be completed.",
      "low-confidence": `Jev’s confidence was below ${percent(result.decision.threshold)}.`,
      "missing-confidence": "Jev’s confidence was unavailable.",
    };
    return (
      <>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-3xl font-medium tracking-tight">
              {result.decision.destination.team}
            </h3>
            <p className="text-base">{result.decision.destination.specialty}</p>
            <p className="text-muted-foreground text-sm">
              Selected by{" "}
              {result.decision.model === "typesafe-ai/jev" ? "Jev" : "Luna"}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <DecisionMetric
              label="Jev confidence"
              value={result.decision.jev?.confidence}
            />
            <DecisionMetric
              label="Jev choice probability"
              value={result.decision.jev?.selectedProbability}
            />
          </dl>
          {result.decision.fallbackReason && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {fallbackLabels[result.decision.fallbackReason]} Luna
              independently reviewed the request and supplied the final
              decision.
            </p>
          )}
          {result.delivery.status === "failed" && (
            <Alert variant="destructive">
              <AlertTitle>Email not confirmed</AlertTitle>
              <AlertDescription>{result.delivery.message}</AlertDescription>
            </Alert>
          )}
          {result.delivery.status === "accepted" && (
            <p className="text-muted-foreground text-sm">
              Email accepted by Resend.
            </p>
          )}
        </div>
        <div>
          <DecisionDetails decision={result.decision} example={example} />
          <EmailPreview result={result} />
        </div>
      </>
    );
  }
  if (result?.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to route submission</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyTitle>
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Routing submission…
            </span>
          ) : (
            "No submission yet"
          )}
        </EmptyTitle>
        <EmptyDescription>
          {pending
            ? "Your request is being evaluated."
            : "Complete the form or load a sample to see its destination."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
};

/** Reserves a stable result area while keeping reference material out of the main reading path. */
export const RoutingResult = ({
  example,
  result,
  pending,
}: {
  example: Example;
  result: SubmissionResult | null;
  pending: boolean;
}) => (
  <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
    <CardHeader divided>
      <CardTitle>
        <h2 id="result-heading">Routing result</h2>
      </CardTitle>
      <CardDescription>Destination and model evaluation.</CardDescription>
      <CardAction>
        <RoutingGuide example={example} />
      </CardAction>
    </CardHeader>
    <CardContent>
      <section
        className="focus-visible:ring-ring h-[28rem] [scrollbar-width:thin] [scrollbar-gutter:stable] overflow-y-auto overscroll-contain pr-4 outline-none focus-visible:ring-2 focus-visible:ring-inset"
        aria-busy={pending}
        aria-label="Routing decision"
        tabIndex={0}
      >
        <div className="flex min-h-full flex-col gap-8 px-1 py-1">
          <ResultContent example={example} result={result} pending={pending} />
        </div>
      </section>
    </CardContent>
  </Card>
);
