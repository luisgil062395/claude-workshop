import { useState } from "react";
import { Info, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { saveRunway } from "../api";
import { monthsLabel, pesos, pesosShort } from "../money";

// Every number below arrives computed from Django. This component formats and
// explains; it never calculates.

function ScenarioRow({ scenario }) {
  // A figure without a sentence explaining it is not allowed by the design
  // system, so each status gets its own plain-language reading.
  let reading;
  if (scenario.status === "sustainable") {
    reading = "Tu ingreso cubre este gasto, así que no consumirías tus ahorros.";
  } else if (scenario.status === "no_savings") {
    reading = "Sin ahorros disponibles para cubrir este gasto.";
  } else if (scenario.status === "no_expenses") {
    reading = "Sin gastos registrados para este escenario.";
  } else if (scenario.key === "target") {
    reading = `Gastando ${pesosShort(scenario.monthly_spending)} al mes.`;
  } else {
    reading = `A este ritmo, tus ahorros durarían ${monthsLabel(scenario.months)}.`;
  }

  return (
    <li className={`scenario ${scenario.key === "target" ? "is-target" : ""}`}>
      <div className="scenario-head">
        <h4 className="scenario-label">{scenario.label}</h4>
        {scenario.source === "calculated" && (
          <span className="tag tag-calculated">
            <Sparkle size={12} weight="fill" aria-hidden="true" />
            Calculado de tus gastos
          </span>
        )}
        {scenario.source === "provided" && (
          <span className="tag">Lo que tú indicaste</span>
        )}
      </div>

      <p className="scenario-amount">
        {pesos(scenario.monthly_spending)}
        <span className="scenario-unit"> al mes</span>
      </p>

      <p className="scenario-months">
        {scenario.months !== null && scenario.months !== undefined
          ? monthsLabel(scenario.months)
          : "Sostenible"}
      </p>

      <p className="scenario-reading">{reading}</p>

      {scenario.allowance && (
        <p className="scenario-allowance">
          Como referencia aproximada: {pesosShort(scenario.allowance.weekly)} por
          semana, {pesosShort(scenario.allowance.daily)} por día.
        </p>
      )}

      {scenario.difference && Number(scenario.difference) > 0 && (
        <p className="scenario-difference">
          Son {pesos(scenario.difference)} menos al mes que tu ritmo actual.
        </p>
      )}
    </li>
  );
}

export default function RunwayPlanner({ data, onChanged }) {
  const [form, setForm] = useState(() => ({
    current_savings: data.plan.current_savings || "",
    monthly_income: data.plan.monthly_income || "",
    essential_expenses: data.plan.essential_expenses || "",
    other_expenses: data.plan.other_expenses || "",
    desired_runway_months: data.plan.desired_runway_months || "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(
    !data.plan.current_savings || Number(data.plan.current_savings) === 0
  );

  const observed = data.observed_spending;
  const scenarios = data.scenarios || [];

  const update = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await saveRunway({
        current_savings: form.current_savings || "0",
        monthly_income: form.monthly_income || "0",
        essential_expenses: form.essential_expenses || "0",
        other_expenses: form.other_expenses || "0",
        desired_runway_months: form.desired_runway_months
          ? Number(form.desired_runway_months)
          : null,
      });
      setEditing(false);
      onChanged();
    } catch (error) {
      setErrors(error.fields || {});   // input is preserved
    } finally {
      setSaving(false);
    }
  }

  // Offer SUMA's own figure rather than making the user type what it knows.
  function useObserved(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const fieldError = (name) => errors[name]?.[0];

  const message = (name) =>
    fieldError(name) && (
      <p className="field-message is-error" id={`runway-${name}-error`}>
        <WarningCircle size={16} weight="fill" aria-hidden="true" />
        {fieldError(name)}
      </p>
    );

  const field = (name, label, { placeholder, hint, suggest } = {}) => (
    <div className="field">
      <label htmlFor={`runway-${name}`}>{label}</label>
      <input
        id={`runway-${name}`} type="number" step="0.01" inputMode="decimal"
        value={form[name]} onChange={update(name)} placeholder={placeholder}
        aria-invalid={fieldError(name) ? "true" : undefined}
        aria-describedby={fieldError(name) ? `runway-${name}-error` : undefined}
      />
      {hint && <p className="field-hint">{hint}</p>}
      {suggest && (
        <button type="button" className="btn-suggest" onClick={() => useObserved(name, suggest.value)}>
          <Sparkle size={14} weight="fill" aria-hidden="true" />
          Usar {pesosShort(suggest.value)} — {suggest.note}
        </button>
      )}
      {message(name)}
    </div>
  );

  return (
    <section className="runway" aria-labelledby="runway-heading">
      <h2 id="runway-heading" className="section-label">Que tu dinero dure</h2>

      {/* SUMA states what it knows, and what it doesn't. */}
      {observed ? (
        <p className="observed-note">
          <Sparkle size={16} weight="fill" aria-hidden="true" />
          Basándome en tus gastos registrados, tu promedio reciente es de
          aproximadamente <strong>{pesosShort(observed.total_monthly)}</strong> al
          mes, de {observed.expense_count} gastos en {observed.days_observed} días.
        </p>
      ) : (
        <p className="observed-note is-muted">
          <Info size={16} aria-hidden="true" />
          Todavía no tengo suficientes gastos registrados para estimar tu promedio.
          Puedes escribir una cantidad aproximada.
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} noValidate className="card runway-form">
          {field("current_savings", "¿Cuánto tienes disponible?", {
            placeholder: "45000",
            hint: "Ahorros a los que puedes recurrir.",
          })}
          {field("monthly_income", "¿Cuánto ingreso tienes al mes?", {
            placeholder: "0",
            hint: "Si no tienes ingreso ahora mismo, deja 0.",
          })}
          {field("essential_expenses", "¿Cuánto necesitas para lo esencial?", {
            placeholder: "11000",
            hint: "Vivienda, súper, servicios, salud, transporte.",
            suggest: observed && {
              value: observed.essential_monthly,
              note: "tu promedio esencial",
            },
          })}
          {field("other_expenses", "Otros gastos aproximados", {
            placeholder: "3000",
            suggest: observed && {
              value: observed.discretionary_monthly,
              note: "tu promedio flexible",
            },
          })}

          <div className="field">
            <label htmlFor="runway-desired_runway_months">
              ¿Cuánto tiempo quieres que dure? (opcional)
            </label>
            <input
              id="runway-desired_runway_months" type="number" min="1" step="1"
              inputMode="numeric" value={form.desired_runway_months}
              onChange={update("desired_runway_months")} placeholder="6"
              aria-invalid={fieldError("desired_runway_months") ? "true" : undefined}
              aria-describedby={
                fieldError("desired_runway_months")
                  ? "runway-desired_runway_months-error"
                  : undefined
              }
            />
            <p className="field-hint">En meses.</p>
            {message("desired_runway_months")}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <span className="spinner" aria-hidden="true" />}
              {saving ? "Calculando…" : "Ver mi situación"}
            </button>
            {Number(data.plan.current_savings) > 0 && (
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          {scenarios.length > 0 && (
            <ul className="scenario-list">
              {scenarios.map((scenario) => (
                <ScenarioRow key={scenario.key} scenario={scenario} />
              ))}
            </ul>
          )}

          <p className="uncertainty">
            <Info size={14} aria-hidden="true" />
            Esto no incluye gastos anuales, deudas ni imprevistos que todavía no
            hayas registrado.
          </p>

          <button type="button" className="btn-ghost add-inline" onClick={() => setEditing(true)}>
            Ajustar mis datos
          </button>
        </>
      )}
    </section>
  );
}
