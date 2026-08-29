"use client";

import { useState } from "react";
import type { PeriodData } from "@/lib/metrics";
import { formatAmount, formatAmountCompact } from "@/lib/format";

type Period = "week" | "month" | "year";

const TABS: { key: Period; label: string }[] = [
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "year", label: "Este año" },
];

const HEIGHT = 140;

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
  const showLabels = data.bars.length <= 12;

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
        className="weekday-chart"
        role="img"
        aria-label={`Gasto por ${period === "week" ? "día" : period === "month" ? "día del mes" : "mes"}, total $${formatAmount(data.total)}`}
      >
        {data.bars.map((bar, i) => {
          const barHeight = bar.total > 0 ? Math.max((bar.total / max) * HEIGHT, 4) : 0;
          return (
            <div className="weekday-chart__col" key={`${bar.label}-${i}`}>
              <span className="weekday-chart__value">
                {showLabels && bar.total > 0 ? `$${formatAmountCompact(bar.total)}` : ""}
              </span>
              <div className="weekday-chart__track" style={{ height: HEIGHT }}>
                <div className="weekday-chart__bar" style={{ height: barHeight }} />
              </div>
              <span className="weekday-chart__label">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
