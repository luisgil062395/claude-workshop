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

export const CATEGORY_LABELS: Record<string, string> = {
  food: "🍽️ Comida",
  groceries: "🛒 Súper",
  transportation: "🚗 Transporte",
  shopping: "🛍️ Compras",
  housing: "🏠 Hogar",
  bills: "🧾 Servicios",
  health: "🏥 Salud",
  entertainment: "🎬 Entretenimiento",
  travel: "✈️ Viajes",
  education: "🎓 Educación",
  personal: "💆 Personal",
  subscriptions: "🔁 Suscripciones",
  other: "📦 Otro",
};
