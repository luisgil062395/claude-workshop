import { Microphone, Trash } from "@phosphor-icons/react";
import { deleteExpense } from "../api";
import { categoryIcon } from "../categories";

// Amounts are formatted without the currency symbol so the sign can be placed
// explicitly: an expense reads "−$120.00", in neutral ink. Spending is not an
// error, so it is never red.
const amountFormat = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseLocalDate(iso) {
  // Parsed as local, not UTC -- "2026-08-28" must not render as Aug 27.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function groupLabel(iso) {
  const today = new Date();
  const date = parseLocalDate(iso);
  const days = Math.round((today.setHours(0, 0, 0, 0) - date) / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return date.toLocaleDateString("es-MX", {
    day: "numeric", month: "long",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function groupByDate(expenses) {
  const groups = [];
  for (const expense of expenses) {
    const label = groupLabel(expense.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(expense);
    else groups.push({ label, items: [expense] });
  }
  return groups;
}

export default function ExpenseList({ expenses, onDeleted }) {
  async function handleDelete(expense) {
    if (!confirm(`¿Eliminar "${expense.description}"?`)) return;
    await deleteExpense(expense.id);
    onDeleted(expense.id);
  }

  if (expenses.length === 0) {
    return (
      <section className="history" aria-labelledby="history-heading">
        <h2 id="history-heading" className="section-label">Tus gastos</h2>
        <p className="empty">
          Todavía no hay gastos. Dime uno en voz alta o escríbelo y aparecerá aquí.
        </p>
      </section>
    );
  }

  return (
    <section className="history" aria-labelledby="history-heading">
      <h2 id="history-heading" className="section-label">Tus gastos</h2>

      {groupByDate(expenses).map((group) => (
        <div className="day-group" key={group.label}>
          <h3 className="day-label">{group.label}</h3>
          <ul className="tx-list">
            {group.items.map((expense) => {
              const Icon = categoryIcon(expense.category);
              return (
                <li className="tx-row" key={expense.id}>
                  <span className="tx-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>

                  <span className="tx-body">
                    <span className="tx-title">{expense.description}</span>
                    <span className="tx-meta">
                      {expense.category_label}
                      {expense.input_method === "voice" && (
                        <>
                          {" · "}
                          <Microphone size={12} weight="fill" aria-hidden="true" />
                          <span className="visually-hidden">Registrado por voz</span>
                          <span aria-hidden="true"> Voz</span>
                        </>
                      )}
                    </span>
                  </span>

                  {/* Neutral ink, tabular, explicit minus sign. Never red. */}
                  <span className="tx-amount">
                    <span aria-hidden="true">−${amountFormat.format(expense.amount)}</span>
                    <span className="visually-hidden">
                      Gasto de {amountFormat.format(expense.amount)} {expense.currency}
                    </span>
                  </span>

                  <button
                    type="button"
                    className="btn-destructive tx-delete"
                    onClick={() => handleDelete(expense)}
                    aria-label={`Eliminar ${expense.description}`}
                  >
                    <Trash size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
