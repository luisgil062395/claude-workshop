"use client";

import { useState } from "react";
import type { DailyTotal } from "@/lib/metrics";

const WIDTH = 640;
const HEIGHT = 120;
const PADDING_X = 8;
const PADDING_Y = 8;
const BAR_MAX_THICKNESS = 16;

function formatDayLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(day)} ${months[Number(month) - 1]}`;
}

export function TransactionFrequency({ daily }: { daily: DailyTotal[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (daily.length === 0) return null;

  const max = Math.max(...daily.map((d) => d.count), 1);
  const slot = (WIDTH - PADDING_X * 2) / daily.length;
  const barWidth = Math.min(slot - 2, BAR_MAX_THICKNESS);
  const baseline = HEIGHT - PADDING_Y;

  const bars = daily.map((d, i) => {
    const x = PADDING_X + i * slot + (slot - barWidth) / 2;
    const barHeight = (d.count / max) * (HEIGHT - PADDING_Y * 2);
    const y = baseline - barHeight;
    return { x, y, barHeight, ...d };
  });

  const hovered = hoverIndex !== null ? bars[hoverIndex] : null;

  return (
    <div className="trend-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Número de transacciones por día, últimos ${daily.length} días`}
        className="trend-chart__svg"
      >
        <line x1={PADDING_X} y1={baseline} x2={WIDTH - PADDING_X} y2={baseline} className="trend-chart__baseline" />

        {bars.map((bar, i) => (
          <rect
            key={bar.date}
            x={bar.x}
            y={bar.y}
            width={barWidth}
            height={Math.max(bar.barHeight, bar.count > 0 ? 3 : 0)}
            rx={4}
            className={i === hoverIndex ? "freq-bar freq-bar--active" : "freq-bar"}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </svg>

      {hovered && (
        <div className="trend-chart__tooltip" role="status">
          {formatDayLabel(hovered.date)}: {hovered.count} {hovered.count === 1 ? "transacción" : "transacciones"}
        </div>
      )}
    </div>
  );
}
