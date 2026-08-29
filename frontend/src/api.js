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
