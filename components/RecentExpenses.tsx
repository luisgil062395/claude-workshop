import { CATEGORY_NAMES, CATEGORY_COLORS } from "@/lib/categories";
import { formatAmount } from "@/lib/format";
import { CategoryIcon } from "@/components/CategoryIcon";

type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
};

export function RecentExpenses({ expenses }: { expenses: Expense[] }) {
  return (
    <div>
      <h2>Transacciones recientes</h2>
      <ul className="expense-list">
        {expenses.map((expense) => (
          <li key={expense.id} className="expense-list__item">
            <span
              className="expense-list__icon"
              style={{
                background: `${CATEGORY_COLORS[expense.category] ?? "#6B7280"}1a`,
                color: CATEGORY_COLORS[expense.category] ?? "#6B7280",
              }}
              aria-hidden="true"
            >
              <CategoryIcon category={expense.category} />
            </span>
            <div className="expense-list__body">
              <div className="expense-list__description">{expense.description}</div>
              <div className="expense-list__meta">
                {CATEGORY_NAMES[expense.category] ?? expense.category} · {expense.date}
              </div>
            </div>
            <div className="expense-list__amount">
              −{expense.currency} {formatAmount(expense.amount)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
