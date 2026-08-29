import { useEffect, useState } from "react";
import { listExpenses, listCategories } from "./api";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
            <ExpenseForm categories={categories} onSaved={refresh} />
            <ExpenseList expenses={expenses} onDeleted={refresh} />
          </>
        )}
      </main>
    </div>
  );
}
