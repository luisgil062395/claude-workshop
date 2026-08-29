import { useEffect, useState } from "react";
import { Plus, Target, WarningCircle } from "@phosphor-icons/react";
import { listExpenses, listCategories, listGoals, getRunway } from "./api";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import GoalsPanel from "./components/GoalsPanel";
import RunwayPlanner from "./components/RunwayPlanner";
import VoiceExpenseInput from "./components/VoiceExpenseInput";
import AskSuma from "./components/AskSuma";

// The local calendar date as YYYY-MM-DD. Not toISOString(), which converts to
// UTC and hands you yesterday's date all evening in Mexico City.
function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function emptyExpense() {
  return {
    amount: "", currency: "MXN", description: "", category: "other",
    date: todayLocal(), input_method: "text", raw_input: "",
  };
}

// SUMA's mark: the one control-level place the brand gradient is allowed.
function BrandMark({ size = 28 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <Plus size={size * 0.5} weight="bold" />
    </span>
  );
}

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // The form lives here so voice and manual entry write to the same state.
  // One form, one save path -- not one per input method.
  const [form, setForm] = useState(emptyExpense);
  const [uncertain, setUncertain] = useState([]);
  const [isDraft, setIsDraft] = useState(false);
  // Progressive disclosure: the form appears when there is something to
  // review, or when the user asks to type. Manual entry is never removed.
  const [formOpen, setFormOpen] = useState(false);

  // Goals and runway are disclosed on demand rather than given a tab: the
  // design system rules out a permanent tab bar, and the conversation stays
  // the primary surface.
  const [goals, setGoals] = useState([]);
  const [runway, setRunway] = useState(null);
  const [planningOpen, setPlanningOpen] = useState(false);

  useEffect(() => {
    Promise.all([listExpenses(), listCategories(), listGoals(), getRunway()])
      .then(([expenseData, categoryData, goalData, runwayData]) => {
        setExpenses(expenseData);
        setCategories(categoryData);
        setGoals(goalData);
        setRunway(runwayData);
      })
      .catch(() => setLoadError("No pude conectarme con el servidor."))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch rather than splicing locally: the server decides the ordering
  // (-date, -created_at), so it stays the single source of truth.
  const refresh = () => listExpenses().then(setExpenses);

  // Saving an expense changes the observed average, so the runway is refreshed
  // alongside it -- the two are derived from the same records.
  const refreshPlanning = () =>
    Promise.all([listGoals(), getRunway()]).then(([goalData, runwayData]) => {
      setGoals(goalData);
      setRunway(runwayData);
    });

  // A draft only fills the form. Nothing is saved until the user submits it.
  function applyDraft(draft, missingFields) {
    setForm((current) => ({ ...current, ...draft }));
    setUncertain(missingFields);
    setIsDraft(true);
    setFormOpen(true);
  }

  function handleSaved() {
    // Clear entry-specific fields and drop back to manual text entry, so the
    // next expense isn't mislabelled as voice or inherit a stale transcript.
    setForm((current) => ({
      ...current, amount: "", description: "", input_method: "text", raw_input: "",
    }));
    setUncertain([]);
    setIsDraft(false);
    setFormOpen(false);
    refresh();
    refreshPlanning();
  }

  return (
    <div className="app">
      <header className="app-header">
        <p className="brand">
          <BrandMark />
          SUMA
        </p>
      </header>

      <main className="thread">
        {loading && <p className="loading">Un momento…</p>}

        {loadError && (
          <p className="field-message is-error" role="alert">
            <WarningCircle size={16} weight="fill" aria-hidden="true" />
            {loadError}
          </p>
        )}

        {!loading && !loadError && (
          <>
            {/* SUMA speaks on the background, not inside a card. */}
            <div className="greeting">
              <h1>Hola, soy SUMA</h1>
              <p>Cuéntame un gasto y yo me encargo del resto.</p>
            </div>

            <VoiceExpenseInput
              onDraft={applyDraft}
              onWriteInstead={() => setFormOpen(true)}
            />

            {formOpen ? (
              <ExpenseForm
                categories={categories}
                form={form}
                setForm={setForm}
                uncertain={uncertain}
                isDraft={isDraft}
                onSaved={handleSaved}
              />
            ) : (
              <button
                type="button"
                className="btn-ghost add-manually"
                onClick={() => setFormOpen(true)}
              >
                <Plus size={18} aria-hidden="true" /> Agregar un gasto a mano
              </button>
            )}

            <ExpenseList expenses={expenses} onDeleted={refresh} />

            {planningOpen ? (
              <div className="planning">
                <GoalsPanel goals={goals} onChanged={refreshPlanning} />
                {runway && <RunwayPlanner data={runway} onChanged={refreshPlanning} />}
                <AskSuma />
              </div>
            ) : (
              <button
                type="button"
                className="btn-ghost add-inline"
                onClick={() => setPlanningOpen(true)}
              >
                <Target size={18} aria-hidden="true" /> Metas y cuánto me dura el dinero
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
