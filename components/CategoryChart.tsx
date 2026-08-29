import type { CategoryBreakdown } from "@/lib/metrics";

export function CategoryChart({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  if (breakdown.length === 0) {
    return null;
  }

  return (
    <table>
      <caption>Gasto por categoría (este mes)</caption>
      <thead>
        <tr>
          <th scope="col">Categoría</th>
          <th scope="col">Total</th>
          <th scope="col">Porcentaje</th>
        </tr>
      </thead>
      <tbody>
        {breakdown.map((row) => (
          <tr key={row.category}>
            <th scope="row">{row.category}</th>
            <td>${row.total.toFixed(2)}</td>
            <td>
              <div className="category-bar">
                <div
                  className="category-bar__fill"
                  style={{ width: `${row.percentage}%` }}
                />
                <span>{row.percentage}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
