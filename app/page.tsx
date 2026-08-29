import { getTotalForPeriod, getSpendingByCategory, getWeekRange, getMonthRange } from "@/lib/metrics";
import { prisma } from "@/lib/db";
import { CategoryChart } from "@/components/CategoryChart";
import { RecentExpenses } from "@/components/RecentExpenses";

export default async function DashboardPage() {
  const now = new Date();
  const week = getWeekRange(now);
  const month = getMonthRange(now);

  const [weekTotal, monthTotal, categoryBreakdown, recentExpenses] = await Promise.all([
    getTotalForPeriod(week.start, week.end),
    getTotalForPeriod(month.start, month.end),
    getSpendingByCategory(month.start, month.end),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 8 }),
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

  return (
    <section aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading">¿Cómo voy con mi dinero?</h1>
      <dl className="totals">
        <div>
          <dt>Esta semana</dt>
          <dd>${weekTotal.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Este mes</dt>
          <dd>${monthTotal.toFixed(2)}</dd>
        </div>
      </dl>
      <CategoryChart breakdown={categoryBreakdown} />
      <RecentExpenses expenses={recentExpenses} />
    </section>
  );
}
