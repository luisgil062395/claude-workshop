import { z } from "zod";
import { extractExpenseFromText } from "@/lib/ai/extract";
import { extractedCandidateSchema, normalizeCategory } from "@/lib/validation";
import { resolveDateExpression } from "@/lib/dates";
import { prisma } from "@/lib/db";

export type ExpenseCandidate = {
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  rawInput?: string;
  inputMethod: "voice" | "text" | "receipt";
  confidence: number;
  uncertainFields: string[];
};

export type ExtractResult =
  | { ok: true; candidate: ExpenseCandidate }
  | { ok: false; error: string };

const GENERIC_EXTRACTION_ERROR =
  "No pude entender ese gasto claramente. ¿Puedes reformularlo o ingresar el monto manualmente?";

export async function extractExpense(
  rawInput: string,
  referenceDateISO: string
): Promise<ExtractResult> {
  try {
    const raw = await extractExpenseFromText(rawInput);
    const parsed = extractedCandidateSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: GENERIC_EXTRACTION_ERROR };
    }

    const uncertainFields: string[] = [];

    const { category, wasNormalized } = normalizeCategory(parsed.data.category);
    if (wasNormalized) uncertainFields.push("category");

    const { date, resolved } = resolveDateExpression(
      parsed.data.dateExpression,
      new Date(referenceDateISO)
    );
    if (!resolved) uncertainFields.push("date");

    if (parsed.data.confidence < 0.6) {
      uncertainFields.push("amount", "description");
    }

    return {
      ok: true,
      candidate: {
        amount: parsed.data.amount,
        currency: parsed.data.currency.toUpperCase(),
        description: parsed.data.description,
        category,
        date,
        rawInput,
        inputMethod: "text",
        confidence: parsed.data.confidence,
        uncertainFields,
      },
    };
  } catch {
    return { ok: false, error: GENERIC_EXTRACTION_ERROR };
  }
}

const expenseToSaveSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1).max(6),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inputMethod: z.enum(["voice", "text", "receipt"]),
  rawInput: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveExpense(
  candidate: Omit<ExpenseCandidate, "uncertainFields">
): Promise<SaveResult> {
  const parsed = expenseToSaveSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: "No se pudo guardar el gasto: datos inválidos." };
  }
  try {
    const created = await prisma.expense.create({ data: parsed.data });
    return { ok: true, id: created.id };
  } catch {
    return { ok: false, error: "No se pudo guardar el gasto. Intenta de nuevo." };
  }
}

export type ExpenseFilters = {
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date" | "amount";
  sortDir?: "asc" | "desc";
};

export async function listExpenses(filters: ExpenseFilters = {}) {
  return prisma.expense.findMany({
    where: {
      ...(filters.search
        ? { description: { contains: filters.search } }
        : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            date: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    },
    orderBy: { [filters.sortBy ?? "date"]: filters.sortDir ?? "desc" },
  });
}

export async function updateExpense(
  id: string,
  candidate: Omit<ExpenseCandidate, "uncertainFields" | "rawInput">
): Promise<SaveResult> {
  const parsed = expenseToSaveSchema.omit({ rawInput: true }).safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: "No se pudo actualizar el gasto: datos inválidos." };
  }
  try {
    await prisma.expense.update({ where: { id }, data: parsed.data });
    return { ok: true, id };
  } catch {
    return { ok: false, error: "No se pudo actualizar el gasto." };
  }
}

export async function deleteExpense(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.expense.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo eliminar el gasto." };
  }
}
