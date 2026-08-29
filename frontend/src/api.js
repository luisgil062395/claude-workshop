// Every call to Django lives here. One file to change when the API changes,
// and one place to look when a request misbehaves.

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    // DRF returns {field: ["mensaje"]} on validation errors. Pass it through
    // so the form can show the message next to the field that caused it.
    let detail;
    try {
      detail = await response.json();
    } catch {
      detail = { detail: `Error ${response.status}` };
    }
    const error = new Error("Request failed");
    error.fields = detail;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

export const listExpenses = () => request("/expenses/");
export const listCategories = () => request("/categories/");
export const createExpense = (expense) =>
  request("/expenses/", { method: "POST", body: JSON.stringify(expense) });
export const deleteExpense = (id) =>
  request(`/expenses/${id}/`, { method: "DELETE" });

// Interprets natural language into an UNSAVED draft. Saving is a separate,
// explicit call to createExpense().
export const extractExpense = (text, inputMethod) =>
  request("/extract/", {
    method: "POST",
    body: JSON.stringify({ text, input_method: inputMethod }),
  });

// ---- Goals and runway -------------------------------------------------
// Every figure in these responses is computed in Django. The frontend only
// formats and displays -- it never does financial arithmetic.

export const listGoals = () => request("/goals/");
export const createGoal = (goal) =>
  request("/goals/", { method: "POST", body: JSON.stringify(goal) });
export const updateGoal = (id, changes) =>
  request(`/goals/${id}/`, { method: "PATCH", body: JSON.stringify(changes) });
export const deleteGoal = (id) =>
  request(`/goals/${id}/`, { method: "DELETE" });

export const getRunway = () => request("/runway/");
export const saveRunway = (plan) =>
  request("/runway/", { method: "PUT", body: JSON.stringify(plan) });

// Asks a question about the user's money. Every figure in the answer was
// computed by Django first -- Claude only phrases the result.
export const askSuma = (question) =>
  request("/ask/", { method: "POST", body: JSON.stringify({ question }) });
