// Tipos del modelo de datos — SUMA_es.md §10 (Expense) y §14 (FinancialGoal).
// Usar tal cual; no renombrar campos ni reinventar la forma (ver CLAUDE.md).

export type ExpenseInputMethod = "voice" | "text" | "receipt";

export type ExpenseCategory =
  | "food"
  | "groceries"
  | "transportation"
  | "shopping"
  | "housing"
  | "bills"
  | "health"
  | "entertainment"
  | "travel"
  | "education"
  | "personal"
  | "subscriptions"
  | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "food",
  "groceries",
  "transportation",
  "shopping",
  "housing",
  "bills",
  "health",
  "entertainment",
  "travel",
  "education",
  "personal",
  "subscriptions",
  "other",
];

export type ReceiptItem = {
  description: string;
  quantity?: number;
  amount: number;
};

export type Expense = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD — fecha del gasto (§9, nunca == fecha de captura salvo coincidencia real)
  createdAt: string; // ISO timestamp — cuándo se registró
  inputMethod: ExpenseInputMethod;

  rawInput?: string;
  receiptImage?: string;
  confidence?: number; // 0-1, confianza global de la extracción

  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };

  items?: ReceiptItem[];
  tax?: number;
  tip?: number;
};

export type FinancialGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
};

// §12: contexto financiero opcional y editable — el usuario puede registrar
// gastos sin llenarlo. Campos reducidos al subconjunto P0 (§26): ingreso,
// gasto recurrente, meta de ahorro opcional.
export type FinancialProfile = {
  monthlyIncome?: number;
  monthlyRecurringExpenses?: number;
  currentSavings?: number;
};

// Confianza por campo extraído — soporta la UI de incertidumbre (§11, §24).
// No es parte del modelo de datos persistido; es un artefacto del pipeline
// de extracción antes de la revisión del usuario.
export type FieldConfidence<T> = {
  value: T;
  confidence: number; // 0-1
};

export type ExpenseDraft = {
  amount: FieldConfidence<number | null>;
  currency: FieldConfidence<string | null>;
  description: FieldConfidence<string | null>;
  category: FieldConfidence<ExpenseCategory | null>;
  date: FieldConfidence<string | null>;
  items?: ReceiptItem[];
  tax?: number;
  tip?: number;
  rawInput?: string;
  receiptImage?: string;
  inputMethod: ExpenseInputMethod;
  /** Pregunta que la IA quiere hacerle al usuario cuando algo es ambiguo (§24). */
  clarifyingQuestion?: string;
};
