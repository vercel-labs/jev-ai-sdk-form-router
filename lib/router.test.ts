import {
  Experimental_EvaluationMockModelV4,
  MockLanguageModelV4,
} from "ai/test";
import { describe, expect, it, vi } from "vitest";

import { examples } from "./examples";
import { routeSubmission, submissionSchema } from "./router";

vi.mock("server-only", () => ({}));

const example = examples.contact;
const submission = example.samples[0].values;

const mockJev = (
  confidence: number | string | null | undefined,
  probability = 0.99
) => {
  const probabilities = Object.fromEntries(
    example.destinations.map((destination) => [destination.id, 0])
  );
  probabilities.billing_refunds = probability;
  probabilities.billing_invoices = 1 - probability;
  const model = new Experimental_EvaluationMockModelV4({
    doEvaluate: () =>
      Promise.resolve({
        answers: {
          destination: {
            choice: "billing_refunds",
            probabilities,
            type: "choice",
          },
        },
        providerMetadata: {
          typesafe: {
            confidence:
              confidence === undefined ? {} : { destination: confidence },
          },
        },
        warnings: [],
      }),
  });
  return { model };
};

const mockLuna = (destination = "support_access") =>
  new MockLanguageModelV4({
    doGenerate: {
      content: [{ text: JSON.stringify({ destination }), type: "text" }],
      finishReason: { raw: undefined, unified: "stop" },
      usage: {
        inputTokens: {
          cacheRead: undefined,
          cacheWrite: undefined,
          noCache: 10,
          total: 10,
        },
        outputTokens: { reasoning: undefined, text: 5, total: 5 },
      },
      warnings: [],
    },
  });

describe("routing policy", () => {
  it.each([0.95, 0.98, 1])(
    "accepts Jev at confidence %s without calling Luna",
    async (confidence) => {
      const luna = mockLuna();
      const result = await routeSubmission(example, submission, {
        jev: mockJev(confidence).model,
        luna,
      });
      expect(result.model).toBe("typesafe-ai/jev");
      expect(result.destination.id).toBe("billing_refunds");
      expect(result.fallbackReason).toBeNull();
      expect(luna.doGenerateCalls).toHaveLength(0);
    }
  );

  it.each([0, 0.94, 0.94999])(
    "uses Luna below the raw confidence threshold: %s",
    async (confidence) => {
      const result = await routeSubmission(example, submission, {
        jev: mockJev(confidence, 0.999).model,
        luna: mockLuna(),
      });
      expect(result.destination.id).toBe("support_access");
      expect(result.model).toBe("openai/gpt-6-luna-fast");
      expect(result.fallbackReason).toBe("low-confidence");
      expect(result.jev?.destination).toBe("billing_refunds");
    }
  );

  it("does not substitute selected probability for confidence", async () => {
    const result = await routeSubmission(example, submission, {
      jev: mockJev(0.96, 0.7).model,
      luna: mockLuna(),
    });
    expect(result.model).toBe("typesafe-ai/jev");
    expect(result.jev?.selectedProbability).toBe(0.7);
  });

  it.each([undefined, null, "0.99", -1, 1.1, Number.NaN])(
    "uses Luna when confidence is missing or invalid: %s",
    async (confidence) => {
      const result = await routeSubmission(example, submission, {
        jev: mockJev(confidence).model,
        luna: mockLuna(),
      });
      expect(result.fallbackReason).toBe("missing-confidence");
      expect(result.jev?.confidence).toBeNull();
    }
  );

  it("records Luna as the deciding model even when it agrees", async () => {
    const result = await routeSubmission(example, submission, {
      jev: mockJev(0.8).model,
      luna: mockLuna("billing_refunds"),
    });
    expect(result.destination.id).toBe("billing_refunds");
    expect(result.model).toBe("openai/gpt-6-luna-fast");
  });

  it("uses Luna after a Jev failure", async () => {
    const jev = new Experimental_EvaluationMockModelV4({
      doEvaluate: () => {
        throw new Error("Unavailable");
      },
    });
    const result = await routeSubmission(example, submission, {
      jev,
      luna: mockLuna(),
    });
    expect(result.fallbackReason).toBe("jev-error");
    expect(result.jev).toBeNull();
  });

  it("rejects unregistered Luna destinations", async () => {
    await expect(
      routeSubmission(example, submission, {
        jev: mockJev(0.1).model,
        luna: mockLuna("external-inbox"),
      })
    ).rejects.toThrow();
  });

  it("fails when both providers fail", async () => {
    const jev = new Experimental_EvaluationMockModelV4({
      doEvaluate: () => {
        throw new Error("Jev unavailable");
      },
    });
    const luna = new MockLanguageModelV4({
      doGenerate: () => {
        throw new Error("Luna unavailable");
      },
    });
    await expect(
      routeSubmission(example, submission, { jev, luna })
    ).rejects.toThrow("Luna unavailable");
  });

  it("passes identical state and criteria to the independent review without Jev’s answer", async () => {
    const original = mockJev(0.8).model;
    const evaluateCall = vi.fn(original.doEvaluate);
    const jev = new Experimental_EvaluationMockModelV4({
      doEvaluate: evaluateCall,
    });
    const luna = mockLuna("contact_triage");
    const result = await routeSubmission(example, submission, { jev, luna });
    const [[evaluation]] = evaluateCall.mock.calls;
    const prompt = JSON.stringify(luna.doGenerateCalls[0].prompt);
    expect(prompt).toContain(
      JSON.stringify(
        JSON.stringify({
          questions: evaluation.questions,
          state: evaluation.state,
        })
      ).slice(1, -1)
    );
    expect(prompt).not.toContain("probabilities");
    expect(prompt).not.toContain("confidence");
    expect(result.destination.id).toBe("contact_triage");
  });
});

describe("registered form validation", () => {
  it.each(Object.values(examples))(
    "accepts every sample in $title",
    (entry) => {
      for (const sample of entry.samples) {
        expect(submissionSchema(entry).safeParse(sample.values).success).toBe(
          true
        );
      }
      expect(
        new Set(entry.destinations.map((destination) => destination.id)).size
      ).toBe(entry.destinations.length);
    }
  );

  it("rejects blank, oversized, and invalid email values", () => {
    expect(
      submissionSchema(example).safeParse({
        ...submission,
        email: "invalid",
        message: " ",
        subject: "x".repeat(255),
      }).success
    ).toBe(false);
  });

  it("trims fields and drops client-supplied recipients or destinations", () => {
    const result = submissionSchema(example).parse({
      ...submission,
      destination: "billing_refunds",
      name: "  Alex  ",
      to: "attacker@example.com",
    });
    expect(result.name).toBe("Alex");
    expect(result).not.toHaveProperty("to");
    expect(result).not.toHaveProperty("destination");
  });
});
