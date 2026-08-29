import {
  getTotalForPeriod,
  getSpendingByCategory,
  getWeekRange,
  getMonthRange,
  getDailyTotals,
  getBiggestExpense,
  getWeekdayBreakdown,
} from "@/lib/metrics";
import { prisma } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatAmount } from "@/lib/format";
import { CategoryChart } from "@/components/CategoryChart";
import { RecentExpenses } from "@/components/RecentExpenses";
import { SpendingTrend } from "@/components/SpendingTrend";
import { WeekdaySpending } from "@/components/WeekdaySpending";

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
    monthTotal,
    categoryBreakdown,
    dailyTotals,
    biggestExpense,
    recentExpenses,
  ] = await Promise.all([
    getTotalForPeriod(week.start, week.end),
    getTotalForPeriod(lastWeek.start, lastWeek.end),
    getTotalForPeriod(month.start, month.end),
    getSpendingByCategory(month.start, month.end),
    getDailyTotals(30, now),
    getBiggestExpense(month.start, month.end),
    prisma.expense.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 8 }),
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
      <dl className="totals">
        <div>
          <dt>Esta semana</dt>
          <dd>${formatAmount(weekTotal)}</dd>
        </div>
        <div>
          <dt>Este mes</dt>
          <dd>${formatAmount(monthTotal)}</dd>
        </div>
      </dl>

      <h2>Gasto diario (últimos 30 días)</h2>
      <SpendingTrend daily={dailyTotals} />

      <h2>Gasto por día de la semana</h2>
      <WeekdaySpending breakdown={getWeekdayBreakdown(dailyTotals)} />

      <div className="insights">
        {weekDelta !== null && (
          <p className="insight-tile">
            Esta semana gastaste <strong>${formatAmount(weekTotal)}</strong>,{" "}
            <strong>
              {Math.abs(weekDelta)}% {weekDelta >= 0 ? "más" : "menos"}
            </strong>{" "}
            que la semana pasada.
          </p>
        )}
        {topCategory && (
          <p className="insight-tile">
            <strong>{CATEGORY_LABELS[topCategory.category] ?? topCategory.category}</strong> es tu
            categoría con más gasto este mes — <strong>{topCategory.percentage}%</strong> del
            total.
          </p>
        )}
        {biggestExpense && (
          <p className="insight-tile">
            Tu gasto más grande este mes: <strong>{biggestExpense.description}</strong> por{" "}
            <strong>
              {biggestExpense.currency} {formatAmount(biggestExpense.amount)}
            </strong>
            .
          </p>
        )}
      </div>

      <h2>Categorías principales</h2>
      <CategoryChart breakdown={categoryBreakdown} />

      <RecentExpenses expenses={recentExpenses} />
    </section>
  );
}
