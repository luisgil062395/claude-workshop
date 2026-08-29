import type { WeekdayTotal } from "@/lib/metrics";

const HEIGHT = 140;
const BAR_WIDTH = 32;

export function WeekdaySpending({ breakdown }: { breakdown: WeekdayTotal[] }) {
  const max = Math.max(...breakdown.map((d) => d.total), 1);

  return (
    <div
      className="weekday-chart"
      role="img"
      aria-label="Gasto total por día de la semana, últimos 30 días"
    >
      {breakdown.map((day) => {
        const barHeight = day.total > 0 ? Math.max((day.total / max) * HEIGHT, 4) : 0;
        return (
          <div className="weekday-chart__col" key={day.weekday}>
            <span className="weekday-chart__value">
              {day.total > 0 ? `$${Math.round(day.total)}` : ""}
            </span>
            <div className="weekday-chart__track" style={{ height: HEIGHT }}>
              <div
                className="weekday-chart__bar"
                style={{ height: barHeight, width: BAR_WIDTH }}
              />
            </div>
            <span className="weekday-chart__label">{day.weekday}</span>
          </div>
        );
      })}
    </div>
  );
}
