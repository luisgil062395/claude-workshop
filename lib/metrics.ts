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
