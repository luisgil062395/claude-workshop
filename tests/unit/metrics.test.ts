import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getTotalForPeriod,
  getSpendingByCategory,
  getWeekRange,
  getMonthRange,
  getDailyTotals,
  getBiggestExpense,
  getYearPeriodData,
  getMonthPeriodData,
} from "@/lib/metrics";

beforeEach(async () => {
  await prisma.expense.deleteMany();
});

afterEach(async () => {
  await prisma.expense.deleteMany();
});

describe("getWeekRange", () => {
  it("returns Monday-Sunday for a mid-week reference date", () => {
    expect(getWeekRange(new Date("2026-08-28T10:00:00"))).toEqual({
      start: "2026-08-24",
      end: "2026-08-30",
    });
  });
});

describe("getMonthRange", () => {
  it("returns the first and last day of the month", () => {
    expect(getMonthRange(new Date("2026-08-28T10:00:00"))).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });
});

describe("getTotalForPeriod", () => {
  it("sums amounts within the date range", async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 100, description: "A", category: "groceries", date: "2026-08-20", inputMethod: "text" },
        { amount: 50, description: "B", category: "food", date: "2026-08-25", inputMethod: "text" },
        { amount: 999, description: "Out of range", category: "food", date: "2026-07-01", inputMethod: "text" },
      ],
    });

    const total = await getTotalForPeriod("2026-08-01", "2026-08-31");
    expect(total).toBe(150);
  });
});

describe("getSpendingByCategory", () => {
  it("groups totals by category with percentages", async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 75, description: "A", category: "groceries", date: "2026-08-20", inputMethod: "text" },
        { amount: 25, description: "B", category: "food", date: "2026-08-21", inputMethod: "text" },
      ],
    });

    const breakdown = await getSpendingByCategory("2026-08-01", "2026-08-31");
    expect(breakdown).toEqual([
      { category: "groceries", total: 75, percentage: 75 },
      { category: "food", total: 25, percentage: 25 },
    ]);
  });
});

describe("getDailyTotals", () => {
  it("returns one entry per day, zero-filled, in chronological order", async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 40, description: "A", category: "food", date: "2026-08-27", inputMethod: "text" },
        { amount: 60, description: "B", category: "food", date: "2026-08-27", inputMethod: "text" },
        { amount: 20, description: "C", category: "food", date: "2026-08-25", inputMethod: "text" },
      ],
    });

    const daily = await getDailyTotals(3, new Date("2026-08-27T10:00:00"));
    expect(daily).toEqual([
      { date: "2026-08-25", total: 20, count: 1 },
      { date: "2026-08-26", total: 0, count: 0 },
      { date: "2026-08-27", total: 100, count: 2 },
    ]);
  });
});

describe("getBiggestExpense", () => {
  it("returns the largest expense in the period", async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 40, description: "Small", category: "food", date: "2026-08-20", inputMethod: "text" },
        { amount: 900, description: "Big", category: "travel", date: "2026-08-21", inputMethod: "text" },
      ],
    });

    const biggest = await getBiggestExpense("2026-08-01", "2026-08-31");
    expect(biggest?.description).toBe("Big");
    expect(biggest?.amount).toBe(900);
  });

  it("returns null when there are no expenses in the period", async () => {
    const biggest = await getBiggestExpense("2026-08-01", "2026-08-31");
    expect(biggest).toBeNull();
  });
});

describe("getYearPeriodData", () => {
  it("returns 12 monthly bars with totals and a grand total", async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 100, description: "A", category: "food", date: "2026-01-15", inputMethod: "text" },
        { amount: 50, description: "B", category: "food", date: "2026-01-20", inputMethod: "text" },
        { amount: 200, description: "C", category: "food", date: "2026-08-05", inputMethod: "text" },
        { amount: 999, description: "Out of year", category: "food", date: "2025-12-31", inputMethod: "text" },
      ],
    });

    const result = await getYearPeriodData(new Date("2026-08-28T10:00:00"));
    expect(result.bars).toHaveLength(12);
    expect(result.bars[0]).toEqual({ label: "Ene", total: 150 });
    expect(result.bars[7]).toEqual({ label: "Ago", total: 200 });
    expect(result.bars[1]).toEqual({ label: "Feb", total: 0 });
    expect(result.total).toBe(350);
  });
});

describe("getMonthPeriodData", () => {
  it("groups the month's daily totals into week-of-month buckets", async () => {
    // August 2026 has 31 days -> 5 week buckets (days 1-7, 8-14, 15-21, 22-28, 29-31)
    await prisma.expense.createMany({
      data: [
        { amount: 40, description: "A", category: "food", date: "2026-08-03", inputMethod: "text" },
        { amount: 60, description: "B", category: "food", date: "2026-08-10", inputMethod: "text" },
        { amount: 999, description: "Out of month", category: "food", date: "2026-07-31", inputMethod: "text" },
        { amount: 30, description: "C", category: "food", date: "2026-08-31", inputMethod: "text" },
      ],
    });

    const result = await getMonthPeriodData(new Date("2026-08-28T10:00:00"));
    expect(result.bars).toHaveLength(5);
    expect(result.bars[0]).toEqual({ label: "Sem 1", total: 40 });
    expect(result.bars[1]).toEqual({ label: "Sem 2", total: 60 });
    expect(result.bars[4]).toEqual({ label: "Sem 5", total: 30 });
    expect(result.total).toBe(130);
  });
});
