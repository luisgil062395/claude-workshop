import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getTotalForPeriod,
  getSpendingByCategory,
  getWeekRange,
  getMonthRange,
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
