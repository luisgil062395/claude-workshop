import { z } from "zod";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/categories";

export const extractedCandidateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1).max(6),
  description: z.string().min(1),
  category: z.string().min(1),
  dateExpression: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type ExtractedCandidate = z.infer<typeof extractedCandidateSchema>;

export function normalizeCategory(rawCategory: string): {
  category: ExpenseCategory;
  wasNormalized: boolean;
} {
  const match = EXPENSE_CATEGORIES.find(
    (c) => c === rawCategory.trim().toLowerCase()
  );
  if (match) return { category: match, wasNormalized: false };
  return { category: "other", wasNormalized: true };
}
