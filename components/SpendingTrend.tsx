"use client";

import { useId, useState } from "react";
import type { DailyTotal } from "@/lib/metrics";

const WIDTH = 640;
const HEIGHT = 160;
const PADDING_X = 8;
const PADDING_Y = 16;

function formatDayLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(day)} ${months[Number(month) - 1]}`;
}

export function SpendingTrend({ daily }: { daily: DailyTotal[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  if (daily.length === 0) return null;

  const max = Math.max(...daily.map((d) => d.total), 1);
  const stepX = (WIDTH - PADDING_X * 2) / Math.max(daily.length - 1, 1);

  const points = daily.map((d, i) => {
    const x = PADDING_X + i * stepX;
    const y = HEIGHT - PADDING_Y - (d.total / max) * (HEIGHT - PADDING_Y * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${HEIGHT - PADDING_Y} L${points[0].x},${HEIGHT - PADDING_Y} Z`;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = Math.round((relativeX - PADDING_X) / stepX);
    setHoverIndex(Math.min(Math.max(index, 0), points.length - 1));
  }

  return (
    <div className="trend-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Gasto diario de los últimos ${daily.length} días`}
        className="trend-chart__svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-green)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-brand-green)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={PADDING_X}
          y1={HEIGHT - PADDING_Y}
          x2={WIDTH - PADDING_X}
          y2={HEIGHT - PADDING_Y}
          className="trend-chart__baseline"
        />

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} className="trend-chart__line" fill="none" />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={PADDING_Y / 2}
              x2={hovered.x}
              y2={HEIGHT - PADDING_Y}
              className="trend-chart__crosshair"
            />
            <circle cx={hovered.x} cy={hovered.y} r="6" className="trend-chart__dot-ring" />
            <circle cx={hovered.x} cy={hovered.y} r="4" className="trend-chart__dot" />
          </>
        )}

        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div className="trend-chart__tooltip" role="status">
          {formatDayLabel(hovered.date)}: ${hovered.total.toFixed(2)}
        </div>
      )}
    </div>
  );
}
