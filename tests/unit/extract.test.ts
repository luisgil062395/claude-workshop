import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: "tool_use",
                name: "extract_expense",
                input: {
                  amount: 180,
                  currency: "MXN",
                  description: "Costco",
                  category: "groceries",
                  dateExpression: "ayer",
                  confidence: 0.92,
                },
              },
            ],
          }),
        },
      };
    }),
  };
});

import { extractExpenseFromText } from "@/lib/ai/extract";

describe("extractExpenseFromText", () => {
  it("returns the tool_use input from Claude", async () => {
    const result = await extractExpenseFromText("Ayer gasté 180 pesos en Costco");
    expect(result).toEqual({
      amount: 180,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.92,
    });
  });
});
