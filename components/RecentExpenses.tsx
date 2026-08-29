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
      <ul>
        {expenses.map((expense) => (
          <li key={expense.id}>
            {expense.description} — {expense.currency} {expense.amount.toFixed(2)} —{" "}
            {expense.category} — {expense.date}
          </li>
        ))}
      </ul>
    </div>
  );
}
