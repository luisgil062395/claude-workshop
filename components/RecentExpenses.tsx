import { CATEGORY_LABELS } from "@/lib/categories";
import { formatAmount } from "@/lib/format";

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
            <div>
              <div className="expense-list__description">{expense.description}</div>
              <div className="expense-list__meta">
                {CATEGORY_LABELS[expense.category] ?? expense.category} · {expense.date}
              </div>
            </div>
            <div className="expense-list__amount">
              {expense.currency} {formatAmount(expense.amount)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
