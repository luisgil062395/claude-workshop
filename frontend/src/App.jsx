import { useEffect, useState } from "react";
import { listExpenses, listCategories } from "./api";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import VoiceExpenseInput from "./components/VoiceExpenseInput";

// The local calendar date as YYYY-MM-DD. Not toISOString(), which converts to
// UTC and hands you yesterday's date all evening in Mexico City.
function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function emptyExpense() {
  return {
    amount: "",
    currency: "MXN",
    description: "",
    category: "other",
    date: todayLocal(),
    input_method: "text",
    raw_input: "",
  };
}

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // The form lives here so both manual entry and voice extraction write to the
  // same state. There is one form and one save path, not one per input method.
  const [form, setForm] = useState(emptyExpense);
  const [uncertain, setUncertain] = useState([]);

  useEffect(() => {
    Promise.all([listExpenses(), listCategories()])
      .then(([expenseData, categoryData]) => {
        setExpenses(expenseData);
        setCategories(categoryData);
      })
      .catch(() => setLoadError("No se pudo conectar con el servidor."))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch rather than splicing locally: the server decides the ordering
  // (-date, -created_at), so it stays the single source of truth.
  const refresh = () => listExpenses().then(setExpenses);

  // A draft only fills the form. Nothing is saved until the user submits it.
  function applyDraft(draft, missingFields) {
    setForm((current) => ({ ...current, ...draft }));
    setUncertain(missingFields);
  }

  function handleSaved() {
    // Clear the entry-specific fields and drop back to manual text entry, so
    // the next expense isn't mislabelled as voice or inherit a stale transcript.
    setForm((current) => ({
      ...current,
      amount: "",
      description: "",
      input_method: "text",
      raw_input: "",
    }));
    setUncertain([]);
    refresh();
  }

  return (
    <div className="app">
      <header>
        <h1>SUMA</h1>
        <p className="tagline">Entender tu dinero debería ser tan fácil como contarlo.</p>
      </header>

      <main>
        {loading && <p>Cargando...</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && (
          <>
            <div className="entry">
              <VoiceExpenseInput onDraft={applyDraft} />
              <ExpenseForm
                categories={categories}
                form={form}
                setForm={setForm}
                uncertain={uncertain}
                onSaved={handleSaved}
              />
            </div>
            <ExpenseList expenses={expenses} onDeleted={refresh} />
          </>
        )}
      </main>
    </div>
  );
}
