import { describe, it, expect } from "vitest";
import {
  normalizeCategory,
  extractedCandidateSchema,
} from "@/lib/validation";

describe("normalizeCategory", () => {
  it("matches a known category case-insensitively", () => {
    expect(normalizeCategory("Groceries")).toEqual({
      category: "groceries",
      wasNormalized: false,
    });
  });

  it("falls back to other for unknown categories", () => {
    expect(normalizeCategory("pets")).toEqual({
      category: "other",
      wasNormalized: true,
    });
  });
});

describe("extractedCandidateSchema", () => {
  it("accepts a valid candidate", () => {
    const result = extractedCandidateSchema.safeParse({
      amount: 180,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative amount", () => {
    const result = extractedCandidateSchema.safeParse({
      amount: -5,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });
});
