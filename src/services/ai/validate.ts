/**
 * Validacion de toda salida del servicio de IA (CLAUDE.md §23).
 *
 * La salida del modelo se trata como entrada NO confiable. Nada llega al
 * almacenamiento sin pasar por aqui: estructura, tipos, rangos, categoria
 * normalizada y fecha resuelta. Lo que no se puede validar no se inventa,
 * se marca como incierto para que la persona lo complete.
 */

import { z } from "zod";
import type { ExpenseCategory, ExpenseDraft, Expense } from "../../lib/types";
import { CATEGORIES } from "../../lib/categories";
import { todayISO } from "../../lib/dates";
import { id } from "../../lib/id";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [ExpenseCategory, ...ExpenseCategory[]];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const draftSchema = z.object({
  amount: z.number().finite().positive().max(100_000_000).nullable(),
  currency: z.string().length(3).default("MXN"),
  description: z.string().trim().min(1).max(120).nullable(),
  category: z.enum(CATEGORY_IDS).nullable(),
  date: z.string().regex(ISO_DATE).nullable(),
  inputMethod: z.enum(["voice", "text", "receipt"]),
  rawInput: z.string().max(2000).optional(),
  receiptImage: z.string().optional(),
  confidence: z.number().min(0).max(1),
  uncertainFields: z.array(z.string()).default([]),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive().optional(),
    amount: z.number().finite().nonnegative(),
  })).optional(),
  tax: z.number().finite().nonnegative().optional(),
  tip: z.number().finite().nonnegative().optional(),
  source: z.enum(["local", "claude"]),
  question: z.string().max(300).optional(),
});

export type ValidationResult =
  | { ok: true; draft: ExpenseDraft }
  | { ok: false; issues: string[] };

/** Valida y normaliza un borrador. Nunca rellena un campo que falte. */
export function validateDraft(raw: unknown): ValidationResult {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }

  const d = parsed.data as ExpenseDraft;
  const uncertain = new Set(d.uncertainFields);

  // Un campo nulo es, por definicion, incierto. Se declara, no se adivina.
  if (d.amount === null) uncertain.add("amount");
  if (d.description === null) uncertain.add("description");
  if (d.category === null) uncertain.add("category");
  if (d.date === null) uncertain.add("date");

  // Redondeo monetario a dos decimales; nunca se altera la fecha del gasto.
  const amount = d.amount === null ? null : Math.round(d.amount * 100) / 100;

  return { ok: true, draft: { ...d, amount, uncertainFields: [...uncertain] } };
}

/**
 * Convierte un borrador ya revisado en un gasto persistible.
 * Falla si algun campo obligatorio sigue vacio: un registro financiero
 * incompleto nunca se guarda "a medias".
 */
export function toExpense(
  draft: ExpenseDraft, opts: { editedByUser: boolean; now?: Date },
): { ok: true; expense: Expense } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (draft.amount === null || draft.amount <= 0) missing.push("amount");
  if (!draft.description) missing.push("description");
  if (!draft.category) missing.push("category");
  if (!draft.date) missing.push("date");
  if (missing.length) return { ok: false, missing };

  const now = opts.now ?? new Date();
  return {
    ok: true,
    expense: {
      id: id("exp"),
      amount: draft.amount as number,
      currency: draft.currency || "MXN",
      description: draft.description as string,
      category: draft.category as ExpenseCategory,
      date: draft.date as string,
      createdAt: now.toISOString(),   // distinto de `date`: nunca lo sobrescribe
      inputMethod: draft.inputMethod,
      rawInput: draft.rawInput,
      receiptImage: draft.receiptImage,
      confidence: draft.confidence,
      uncertainFields: draft.uncertainFields.length ? draft.uncertainFields : undefined,
      editedByUser: opts.editedByUser || undefined,
      items: draft.items,
      tax: draft.tax,
      tip: draft.tip,
    },
  };
}

/** Borrador vacio: todo desconocido, nada supuesto. */
export function emptyDraft(
  inputMethod: ExpenseDraft["inputMethod"], now = new Date(),
): ExpenseDraft {
  return {
    amount: null,
    currency: "MXN",
    description: null,
    category: null,
    date: todayISO(now),
    inputMethod,
    confidence: 0,
    uncertainFields: ["amount", "description", "category"],
    source: "local",
  };
}
