/** Modelo de datos normalizado. Voz, texto y recibo producen la misma forma. */

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
  | "income"
  | "other";

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
  /** Cuándo ocurrió el gasto. YYYY-MM-DD. */
  date: string;
  /** Cuándo se registró. ISO timestamp. Nunca sobrescribe `date`. */
  createdAt: string;
  inputMethod: ExpenseInputMethod;

  rawInput?: string;
  receiptImage?: string;
  confidence?: number;
  /** Campos que la IA no pudo determinar con confianza. */
  uncertainFields?: string[];
  /** true si la persona corrigió algún campo antes de guardar. */
  editedByUser?: boolean;

  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };

  items?: ReceiptItem[];
  tax?: number;
  tip?: number;

  /** Nota libre de la persona. El design system la expone en la revisión. */
  note?: string;
  /**
   * Marca manual de gasto recurrente. La *detección* automática es P2
   * (CLAUDE.md §26); esto es solo la bandera, sin inferencia.
   */
  recurring?: boolean;
};

/** Resultado del pipeline de extracción, antes de guardarse. */
export type ExpenseDraft = {
  amount: number | null;
  currency: string;
  description: string | null;
  category: ExpenseCategory | null;
  date: string | null;
  inputMethod: ExpenseInputMethod;
  rawInput?: string;
  receiptImage?: string;
  confidence: number;
  /** Campos que no se pudieron extraer de forma confiable. */
  uncertainFields: string[];
  items?: ReceiptItem[];
  tax?: number;
  tip?: number;
  /** Origen de la interpretación: útil para explicarle a la persona qué pasó. */
  source: "local" | "claude";
  /** Preguntas abiertas para resolver antes de guardar. */
  question?: string;
};

export type FinancialProfile = {
  monthlyIncome?: number;
  incomeFrequency?: "weekly" | "biweekly" | "monthly";
  fixedMonthlyExpenses?: number;
  savings?: number;
  monthlyDebtPayments?: number;
  desiredMonthlySaving?: number;
  currency: string;
  /** Contexto opcional en lenguaje natural que la persona quiera compartir. */
  notes?: string;
};

export type FinancialGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  createdAt: string;
};

export type ChatRole = "user" | "suma";

/** Bloque estructurado que Suma puede anidar dentro de su respuesta. */
export type ChatAttachment =
  | { kind: "expense"; expenseId: string }
  | { kind: "draft"; draftId: string }
  | { kind: "insight"; title: string; body: string; series?: BarPoint[] }
  | { kind: "breakdown"; title: string; caption: string; slices: BreakdownSlice[] }
  | { kind: "trend"; title: string; caption: string; series: BarPoint[] }
  | { kind: "goal"; goalId: string }
  | { kind: "scenarios"; title: string; caption: string; rows: ScenarioRow[] }
  | { kind: "error"; message: string; retryLabel?: string };

export type BarPoint = { label: string; value: number };
export type BreakdownSlice = { label: string; value: number; share: number; colorVar: string; category: ExpenseCategory };
export type ScenarioRow = { label: string; detail: string };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  /** Marca respuestas cuyo cálculo es determinista sobre los datos guardados. */
  computed?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

/** Los diez estados del sistema de voz. Cada uno con texto visible. */
export type VoiceState =
  | "idle"
  | "listening"
  | "recording"
  | "processing"
  | "transcribing"
  | "interpreting"
  | "saving"
  | "saved"
  | "error"
  | "cancelled";

export type Permissions = {
  microphone: "unknown" | "granted" | "denied";
  camera: "unknown" | "granted" | "denied";
  location: "unknown" | "granted" | "denied";
};

export type StartingContext = "control" | "goal" | "understand" | null;

export type AppData = {
  version: 1;
  expenses: Expense[];
  goals: FinancialGoal[];
  profile: FinancialProfile;
  conversations: Conversation[];
  onboardingComplete: boolean;
  startingContext: StartingContext;
};
