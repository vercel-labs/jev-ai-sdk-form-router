import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

import type { RoutingDecision } from "@/lib/router";

/** Data shared by the browser preview and the actual notification email. */
export interface RoutedEmailProps {
  example: string;
  /** Display label of the final owner, which may differ from Jev's original choice. */
  destination: string;
  /** Model that selected the final owner, not necessarily the source of the statistics. */
  model: RoutingDecision["model"];
  /** Jev's confidence from 0 to 1, or null when unavailable, regardless of the deciding model. */
  confidence: number | null;
  /** Probability of Jev's original choice from 0 to 1, or null when unavailable. Not confidence. */
  selectedProbability: number | null;
  fields: { label: string; value: string }[];
}

const previewFields = [
  { label: "Your name", value: "Alex Morgan" },
  { label: "Email address", value: "alex@example.com" },
  {
    label: "Project needs",
    value:
      "We’re preparing to launch our first project and would like help getting started.",
  },
];

const RoutingDetail = ({ label, value }: { label: string; value: string }) => (
  <Row>
    <Column
      style={{
        color: "#525252",
        fontSize: "13px",
        lineHeight: "20px",
        padding: "6px 12px 6px 0",
        verticalAlign: "top",
        width: "65%",
      }}
    >
      {label}
    </Column>
    <Column
      align="right"
      style={{
        color: "#171717",
        fontSize: "13px",
        fontWeight: 500,
        lineHeight: "20px",
        padding: "6px 0",
        verticalAlign: "top",
        width: "35%",
      }}
    >
      {value}
    </Column>
  </Row>
);

/**
 * Renders escaped submission content with email-safe tables and inline styles.
 * @remarks The receiving team and submission lead; model statistics remain secondary.
 */
const RoutedSubmissionEmail = ({
  example = "Lead",
  destination = "Startup · Onboarding",
  model = "typesafe-ai/jev",
  confidence = 0.97,
  selectedProbability = 0.99,
  fields = previewFields,
}: RoutedEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>{`New ${example.toLowerCase()} submission assigned to ${destination}`}</Preview>
    <Body
      style={{
        backgroundColor: "#fafafa",
        color: "#171717",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        margin: 0,
        padding: "24px 12px",
      }}
    >
      <Container
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e5e5",
          borderRadius: "8px",
          margin: "0 auto",
          maxWidth: "560px",
          padding: "24px",
          width: "100%",
        }}
      >
        <Heading
          as="h1"
          style={{
            fontSize: "24px",
            fontWeight: 600,
            lineHeight: "32px",
            margin: "0 0 8px",
          }}
        >
          New {example.toLowerCase()} submission
        </Heading>
        <Text
          style={{
            color: "#525252",
            fontSize: "14px",
            lineHeight: "22px",
            margin: 0,
          }}
        >
          {destination}
        </Text>
        <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
        <Heading
          as="h2"
          style={{
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: "24px",
            margin: "0 0 20px",
          }}
        >
          Submission
        </Heading>
        {fields.map((field) => (
          <Section key={field.label}>
            <Text
              style={{
                color: "#525252",
                fontSize: "13px",
                lineHeight: "20px",
                margin: "0 0 4px",
              }}
            >
              {field.label}
            </Text>
            <Text
              style={{
                fontSize: "14px",
                lineHeight: "22px",
                margin: "0 0 20px",
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {field.value || "Not supplied"}
            </Text>
          </Section>
        ))}
        <Section
          style={{
            backgroundColor: "#fafafa",
            borderRadius: "6px",
            padding: "16px",
          }}
        >
          <Heading
            as="h2"
            style={{
              fontSize: "14px",
              fontWeight: 600,
              lineHeight: "22px",
              margin: "0 0 8px",
            }}
          >
            Routing details
          </Heading>
          <RoutingDetail
            label="Selected by"
            value={model === "typesafe-ai/jev" ? "Jev" : "Luna"}
          />
          {confidence !== null && (
            <RoutingDetail
              label="Jev confidence"
              value={`${(confidence * 100).toFixed(2)}%`}
            />
          )}
          {selectedProbability !== null && (
            <RoutingDetail
              label="Jev choice probability"
              value={`${(selectedProbability * 100).toFixed(2)}%`}
            />
          )}
          {(confidence !== null || selectedProbability !== null) && (
            <Text
              style={{
                color: "#525252",
                fontSize: "12px",
                lineHeight: "18px",
                margin: "12px 0 0",
              }}
            >
              These statistics describe Jev’s evaluation, including when Luna
              makes the final decision.
            </Text>
          )}
        </Section>
      </Container>
    </Body>
  </Html>
);

export default RoutedSubmissionEmail;
