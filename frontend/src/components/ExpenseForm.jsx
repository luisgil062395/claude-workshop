import { useState } from "react";
import { Check, WarningCircle } from "@phosphor-icons/react";
import { createExpense } from "../api";
import { categoryIcon } from "../categories";

// Controlled by App: `form` is shared with the voice input, so an extracted
// draft lands in this same form rather than a parallel one.
export default function ExpenseForm({ categories, form, setForm, uncertain = [], isDraft, onSaved }) {
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  const update = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setSaved("");
    try {
      const expense = await createExpense(form);
      setSaved(`Guardado · ${expense.description}`);
      onSaved(expense);
      // The success state fades after 5s, leaving the final state behind.
      setTimeout(() => setSaved(""), 5000);
    } catch (error) {
      // The error never erases what the user wrote.
      setErrors(error.fields || {});
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (name) => errors[name]?.[0];
  const isUncertain = (name) => uncertain.includes(name);

  const describedBy = (name) => {
    const ids = [];
    if (fieldError(name)) ids.push(`${name}-error`);
    if (isUncertain(name)) ids.push(`${name}-uncertain`);
    return ids.length ? ids.join(" ") : undefined;
  };

  const flag = (name) => (fieldError(name) || isUncertain(name) ? "true" : undefined);

  // A field is flagged either because the server rejected it, or because
  // extraction could not determine it. Both are shown with icon + text.
  const messages = (name) => (
    <>
      {fieldError(name) && (
        <p className="field-message is-error" id={`${name}-error`}>
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          {fieldError(name)}
        </p>
      )}
      {isUncertain(name) && !fieldError(name) && (
        <p className="field-message is-warning" id={`${name}-uncertain`}>
          <WarningCircle size={16} aria-hidden="true" />
          No pude determinar esto. Revísalo antes de guardar.
        </p>
      )}
    </>
  );

  const CategoryIcon = categoryIcon(form.category);
  const categoryLabel =
    categories.find((c) => c.value === form.category)?.label || form.category;

  return (
    <form onSubmit={handleSubmit} noValidate className="expense-form card">
      <h2 className="form-title">{isDraft ? "Entendí:" : "Nuevo gasto"}</h2>

      {/* The interpretation, read back the way a person would say it. */}
      {isDraft && (
        <div className="draft-summary">
          <p className="draft-amount">
            {form.amount ? `$${form.amount} ${form.currency}` : "Falta el monto"}
          </p>
          <p className="draft-meta">
            <CategoryIcon size={18} aria-hidden="true" />
            <span>{form.description || "Sin descripción"}</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>{categoryLabel}</span>
          </p>
          {form.raw_input && (
            <p className="draft-source">
              {form.input_method === "voice" ? "Dijiste" : "Escribiste"}: «{form.raw_input}»
            </p>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="amount">Monto</label>
        <input
          id="amount" type="number" step="0.01" inputMode="decimal"
          value={form.amount} onChange={update("amount")} required
          placeholder="0.00"
          aria-describedby={describedBy("amount")} aria-invalid={flag("amount")}
        />
        {messages("amount")}
      </div>

      <div className="field">
        <label htmlFor="description">Concepto</label>
        <input
          id="description" type="text" value={form.description}
          onChange={update("description")} placeholder="Ej. Café con Ana" required
          aria-describedby={describedBy("description")} aria-invalid={flag("description")}
        />
        {messages("description")}
      </div>

      <div className="field">
        <label htmlFor="category">Categoría</label>
        <select
          id="category" value={form.category} onChange={update("category")}
          aria-describedby={describedBy("category")} aria-invalid={flag("category")}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {messages("category")}
      </div>

      <div className="field">
        <label htmlFor="date">Fecha</label>
        <input
          id="date" type="date" value={form.date} onChange={update("date")} required
          aria-describedby={describedBy("date")} aria-invalid={flag("date")}
        />
        {messages("date")}
      </div>

      {/* One primary action. */}
      <button type="submit" className="btn-primary form-submit" disabled={saving}>
        {saving && <span className="spinner" aria-hidden="true" />}
        {saving ? "Guardando…" : "Guardar gasto"}
      </button>

      <p className="form-status" role="status" aria-live="polite">
        {saved && (
          <span className="is-success">
            <Check size={16} weight="bold" aria-hidden="true" /> {saved}
          </span>
        )}
      </p>
    </form>
  );
}
