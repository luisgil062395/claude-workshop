"use client";

import { useState, type FormEvent } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import type { ExpenseCandidate } from "@/lib/expenses";

type Props = {
  candidate: ExpenseCandidate;
  onConfirm: (edited: Omit<ExpenseCandidate, "uncertainFields">) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function ExpenseReviewCard({
  candidate,
  onConfirm,
  onCancel,
  submitLabel = "Guardar",
}: Props) {
  const [amount, setAmount] = useState(String(candidate.amount));
  const [currency, setCurrency] = useState(candidate.currency);
  const [description, setDescription] = useState(candidate.description);
  const [category, setCategory] = useState(candidate.category);
  const [date, setDate] = useState(candidate.date);

  const isUncertain = (field: string) => candidate.uncertainFields.includes(field);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onConfirm({
      amount: Number(amount),
      currency: currency.toUpperCase(),
      description,
      category,
      date,
      rawInput: candidate.rawInput,
      inputMethod: candidate.inputMethod,
      confidence: candidate.confidence,
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-labelledby="review-heading">
      <h2 id="review-heading">Entendí:</h2>

      <div className={`field ${isUncertain("amount") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-amount">Monto</label>
        <input
          id="review-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          aria-describedby={isUncertain("amount") ? "amount-hint" : undefined}
        />
        {isUncertain("amount") && (
          <span id="amount-hint" className="field__hint">
            ¿Es correcto este monto?
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="review-currency">Moneda</label>
        <input
          id="review-currency"
          type="text"
          maxLength={6}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          required
        />
      </div>

      <div className={`field ${isUncertain("description") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-description">Descripción</label>
        <input
          id="review-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          aria-describedby={isUncertain("description") ? "description-hint" : undefined}
        />
        {isUncertain("description") && (
          <span id="description-hint" className="field__hint">
            ¿Es correcta esta descripción?
          </span>
        )}
      </div>

      <div className={`field ${isUncertain("category") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-category">Categoría</label>
        <select
          id="review-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-describedby={isUncertain("category") ? "category-hint" : undefined}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {isUncertain("category") && (
          <span id="category-hint" className="field__hint">
            No encontré una categoría exacta. ¿Cuál es correcta?
          </span>
        )}
      </div>

      <div className={`field ${isUncertain("date") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-date">Fecha</label>
        <input
          id="review-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          aria-describedby={isUncertain("date") ? "date-hint" : undefined}
        />
        {isUncertain("date") && (
          <span id="date-hint" className="field__hint">
            No pude entender la fecha con certeza. ¿Es correcta?
          </span>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn--primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
