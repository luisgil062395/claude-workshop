import {
  getTotalForPeriod,
  getSpendingByCategory,
  getWeekRange,
  getMonthRange,
  getBiggestExpense,
  getWeekPeriodData,
  getMonthPeriodData,
  getYearPeriodData,
} from "@/lib/metrics";
import { prisma } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatAmount } from "@/lib/format";
import { CategoryChart } from "@/components/CategoryChart";
import { RecentExpenses } from "@/components/RecentExpenses";
import { PeriodSelector } from "@/components/PeriodSelector";

// Always reflect the latest expenses - never statically prerendered/cached.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const week = getWeekRange(now);
  const month = getMonthRange(now);
  const lastWeekReference = new Date(now);
  lastWeekReference.setDate(now.getDate() - 7);
  const lastWeek = getWeekRange(lastWeekReference);

  const [
    weekTotal,
    lastWeekTotal,
    categoryBreakdown,
    biggestExpense,
    recentExpenses,
    weekPeriod,
    monthPeriod,
    yearPeriod,
  ] = await Promise.all([
    getTotalForPeriod(week.start, week.end),
    getTotalForPeriod(lastWeek.start, lastWeek.end),
    getSpendingByCategory(month.start, month.end),
    getBiggestExpense(month.start, month.end),
    prisma.expense.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 8 }),
    getWeekPeriodData(now),
    getMonthPeriodData(now),
    getYearPeriodData(now),
  ]);

  if (recentExpenses.length === 0) {
    return (
      <section aria-labelledby="dashboard-heading">
        <h1 id="dashboard-heading">¿Cómo voy con mi dinero?</h1>
        <p>
          Aún no has registrado gastos. <a href="/agregar">Agrega tu primer gasto</a>.
        </p>
      </section>
    );
  }

  const topCategory = categoryBreakdown[0];
  const weekDelta =
    lastWeekTotal > 0 ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100) : null;

  return (
    <section aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading">¿Cómo voy con mi dinero?</h1>

      <PeriodSelector week={weekPeriod} month={monthPeriod} year={yearPeriod} />

      <div className="insights">
        {weekDelta !== null && (
          <div className="insight-tile">
            <p className="insight-tile__eyebrow">✦ Insight financiero</p>
            <p className="insight-tile__body">
              Esta semana gastaste <strong>${formatAmount(weekTotal)}</strong>,{" "}
              <strong>
                {Math.abs(weekDelta)}% {weekDelta >= 0 ? "más" : "menos"}
              </strong>{" "}
              que la semana pasada.
            </p>
          </div>
        )}
        {topCategory && (
          <div className="insight-tile">
            <p className="insight-tile__eyebrow">✦ Insight financiero</p>
            <p className="insight-tile__body">
              <strong>{CATEGORY_LABELS[topCategory.category] ?? topCategory.category}</strong> es
              tu categoría con más gasto este mes — <strong>{topCategory.percentage}%</strong> del
              total.
            </p>
          </div>
        )}
        {biggestExpense && (
          <div className="insight-tile">
            <p className="insight-tile__eyebrow">✦ Insight financiero</p>
            <p className="insight-tile__body">
              Tu gasto más grande este mes: <strong>{biggestExpense.description}</strong> por{" "}
              <strong>
                {biggestExpense.currency} {formatAmount(biggestExpense.amount)}
              </strong>
              .
            </p>
          </div>
        )}
      </div>

      <h2>Categorías principales</h2>
      <CategoryChart breakdown={categoryBreakdown} />

      <RecentExpenses expenses={recentExpenses} />
    </section>
  );
}
