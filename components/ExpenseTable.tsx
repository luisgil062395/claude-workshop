"use client";

import { useState } from "react";
import { ExpenseReviewCard } from "@/components/ExpenseReviewCard";
import { updateExpenseAction, deleteExpenseAction } from "@/app/expenses/actions";
import { CATEGORY_LABELS } from "@/lib/categories";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  inputMethod: string;
};

export function ExpenseTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p>No se encontraron gastos con estos filtros.</p>;
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
              <td colSpan={6}>
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
              </td>
            </tr>
          ) : (
            <tr key={expense.id}>
              <td>{expense.description}</td>
              <td>
                {expense.currency} {expense.amount.toFixed(2)}
              </td>
              <td>{CATEGORY_LABELS[expense.category] ?? expense.category}</td>
              <td>{expense.date}</td>
              <td>{expense.inputMethod}</td>
              <td>
                <button className="btn btn--sm" onClick={() => setEditingId(expense.id)}>
                  Editar
                </button>{" "}
                {deletingId === expense.id ? (
                  <span>
                    ¿Eliminar?{" "}
                    <button
                      className="btn btn--sm btn--destructive"
                      onClick={async () => {
                        await deleteExpenseAction(expense.id);
                      }}
                    >
                      Sí, eliminar
                    </button>{" "}
                    <button className="btn btn--sm" onClick={() => setDeletingId(null)}>
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button className="btn btn--sm" onClick={() => setDeletingId(expense.id)}>
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}
