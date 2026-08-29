import { useState } from "react";
import { createExpense } from "../api";

// Controlled by App: `form` is shared with the voice input so an extracted
// draft lands in this same form rather than in a parallel one.
export default function ExpenseForm({ categories, form, setForm, uncertain = [], onSaved }) {
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
  const isUncertain = (name) => uncertain.includes(name);

  // A field is flagged either because the server rejected it on save, or
  // because extraction could not determine it. Both need the user's attention.
  const describedBy = (name) => {
    const ids = [];
    if (fieldError(name)) ids.push(`${name}-error`);
    if (isUncertain(name)) ids.push(`${name}-uncertain`);
    return ids.length ? ids.join(" ") : undefined;
  };

  const flag = (name) => (fieldError(name) || isUncertain(name) ? "true" : undefined);

  const messages = (name) => (
    <>
      {fieldError(name) && (
        <p className="error" id={`${name}-error`}>{fieldError(name)}</p>
      )}
      {isUncertain(name) && (
        <p className="uncertain" id={`${name}-uncertain`}>
          SUMA no pudo determinar este dato. Revísalo antes de guardar.
        </p>
      )}
    </>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>Nuevo gasto</h2>

      {form.raw_input && (
        <p className="provenance">
          <span className="badge">
            {form.input_method === "voice" ? "Por voz" : "Interpretado"}
          </span>{" "}
          &laquo;{form.raw_input}&raquo;
        </p>
      )}

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
          aria-describedby={describedBy("amount")}
          aria-invalid={flag("amount")}
        />
        {messages("amount")}
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
          aria-describedby={describedBy("description")}
          aria-invalid={flag("description")}
        />
        {messages("description")}
      </div>

      <div className="field">
        <label htmlFor="category">Categoría</label>
        <select
          id="category"
          value={form.category}
          onChange={update("category")}
          aria-describedby={describedBy("category")}
          aria-invalid={flag("category")}
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
          id="date"
          type="date"
          value={form.date}
          onChange={update("date")}
          required
          aria-describedby={describedBy("date")}
          aria-invalid={flag("date")}
        />
        {messages("date")}
      </div>

      <button type="submit" disabled={saving}>
        {saving ? "Guardando..." : "Guardar gasto"}
      </button>

      {/* Announced by screen readers without stealing focus. */}
      <p className="status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
