export const EXPENSE_CATEGORIES = [
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
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
