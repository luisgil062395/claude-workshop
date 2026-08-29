// Toda la matemática financiera vive aquí, es determinista y opera sobre los
// datos guardados (§30, §32.8). El chat nunca calcula: llama estas funciones
// como tools y solo narra el resultado (ver src/lib/chatTools.ts).

import { toISODate } from "./dates";
import type { Expense, ExpenseCategory, FinancialGoal, FinancialProfile } from "./types";

export type DateRange = { from: string; to: string };

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function currentMonthRange(referenceDate: Date = new Date()): DateRange {
  const from = startOfMonth(referenceDate);
  return { from: toISODate(from), to: toISODate(referenceDate) };
}

export function last30DaysRange(referenceDate: Date = new Date()): DateRange {
  const from = new Date(referenceDate);
  from.setDate(from.getDate() - 30);
  return { from: toISODate(from), to: toISODate(referenceDate) };
}

function inRange(dateStr: string, range: DateRange): boolean {
  return dateStr >= range.from && dateStr <= range.to;
}

export function totalForPeriod(expenses: Expense[], range: DateRange): number {
  return expenses.filter((e) => inRange(e.date, range)).reduce((sum, e) => sum + e.amount, 0);
}

export function sumByCategory(expenses: Expense[], range: DateRange): Record<ExpenseCategory, number> {
  const totals = {} as Record<ExpenseCategory, number>;
  for (const expense of expenses) {
    if (!inRange(expense.date, range)) continue;
    totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
  }
  return totals;
}

export function totalForCategory(expenses: Expense[], category: ExpenseCategory, range: DateRange): number {
  return expenses
    .filter((e) => e.category === category && inRange(e.date, range))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function recentExpenses(expenses: Expense[], count = 5): Expense[] {
  return [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, count);
}

/**
 * Ingreso disponible para ahorrar por mes: ingreso - gastos recurrentes -
 * gasto variable real de los últimos 30 días. Se basa en datos reales del
 * usuario (§32.15), no en un promedio inventado.
 */
export function monthlyAvailableToSave(
  profile: FinancialProfile,
  expenses: Expense[],
  referenceDate: Date = new Date(),
): number {
  const variableSpend = totalForPeriod(expenses, last30DaysRange(referenceDate));
  const income = profile.monthlyIncome ?? 0;
  const recurring = profile.monthlyRecurringExpenses ?? 0;
  return income - recurring - variableSpend;
}

export type GoalScenario = { label: string; monthlyAmount: number; months: number | null };

export type GoalProjection = {
  remaining: number;
  currentPaceMonths: number | null;
  scenarios: GoalScenario[];
};

/** Proyección de una meta financiera a partir del ahorro mensual disponible (§14, §30). */
export function projectGoal(goal: FinancialGoal, availablePerMonth: number): GoalProjection {
  const remaining = Math.max(goal.targetAmount - (goal.currentAmount ?? 0), 0);
  const monthsFor = (amount: number): number | null =>
    amount > 0 ? Math.ceil(remaining / amount) : null;

  const roundedPace = Math.max(Math.round(availablePerMonth / 100) * 100, 0);
  const scenarios: GoalScenario[] = [
    { label: "Ritmo actual", monthlyAmount: roundedPace, months: monthsFor(roundedPace) },
    { label: `Ahorrar $${roundedPace + 1000}/mes`, monthlyAmount: roundedPace + 1000, months: monthsFor(roundedPace + 1000) },
    { label: `Ahorrar $${roundedPace + 2000}/mes`, monthlyAmount: roundedPace + 2000, months: monthsFor(roundedPace + 2000) },
  ];

  return { remaining, currentPaceMonths: monthsFor(availablePerMonth), scenarios };
}
