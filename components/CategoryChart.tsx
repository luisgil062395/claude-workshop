import type { CategoryBreakdown } from "@/lib/metrics";
import { CATEGORY_NAMES, CATEGORY_COLORS } from "@/lib/categories";
import { formatAmount } from "@/lib/format";
import { CategoryIcon } from "@/components/CategoryIcon";

export function CategoryChart({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  if (breakdown.length === 0) {
    return null;
  }

  return (
    <div className="category-bars" aria-label="Gasto por categoría este mes">
      {breakdown.map((row) => (
        <div className="category-bars__row" key={row.category}>
          <span
            className="category-bars__label"
            style={{ color: CATEGORY_COLORS[row.category] ?? "#6B7280" }}
          >
            <CategoryIcon category={row.category} size={16} />
          </span>
          <span className="category-bars__name">
            {CATEGORY_NAMES[row.category] ?? row.category}
          </span>
          <div className="category-bar">
            <div
              className="category-bar__fill"
              style={{
                width: `${row.percentage}%`,
                background: CATEGORY_COLORS[row.category] ?? "var(--color-brand-green)",
              }}
            />
          </div>
          <span className="category-bars__value">
            −${formatAmount(row.total)}
            <span>{row.percentage}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}
