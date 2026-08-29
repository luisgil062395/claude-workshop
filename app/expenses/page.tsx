import { listExpenses } from "@/lib/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { ExpenseTable } from "@/components/ExpenseTable";

type SearchParams = {
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  const expenses = await listExpenses(filters);

  return (
    <section aria-labelledby="history-heading">
      <h1 id="history-heading">Historial de gastos</h1>
      <form method="get">
        <div className="field-inline">
          <label htmlFor="search">Buscar</label>
          <input id="search" type="search" name="search" defaultValue={filters.search ?? ""} />
        </div>

        <div className="field-inline">
          <label htmlFor="category">Categoría</label>
          <select id="category" name="category" defaultValue={filters.category ?? ""}>
            <option value="">Todas</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field-inline">
          <label htmlFor="dateFrom">Desde</label>
          <input id="dateFrom" type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} />
        </div>

        <div className="field-inline">
          <label htmlFor="dateTo">Hasta</label>
          <input id="dateTo" type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} />
        </div>

        <button type="submit" className="btn btn--primary">
          Filtrar
        </button>
      </form>

      <ExpenseTable expenses={expenses} />
    </section>
  );
}
