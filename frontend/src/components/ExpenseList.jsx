import { deleteExpense } from "../api";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatDate(iso) {
  // Parsed as local, not UTC -- "2026-08-28" must not render as Aug 27.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ExpenseList({ expenses, onDeleted }) {
  async function handleDelete(expense) {
    if (!confirm(`¿Eliminar "${expense.description}"?`)) return;
    await deleteExpense(expense.id);
    onDeleted(expense.id);
  }

  if (expenses.length === 0) {
    return (
      <section>
        <h2>Historial</h2>
        <p className="empty">
          Aún no hay gastos. Registra el primero con el formulario.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Historial</h2>
      <table>
        <caption className="visually-hidden">
          Gastos registrados, del más reciente al más antiguo
        </caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Descripción</th>
            <th scope="col">Categoría</th>
            <th scope="col" className="right">Monto</th>
            <th scope="col"><span className="visually-hidden">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{formatDate(expense.date)}</td>
              <td>{expense.description}</td>
              <td>{expense.category_label}</td>
              <td className="right">{money.format(expense.amount)}</td>
              <td>
                <button
                  type="button"
                  className="link"
                  onClick={() => handleDelete(expense)}
                >
                  Eliminar
                  <span className="visually-hidden"> {expense.description}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
