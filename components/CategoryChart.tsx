import type { CategoryBreakdown } from "@/lib/metrics";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatAmount } from "@/lib/format";

export function CategoryChart({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  if (breakdown.length === 0) {
    return null;
  }

  return (
    <div className="category-bars" aria-label="Gasto por categoría este mes">
      {breakdown.map((row) => (
        <div className="category-bars__row" key={row.category}>
          <span className="category-bars__label">
            {CATEGORY_LABELS[row.category] ?? row.category}
          </span>
          <div className="category-bar">
            <div className="category-bar__fill" style={{ width: `${row.percentage}%` }} />
          </div>
          <span className="category-bars__value">
            ${formatAmount(row.total)}
            <span>{row.percentage}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}
