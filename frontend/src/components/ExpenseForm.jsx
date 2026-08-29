import { useState } from "react";
import { createExpense } from "../api";

// The local calendar date as YYYY-MM-DD. Not toISOString(), which converts to
// UTC and hands you yesterday's date all evening in Mexico City.
function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

const EMPTY = {
  amount: "",
  currency: "MXN",
  description: "",
  category: "other",
  date: todayLocal(),
  input_method: "text",
};

export default function ExpenseForm({ categories, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setStatus("Guardando...");
    try {
      const saved = await createExpense(form);
      // Reset the amount and description but keep date and category -- entering
      // several expenses in a row is the common case.
      setForm({ ...form, amount: "", description: "" });
      setStatus(`Guardado: ${saved.description}`);
      onSaved(saved);
    } catch (error) {
      // CLAUDE.md 32.12: preserve user input on error. The form keeps its values.
      setErrors(error.fields || {});
      setStatus("No se pudo guardar. Revisa los campos marcados.");
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (name) => errors[name]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>Nuevo gasto</h2>

      <div className="field">
        <label htmlFor="amount">Monto</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={form.amount}
          onChange={update("amount")}
          required
          aria-describedby={fieldError("amount") ? "amount-error" : undefined}
          aria-invalid={fieldError("amount") ? "true" : undefined}
        />
        {fieldError("amount") && (
          <p className="error" id="amount-error">{fieldError("amount")}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="description">Descripción</label>
        <input
          id="description"
          type="text"
          value={form.description}
          onChange={update("description")}
          placeholder="Costco, Uber, café..."
          required
          aria-describedby={fieldError("description") ? "description-error" : undefined}
          aria-invalid={fieldError("description") ? "true" : undefined}
        />
        {fieldError("description") && (
          <p className="error" id="description-error">{fieldError("description")}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="category">Categoría</label>
        <select id="category" value={form.category} onChange={update("category")}>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="date">Fecha</label>
        <input
          id="date"
          type="date"
          value={form.date}
          onChange={update("date")}
          required
          aria-describedby={fieldError("date") ? "date-error" : undefined}
          aria-invalid={fieldError("date") ? "true" : undefined}
        />
        {fieldError("date") && (
          <p className="error" id="date-error">{fieldError("date")}</p>
        )}
      </div>

      <button type="submit" disabled={saving}>
        {saving ? "Guardando..." : "Guardar gasto"}
      </button>

      {/* Announced by screen readers without stealing focus. */}
      <p className="status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
