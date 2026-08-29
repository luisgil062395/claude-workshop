// Fuente única de verdad de gastos, perfil financiero y metas (§32.4).
// Dashboard, historial, métricas, chat e insights leen todos de aquí — nunca
// mantienen su propia copia. Persistencia en localStorage; pub/sub simple
// para que los componentes React se re-rendericen con useSyncExternalStore.

import type { Expense, FinancialGoal, FinancialProfile } from "./types";

const STORAGE_KEY = "suma:v1";

type StoreState = {
  expenses: Expense[];
  profile: FinancialProfile;
  goals: FinancialGoal[];
  onboardingComplete: boolean;
};

function emptyState(): StoreState {
  return { expenses: [], profile: {}, goals: [], onboardingComplete: false };
}

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return { ...emptyState(), ...parsed };
  } catch {
    // localStorage corrupto o inaccesible: no tirar la app, empezar en vacío.
    return emptyState();
  }
}

let state: StoreState = loadState();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Cuota excedida u otro fallo de escritura: el estado en memoria sigue
    // siendo consistente para esta sesión aunque no se persista.
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): StoreState {
  return state;
}

export function addExpense(expense: Expense) {
  state = { ...state, expenses: [...state.expenses, expense] };
  persist();
}

export function updateExpense(id: string, patch: Partial<Expense>) {
  state = {
    ...state,
    expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  };
  persist();
}

export function deleteExpense(id: string) {
  state = { ...state, expenses: state.expenses.filter((e) => e.id !== id) };
  persist();
}

export function setProfile(profile: FinancialProfile) {
  state = { ...state, profile: { ...state.profile, ...profile } };
  persist();
}

export function addGoal(goal: FinancialGoal) {
  state = { ...state, goals: [...state.goals, goal] };
  persist();
}

export function updateGoal(id: string, patch: Partial<FinancialGoal>) {
  state = { ...state, goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) };
  persist();
}

export function deleteGoal(id: string) {
  state = { ...state, goals: state.goals.filter((g) => g.id !== id) };
  persist();
}

export function completeOnboarding() {
  state = { ...state, onboardingComplete: true };
  persist();
}

/** Reemplaza todo el estado — usado únicamente por el modo demo (§32.9) y "borrar todo". */
export function replaceState(next: Partial<StoreState>) {
  state = { ...emptyState(), ...next };
  persist();
}

export function generateId(): string {
  return crypto.randomUUID();
}
