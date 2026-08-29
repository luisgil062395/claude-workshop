import { prisma } from "@/lib/db";
import { formatDateYYYYMMDD } from "@/lib/dates";

export type CategoryBreakdown = {
  category: string;
  total: number;
  percentage: number;
};

export async function getTotalForPeriod(
  start: string,
  end: string
): Promise<number> {
  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { date: { gte: start, lte: end } },
  });
  return result._sum.amount ?? 0;
}

export async function getSpendingByCategory(
  start: string,
  end: string
): Promise<CategoryBreakdown[]> {
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
    select: { category: true, amount: true },
  });

  const totals = new Map<string, number>();
  let grandTotal = 0;
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    grandTotal += expense.amount;
  }

  return Array.from(totals.entries())
    .map(([category, total]) => ({
      category,
      total,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getWeekRange(referenceDate: Date): { start: string; end: string } {
  const day = referenceDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDateYYYYMMDD(monday), end: formatDateYYYYMMDD(sunday) };
}

export function getMonthRange(referenceDate: Date): { start: string; end: string } {
  const first = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const last = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return { start: formatDateYYYYMMDD(first), end: formatDateYYYYMMDD(last) };
}

export type DailyTotal = { date: string; total: number; count: number };

export async function getDailyTotals(
  days: number,
  referenceDate: Date
): Promise<DailyTotal[]> {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - (days - 1));
  const startISO = formatDateYYYYMMDD(start);
  const endISO = formatDateYYYYMMDD(referenceDate);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startISO, lte: endISO } },
    select: { date: true, amount: true },
  });

  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amount);
    counts.set(expense.date, (counts.get(expense.date) ?? 0) + 1);
  }

  const result: DailyTotal[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = formatDateYYYYMMDD(d);
    result.push({ date: iso, total: totals.get(iso) ?? 0, count: counts.get(iso) ?? 0 });
  }
  return result;
}

export type WeekdayTotal = { weekday: string; total: number; count: number };

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function getWeekdayBreakdown(daily: DailyTotal[]): WeekdayTotal[] {
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);

  for (const day of daily) {
    const date = new Date(`${day.date}T00:00:00`);
    const index = (date.getDay() + 6) % 7; // 0 = Monday ... 6 = Sunday
    totals[index] += day.total;
    counts[index] += day.count;
  }

  return WEEKDAY_LABELS.map((weekday, index) => ({
    weekday,
    total: totals[index],
    count: counts[index],
  }));
}

export type BiggestExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
} | null;

export async function getBiggestExpense(
  start: string,
  end: string
): Promise<BiggestExpense> {
  const expense = await prisma.expense.findFirst({
    where: { date: { gte: start, lte: end } },
    orderBy: { amount: "desc" },
    select: { id: true, description: true, amount: true, currency: true, category: true, date: true },
  });
  return expense ?? null;
}

export async function buildFinancialContext(referenceDate: Date): Promise<string> {
  const month = getMonthRange(referenceDate);
  const [monthTotal, categoryBreakdown, biggestExpense, recentExpenses] = await Promise.all([
    getTotalForPeriod(month.start, month.end),
    getSpendingByCategory(month.start, month.end),
    getBiggestExpense(month.start, month.end),
    prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 15,
      select: { description: true, amount: true, currency: true, category: true, date: true },
    }),
  ]);

  const lines: string[] = [];
  lines.push(`Gasto total este mes (${month.start} a ${month.end}): $${monthTotal.toFixed(2)} MXN.`);
  lines.push(`Número de transacciones registradas: ${recentExpenses.length > 0 ? "al menos " + recentExpenses.length : 0}.`);

  if (categoryBreakdown.length > 0) {
    lines.push("Gasto por categoría este mes:");
    for (const c of categoryBreakdown) {
      lines.push(`- ${c.category}: $${c.total.toFixed(2)} (${c.percentage}% del total)`);
    }
  }

  if (biggestExpense) {
    lines.push(
      `Gasto más grande este mes: "${biggestExpense.description}" por ${biggestExpense.currency} ${biggestExpense.amount.toFixed(2)} el ${biggestExpense.date}, categoría ${biggestExpense.category}.`
    );
  }

  if (recentExpenses.length > 0) {
    lines.push("Transacciones más recientes:");
    for (const e of recentExpenses) {
      lines.push(`- ${e.date}: ${e.description} — ${e.currency} ${e.amount.toFixed(2)} (${e.category})`);
    }
  }

  if (recentExpenses.length === 0) {
    lines.push("El usuario aún no ha registrado ningún gasto.");
  }

  return lines.join("\n");
}
