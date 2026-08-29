import { useState } from "react";
import { Plus, Target, Trash, WarningCircle } from "@phosphor-icons/react";
import { createGoal, deleteGoal } from "../api";
import { pesos, pesosShort } from "../money";

const EMPTY = { name: "", target_amount: "", current_amount: "", target_date: "" };

// Progress is never communicated by colour alone: the bar is paired with a
// "42% completado" text label and an accessible progressbar role.
function Progress({ percent, label }) {
  return (
    <div className="progress">
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-text">{percent}% completado</p>
    </div>
  );
}

function GoalRow({ goal, onDeleted }) {
  const { progress } = goal;

  async function handleDelete() {
    if (!confirm(`¿Eliminar la meta "${goal.name}"?`)) return;
    await deleteGoal(goal.id);
    onDeleted();
  }

  // Every figure gets a sentence that explains it.
  let context = null;
  if (progress.status === "complete") {
    context = "Ya alcanzaste esta meta.";
  } else if (progress.status === "overdue") {
    context = "La fecha objetivo ya pasó. Puedes ajustarla cuando quieras.";
  } else if (progress.monthly_required) {
    context = `Para llegar a tiempo, necesitarías apartar ${pesos(
      progress.monthly_required
    )} al mes.`;
  } else {
    context = `Te faltan ${pesos(progress.remaining)}.`;
  }

  return (
    <li className="goal-row">
      <div className="goal-head">
        <span className="goal-icon" aria-hidden="true">
          <Target size={20} />
        </span>
        <div className="goal-title-block">
          <h3 className="goal-name">{goal.name}</h3>
          <p className="goal-amounts">
            <span className="goal-current">{pesosShort(goal.current_amount)}</span>
            <span className="goal-of"> de {pesosShort(goal.target_amount)}</span>
          </p>
        </div>
        <button
          type="button"
          className="btn-destructive"
          onClick={handleDelete}
          aria-label={`Eliminar la meta ${goal.name}`}
        >
          <Trash size={18} aria-hidden="true" />
        </button>
      </div>

      <Progress percent={progress.percent} label={`Progreso de ${goal.name}`} />
      <p className="goal-context">{context}</p>
    </li>
  );
}

export default function GoalsPanel({ goals, onChanged }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await createGoal({
        name: form.name,
        target_amount: form.target_amount,
        current_amount: form.current_amount || "0",
        target_date: form.target_date || null,
      });
      setForm(EMPTY);
      setOpen(false);
      onChanged();
    } catch (error) {
      setErrors(error.fields || {});   // the form keeps what was typed
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (name) => errors[name]?.[0];

  const message = (name) =>
    fieldError(name) && (
      <p className="field-message is-error" id={`goal-${name}-error`}>
        <WarningCircle size={16} weight="fill" aria-hidden="true" />
        {fieldError(name)}
      </p>
    );

  return (
    <section className="goals" aria-labelledby="goals-heading">
      <h2 id="goals-heading" className="section-label">Tus metas</h2>

      {goals.length === 0 && !open && (
        <p className="empty">
          Todavía no tienes metas. Puedes crear una para algo que quieras ahorrar.
        </p>
      )}

      {goals.length > 0 && (
        <ul className="goal-list">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} onDeleted={onChanged} />
          ))}
        </ul>
      )}

      {open ? (
        <form onSubmit={handleSubmit} noValidate className="card goal-form">
          <h3 className="form-title">Nueva meta</h3>

          <div className="field">
            <label htmlFor="goal-name">¿Para qué estás ahorrando?</label>
            <input
              id="goal-name" type="text" value={form.name} onChange={update("name")}
              placeholder="Ej. Fondo de emergencia" required
              aria-invalid={fieldError("name") ? "true" : undefined}
              aria-describedby={fieldError("name") ? "goal-name-error" : undefined}
            />
            {message("name")}
          </div>

          <div className="field">
            <label htmlFor="goal-target">¿Cuánto quieres juntar?</label>
            <input
              id="goal-target" type="number" step="0.01" inputMode="decimal"
              value={form.target_amount} onChange={update("target_amount")}
              placeholder="30000" required
              aria-invalid={fieldError("target_amount") ? "true" : undefined}
              aria-describedby={fieldError("target_amount") ? "goal-target_amount-error" : undefined}
            />
            {message("target_amount")}
          </div>

          <div className="field">
            <label htmlFor="goal-current">¿Cuánto llevas? (opcional)</label>
            <input
              id="goal-current" type="number" step="0.01" inputMode="decimal"
              value={form.current_amount} onChange={update("current_amount")}
              placeholder="0"
              aria-invalid={fieldError("current_amount") ? "true" : undefined}
              aria-describedby={fieldError("current_amount") ? "goal-current_amount-error" : undefined}
            />
            {message("current_amount")}
          </div>

          <div className="field">
            <label htmlFor="goal-date">¿Para cuándo? (opcional)</label>
            <input
              id="goal-date" type="date" value={form.target_date}
              onChange={update("target_date")}
            />
            <p className="field-hint">
              Si pones una fecha, te digo cuánto necesitarías apartar cada mes.
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <span className="spinner" aria-hidden="true" />}
              {saving ? "Guardando…" : "Crear meta"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-ghost add-inline" onClick={() => setOpen(true)}>
          <Plus size={18} aria-hidden="true" /> Nueva meta
        </button>
      )}
    </section>
  );
}
