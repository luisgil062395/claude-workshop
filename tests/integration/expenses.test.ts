import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/ai/extract", () => ({
  extractExpenseFromText: vi.fn(),
}));

import { extractExpenseFromText } from "@/lib/ai/extract";
import {
  extractExpense,
  saveExpense,
  listExpenses,
  updateExpense,
  deleteExpense,
} from "@/lib/expenses";

beforeEach(async () => {
  await prisma.expense.deleteMany();
});

afterEach(async () => {
  await prisma.expense.deleteMany();
});

describe("extractExpense", () => {
  it("resolves a valid candidate with no uncertain fields", async () => {
    vi.mocked(extractExpenseFromText).mockResolvedValue({
      amount: 180,
      currency: "mxn",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.95,
    });

    const result = await extractExpense(
      "Ayer gasté 180 en Costco",
      "2026-08-28T10:00:00"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate).toMatchObject({
        amount: 180,
        currency: "MXN",
        description: "Costco",
        category: "groceries",
        date: "2026-08-27",
      });
      expect(result.candidate.uncertainFields).toEqual([]);
    }
  });

  it("flags an unknown category as uncertain and falls back to other", async () => {
    vi.mocked(extractExpenseFromText).mockResolvedValue({
      amount: 50,
      currency: "MXN",
      description: "Vet visit",
      category: "pets",
      dateExpression: "hoy",
      confidence: 0.9,
    });

    const result = await extractExpense(
      "Gasté 50 en el veterinario",
      "2026-08-28T10:00:00"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.category).toBe("other");
      expect(result.candidate.uncertainFields).toContain("category");
    }
  });

  it("returns a friendly error when extraction throws", async () => {
    vi.mocked(extractExpenseFromText).mockRejectedValue(new Error("API down"));

    const result = await extractExpense("algo", "2026-08-28T10:00:00");
    expect(result.ok).toBe(false);
  });
});

describe("saveExpense", () => {
  it("persists a valid candidate and it is retrievable", async () => {
    const result = await saveExpense({
      amount: 180,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      date: "2026-08-27",
      rawInput: "Ayer gasté 180 en Costco",
      inputMethod: "text",
      confidence: 0.95,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const saved = await prisma.expense.findUnique({ where: { id: result.id } });
      expect(saved?.amount).toBe(180);
    }
  });
});

describe("listExpenses / updateExpense / deleteExpense", () => {
  beforeEach(async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 100, description: "Costco", category: "groceries", date: "2026-08-20", inputMethod: "text" },
        { amount: 50, description: "Cine", category: "entertainment", date: "2026-08-22", inputMethod: "text" },
      ],
    });
  });

  it("filters by search text", async () => {
    const result = await listExpenses({ search: "Costco" });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Costco");
  });

  it("filters by category", async () => {
    const result = await listExpenses({ category: "entertainment" });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Cine");
  });

  it("returns all expenses with no filters, sorted by date desc by default", async () => {
    const result = await listExpenses();
    expect(result.map((e) => e.description)).toEqual(["Cine", "Costco"]);
  });

  it("updates an existing expense", async () => {
    const [existing] = await listExpenses({ search: "Costco" });
    const result = await updateExpense(existing.id, {
      amount: 120,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      date: "2026-08-20",
      inputMethod: "text",
      confidence: 1,
    });
    expect(result.ok).toBe(true);
    const updated = await prisma.expense.findUnique({ where: { id: existing.id } });
    expect(updated?.amount).toBe(120);
  });

  it("removes an existing expense", async () => {
    const [existing] = await listExpenses({ search: "Cine" });
    const result = await deleteExpense(existing.id);
    expect(result.ok).toBe(true);
    const remaining = await listExpenses();
    expect(remaining).toHaveLength(1);
  });
});
