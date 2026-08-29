import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(
  process.env.ANTHROPIC_WORKSPACE_ID
    ? { defaultHeaders: { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } }
    : undefined
);

export type RawExtractedCandidate = {
  amount: number;
  currency: string;
  description: string;
  category: string;
  dateExpression: string;
  confidence: number;
};

const EXTRACT_EXPENSE_TOOL = {
  name: "extract_expense",
  description:
    "Extract structured expense data from natural language text describing a purchase.",
  input_schema: {
    type: "object" as const,
    properties: {
      amount: {
        type: "number",
        description: "The numeric amount spent, always positive",
      },
      currency: {
        type: "string",
        description:
          "ISO currency code, e.g. MXN, USD. Default to MXN if the user did not specify a currency.",
      },
      description: {
        type: "string",
        description: "The merchant, item, or purpose of the expense",
      },
      category: {
        type: "string",
        description:
          "Best-guess category: food, groceries, transportation, shopping, housing, bills, health, entertainment, travel, education, personal, subscriptions, or other",
      },
      dateExpression: {
        type: "string",
        description:
          'The date exactly as the user expressed it (e.g. "ayer", "yesterday", "last friday"). Use "hoy" if no date was mentioned.',
      },
      confidence: {
        type: "number",
        description: "Confidence from 0 to 1 that every field above is correct",
      },
    },
    required: [
      "amount",
      "currency",
      "description",
      "category",
      "dateExpression",
      "confidence",
    ],
  },
};

export async function extractExpenseFromText(
  rawInput: string
): Promise<RawExtractedCandidate> {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [EXTRACT_EXPENSE_TOOL],
    tool_choice: { type: "tool", name: "extract_expense" },
    messages: [{ role: "user", content: rawInput }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return a tool_use block");
  }
  return toolUse.input as RawExtractedCandidate;
}
