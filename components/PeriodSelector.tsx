"use client";

import { useState } from "react";
import type { PeriodData } from "@/lib/metrics";
import { formatAmount } from "@/lib/format";

type Period = "week" | "month" | "year";

const TABS: { key: Period; label: string }[] = [
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "year", label: "Este año" },
];

export function PeriodSelector({
  week,
  month,
  year,
}: {
  week: PeriodData;
  month: PeriodData;
  year: PeriodData;
}) {
  const [period, setPeriod] = useState<Period>("week");
  const data = period === "week" ? week : period === "month" ? month : year;
  const max = Math.max(...data.bars.map((b) => b.total), 1);

  return (
    <div className="period-selector">
      <p className="eyebrow">Total {TABS.find((t) => t.key === period)?.label.toLowerCase()}</p>
      <p className="period-selector__total">${formatAmount(data.total)}</p>

      <div className="period-selector__tabs" role="tablist" aria-label="Periodo">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={period === tab.key}
            className={
              period === tab.key
                ? "period-selector__tab period-selector__tab--active"
                : "period-selector__tab"
            }
            onClick={() => setPeriod(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="period-selector__chart"
        role="img"
        aria-label={`Gasto por ${period === "week" ? "día" : period === "month" ? "día del mes" : "mes"}, total $${formatAmount(data.total)}`}
      >
        {data.bars.map((bar, i) => (
          <div className="period-selector__col" key={`${bar.label}-${i}`}>
            <div
              className={
                i === data.bars.length - 1
                  ? "period-selector__bar period-selector__bar--current"
                  : "period-selector__bar"
              }
              style={{ height: `${Math.max((bar.total / max) * 100, bar.total > 0 ? 4 : 0)}%` }}
            />
            {data.bars.length <= 12 && (
              <span className="period-selector__col-label">{bar.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
