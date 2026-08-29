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

export const CATEGORY_ICONS: Record<string, string> = {
  food: "🍽️",
  groceries: "🛒",
  transportation: "🚗",
  shopping: "🛍️",
  housing: "🏠",
  bills: "🧾",
  health: "🏥",
  entertainment: "🎬",
  travel: "✈️",
  education: "🎓",
  personal: "💆",
  subscriptions: "🔁",
  other: "📦",
};

export const CATEGORY_NAMES: Record<string, string> = {
  food: "Comida",
  groceries: "Súper",
  transportation: "Transporte",
  shopping: "Compras",
  housing: "Hogar",
  bills: "Servicios",
  health: "Salud",
  entertainment: "Entretenimiento",
  travel: "Viajes",
  education: "Educación",
  personal: "Personal",
  subscriptions: "Suscripciones",
  other: "Otro",
};

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c, `${CATEGORY_ICONS[c]} ${CATEGORY_NAMES[c]}`])
);

// SUMA chart palette (chart/1-6): validated for deuteranopia/protanopia/
// tritanopia, cycled deterministically per category so a category always
// gets the same color across the app. Never used to color a single
// transaction's amount - only aggregate category charts.
const CHART_PALETTE = [
  "#0B5C41",
  "#9A5B00",
  "#4A2BB5",
  "#7FB8DE",
  "#C4699B",
];

export const CATEGORY_COLORS: Record<string, string> = {
  food: CHART_PALETTE[0],
  groceries: CHART_PALETTE[1],
  transportation: CHART_PALETTE[2],
  shopping: CHART_PALETTE[3],
  housing: CHART_PALETTE[4],
  bills: CHART_PALETTE[0],
  health: CHART_PALETTE[1],
  entertainment: CHART_PALETTE[2],
  travel: CHART_PALETTE[3],
  education: CHART_PALETTE[4],
  personal: CHART_PALETTE[0],
  subscriptions: CHART_PALETTE[1],
  other: "#6B7280",
};
