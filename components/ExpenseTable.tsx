"use client";

import { useEffect, useState } from "react";
import { ExpenseReviewCard } from "@/components/ExpenseReviewCard";
import { updateExpenseAction, deleteExpenseAction } from "@/app/expenses/actions";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/categories";
import { formatAmount } from "@/lib/format";
import { CategoryIcon } from "@/components/CategoryIcon";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  inputMethod: string;
};

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(query.matches);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

export function ExpenseTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (expenses.length === 0) {
    return <p>No se encontraron gastos con estos filtros.</p>;
  }

  function renderReviewCard(expense: ExpenseRow) {
    return (
      <ExpenseReviewCard
        candidate={{
          amount: expense.amount,
          currency: expense.currency,
          description: expense.description,
          category: expense.category,
          date: expense.date,
          inputMethod: expense.inputMethod as "voice" | "text" | "receipt",
          confidence: 1,
          uncertainFields: [],
        }}
        submitLabel="Guardar cambios"
        onConfirm={async (edited) => {
          await updateExpenseAction(expense.id, edited);
          setEditingId(null);
        }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  function renderActions(expense: ExpenseRow) {
    return (
      <div className="expense-actions">
        <button className="btn btn--sm" onClick={() => setEditingId(expense.id)}>
          Editar
        </button>
        {deletingId === expense.id ? (
          <span className="expense-actions__confirm">
            ¿Eliminar?
            <button
              className="btn btn--sm btn--destructive"
              onClick={async () => {
                await deleteExpenseAction(expense.id);
              }}
            >
              Sí, eliminar
            </button>
            <button className="btn btn--sm" onClick={() => setDeletingId(null)}>
              Cancelar
            </button>
          </span>
        ) : (
          <button className="btn btn--sm" onClick={() => setDeletingId(expense.id)}>
            Eliminar
          </button>
        )}
      </div>
    );
  }

  if (isMobile) {
    return (
      <ul className="expense-cards">
        {expenses.map((expense) => (
          <li key={expense.id} className="expense-card">
            {editingId === expense.id ? (
              renderReviewCard(expense)
            ) : (
              <>
                <div className="expense-card__row">
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
                  <div className="expense-card__body">
                    <div className="expense-list__description">{expense.description}</div>
                    <div className="expense-list__meta">
                      {CATEGORY_LABELS[expense.category] ?? expense.category} · {expense.date}
                    </div>
                  </div>
                  <div className="expense-list__amount">
                    −{expense.currency} {formatAmount(expense.amount)}
                  </div>
                </div>
                {renderActions(expense)}
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <table>
      <caption className="visually-hidden">Lista de gastos registrados</caption>
      <thead>
        <tr>
          <th scope="col">Descripción</th>
          <th scope="col">Monto</th>
          <th scope="col">Categoría</th>
          <th scope="col">Fecha</th>
          <th scope="col">Entrada</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) =>
          editingId === expense.id ? (
            <tr key={expense.id}>
              <td colSpan={6}>{renderReviewCard(expense)}</td>
            </tr>
          ) : (
            <tr key={expense.id}>
              <td>
                <span className="expense-table__row">
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
                  {expense.description}
                </span>
              </td>
              <td>
                −{expense.currency} {formatAmount(expense.amount)}
              </td>
              <td>{CATEGORY_LABELS[expense.category] ?? expense.category}</td>
              <td>{expense.date}</td>
              <td>{expense.inputMethod}</td>
              <td>{renderActions(expense)}</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}
