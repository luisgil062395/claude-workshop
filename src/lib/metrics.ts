/**
 * Calculos deterministas sobre los gastos guardados.
 *
 * Todo lo que la app afirma sobre el dinero de la persona sale de aqui, nunca
 * de un modelo. Mismas entradas, mismas cifras: los numeros del dashboard, del
 * chat y de los insights se pueden reproducir.
 */

import type { BarPoint, BreakdownSlice, Expense, ExpenseCategory } from "./types";
import { category } from "./categories";
import {
  MONTH_SHORT, fromISODate, startOfMonth, startOfWeek, startOfYear, toISODate,
} from "./dates";

export type Period = "week" | "month" | "year";

export const PERIOD_LABEL: Record<Period, string> = {
  week: "Esta Semana",
  month: "Este Mes",
  year: "Este Año",
};

/** Encabezado del total, tal como aparece en Figma: "TOTAL ESTA SEMANA". */
export const PERIOD_TOTAL_LABEL: Record<Period, string> = {
  week: "Total esta semana",
  month: "Total este mes",
  year: "Total este año",
};

export const isIncome = (e: Expense): boolean => e.category === "income";

/** Solo gastos: el ingreso nunca suma al total gastado. */
export const spending = (list: Expense[]): Expense[] => list.filter((e) => !isIncome(e));

export function periodStart(period: Period, now = new Date()): Date {
  if (period === "week") return startOfWeek(now);
  if (period === "month") return startOfMonth(now);
  return startOfYear(now);
}

export function inPeriod(list: Expense[], period: Period, now = new Date()): Expense[] {
  const from = toISODate(periodStart(period, now));
  const to = toISODate(now);
  return list.filter((e) => e.date >= from && e.date <= to);
}

export function total(list: Expense[]): number {
  return list.reduce((sum, e) => sum + e.amount, 0);
}

export function totalSpent(list: Expense[], period: Period, now = new Date()): number {
  return total(spending(inPeriod(list, period, now)));
}

export function totalIncome(list: Expense[], period: Period, now = new Date()): number {
  return total(inPeriod(list, period, now).filter(isIncome));
}

/** Promedio diario de gasto en el periodo, sobre los dias transcurridos. */
export function dailyAverage(list: Expense[], period: Period, now = new Date()): number {
  const days = Math.max(
    1,
    Math.round((now.getTime() - periodStart(period, now).getTime()) / 86_400_000) + 1,
  );
  return totalSpent(list, period, now) / days;
}

/** Serie para la grafica de barras. Una barra por dia, semana o mes segun el periodo. */
export function series(list: Expense[], period: Period, now = new Date()): BarPoint[] {
  const items = spending(inPeriod(list, period, now));

  if (period === "year") {
    const out: BarPoint[] = [];
    for (let m = 0; m <= now.getMonth(); m++) {
      const label = cap(MONTH_SHORT.format(new Date(now.getFullYear(), m, 1)).replace(".", ""));
      const value = total(items.filter((e) => fromISODate(e.date).getMonth() === m));
      out.push({ label, value });
    }
    return out;
  }

  if (period === "month") {
    // Semanas del mes en curso.
    const first = startOfMonth(now);
    const out: BarPoint[] = [];
    let weekStart = startOfWeek(first);
    let n = 1;
    while (weekStart <= now) {
      const from = toISODate(weekStart);
      const to = toISODate(new Date(weekStart.getTime() + 6 * 86_400_000));
      const value = total(items.filter((e) => e.date >= from && e.date <= to));
      out.push({ label: `S${n}`, value });
      weekStart = new Date(weekStart.getTime() + 7 * 86_400_000);
      n += 1;
    }
    return out;
  }

  const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const from = startOfWeek(now);
  return DAYS.map((label, i) => {
    const iso = toISODate(new Date(from.getTime() + i * 86_400_000));
    return { label, value: total(items.filter((e) => e.date === iso)) };
  });
}

/** Reparto por categoria, de mayor a menor. Cada rebanada lleva su etiqueta y su color. */
export function breakdown(list: Expense[], period: Period, now = new Date()): BreakdownSlice[] {
  const items = spending(inPeriod(list, period, now));
  const sum = total(items);
  if (sum === 0) return [];

  const byCat = new Map<ExpenseCategory, number>();
  for (const e of items) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);

  return [...byCat.entries()]
    .map(([cat, value]) => ({
      category: cat,
      label: category(cat).label,
      value,
      share: value / sum,
      colorVar: category(cat).colorVar,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Ventana equivalente del periodo anterior.
 *
 * Comparar enero-agosto contra un ano completo inventaria una "reduccion" que
 * no existe, asi que la ventana anterior cubre exactamente los mismos dias
 * transcurridos: misma semana pasada hasta el mismo dia, mismo mes pasado
 * hasta el mismo numero, mismo ano pasado hasta la misma fecha.
 */
export function previousWindow(period: Period, now = new Date()): { from: string; to: string } {
  if (period === "week") {
    const start = periodStart("week", now);
    return {
      from: toISODate(new Date(start.getTime() - 7 * 86_400_000)),
      to: toISODate(new Date(now.getTime() - 7 * 86_400_000)),
    };
  }
  if (period === "month") {
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    return {
      from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), lastDayPrev))),
    };
  }
  return {
    from: toISODate(new Date(now.getFullYear() - 1, 0, 1)),
    to: toISODate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())),
  };
}

export function inRange(list: Expense[], from: string, to: string): Expense[] {
  return list.filter((e) => e.date >= from && e.date <= to);
}

/** Reparto por categoria en una ventana arbitraria. */
export function breakdownRange(list: Expense[], from: string, to: string): BreakdownSlice[] {
  const items = spending(inRange(list, from, to));
  const sum = total(items);
  if (sum === 0) return [];
  const byCat = new Map<ExpenseCategory, number>();
  for (const e of items) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  return [...byCat.entries()]
    .map(([cat, value]) => ({
      category: cat,
      label: category(cat).label,
      value,
      share: value / sum,
      colorVar: category(cat).colorVar,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Comparacion contra la ventana equivalente del periodo anterior. */
export function previousPeriodDelta(
  list: Expense[], period: Period, now = new Date(),
): { current: number; previous: number; delta: number; share: number | null } {
  const current = totalSpent(list, period, now);
  const { from, to } = previousWindow(period, now);
  const previous = total(spending(inRange(list, from, to)));
  return {
    current,
    previous,
    delta: current - previous,
    share: previous > 0 ? (current - previous) / previous : null,
  };
}

export function largest(list: Expense[], period: Period, now = new Date(), n = 3): Expense[] {
  return [...spending(inPeriod(list, period, now))].sort((a, b) => b.amount - a.amount).slice(0, n);
}

export function recent(list: Expense[], n = 20): Expense[] {
  return [...list]
    .sort((a, b) => (b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
    .slice(0, n);
}

/** Gasto acumulado en una categoria dentro del periodo. */
export function categoryTotal(
  list: Expense[], cat: ExpenseCategory, period: Period, now = new Date(),
): { value: number; count: number } {
  const items = inPeriod(list, period, now).filter((e) => e.category === cat && !isIncome(e));
  return { value: total(items), count: items.length };
}

/** Coincidencias por texto en el concepto. Para responder "¿cuánto llevo en cafés?". */
export function matching(
  list: Expense[], needle: string, period: Period, now = new Date(),
): { value: number; count: number; items: Expense[] } {
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const items = spending(inPeriod(list, period, now)).filter((e) => re.test(e.description));
  return { value: total(items), count: items.length, items };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
