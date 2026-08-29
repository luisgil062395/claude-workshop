/**
 * Insights derivados de los gastos guardados.
 *
 * Reglas del producto (CLAUDE.md §17): especificos, respaldados por datos,
 * explicables y sin juicio. Si no hay datos suficientes para sostener una
 * afirmacion, el insight no se genera — no se rellena con generalidades.
 */

import type { Expense } from "./types";
import { MONTH_LONG, fromISODate } from "./dates";
import { money, percent } from "./money";
import {
  type Period, breakdown, breakdownRange, categoryTotal, previousPeriodDelta,
  previousWindow, series, spending, inPeriod,
} from "./metrics";

export type InsightTone = "neutral" | "ai";

export type Insight = {
  id: string;
  tone: InsightTone;
  text: string;
};

/** Insights del periodo. Devuelve como maximo `limit`; puede devolver ninguno. */
export function insightsFor(list: Expense[], period: Period, now = new Date(), limit = 2): Insight[] {
  const out: Insight[] = [];
  const items = spending(inPeriod(list, period, now));
  if (items.length === 0) return out;

  // 1 · El periodo con mayor gasto dentro de la serie.
  const s = series(list, period, now);
  const peak = s.reduce((a, b) => (b.value > a.value ? b : a), s[0]);
  if (peak && peak.value > 0 && s.length > 1) {
    if (period === "year") {
      const monthIdx = s.indexOf(peak);
      const name = cap(MONTH_LONG.format(new Date(now.getFullYear(), monthIdx, 1)));
      out.push({ id: "peak", tone: "neutral", text: `${name} es tu mes de mayor gasto este año.` });
    } else if (period === "month") {
      out.push({ id: "peak", tone: "neutral", text: `La ${peak.label} fue tu semana de mayor gasto: ${money(peak.value)}.` });
    } else {
      out.push({ id: "peak", tone: "neutral", text: `${peak.label} fue tu día de mayor gasto: ${money(peak.value)}.` });
    }
  }

  // 2 · Categoria que mas cambio contra el periodo anterior.
  const moved = biggestCategoryMove(list, period, now);
  if (moved) {
    const dir = moved.share < 0 ? "Redujiste" : "Aumentaste";
    const ref = period === "year" ? "el año pasado" : period === "month" ? "el mes pasado" : "la semana pasada";
    out.push({
      id: "move",
      tone: "ai",
      text: `${dir} ${moved.label.toLowerCase()} un ${percent(Math.abs(moved.share))} vs. ${ref}.`,
    });
  }

  // 3 · Reparto, cuando no hubo nada mas que decir.
  if (out.length < limit) {
    const top = breakdown(list, period, now)[0];
    if (top) {
      out.push({
        id: "top",
        tone: "ai",
        text: `${top.label} concentra el ${percent(top.share)} de tu gasto: ${money(top.value)}.`,
      });
    }
  }

  return out.slice(0, limit);
}

/** Categoria con la mayor variacion relativa contra la ventana equivalente. */
function biggestCategoryMove(list: Expense[], period: Period, now = new Date()) {
  const { from, to } = previousWindow(period, now);
  const current = breakdown(list, period, now);
  const previous = breakdownRange(list, from, to);
  if (previous.length === 0) return null;

  let best: { label: string; share: number } | null = null;
  for (const c of current) {
    const p = previous.find((x) => x.category === c.category);
    if (!p || p.value < 200) continue;              // base demasiado chica para afirmar nada
    const share = (c.value - p.value) / p.value;
    if (Math.abs(share) < 0.1) continue;            // cambio no significativo
    if (!best || Math.abs(share) > Math.abs(best.share)) best = { label: c.label, share };
  }
  return best;
}

/**
 * Insight sobre una categoria concreta, para anidar en la respuesta del chat
 * despues de guardar un gasto. Devuelve null si no hay con que compararlo.
 */
export function categoryInsight(
  list: Expense[], expense: Expense, now = new Date(),
): string | null {
  const cat = expense.category;
  if (cat === "income") return null;

  const cur = categoryTotal(list, cat, "month", now);
  if (cur.count < 2) return null;

  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prev = categoryTotal(list, cat, "month", prevEnd);
  const label = breakdown(list, "month", now).find((b) => b.category === cat)?.label ?? "esta categoría";

  if (prev.value > 0) {
    const share = (cur.value - prev.value) / prev.value;
    if (Math.abs(share) >= 0.1) {
      const dir = share > 0 ? "más" : "menos";
      return `Llevas ${money(cur.value)} en ${label.toLowerCase()} este mes, ${percent(Math.abs(share))} ${dir} que el mes pasado.`;
    }
  }
  return `Llevas ${money(cur.value)} en ${label.toLowerCase()} este mes, en ${cur.count} registros.`;
}

/** Comparacion legible del periodo contra el anterior. Null si no hay base. */
export function periodComparison(list: Expense[], period: Period, now = new Date()): string | null {
  const { previous, share } = previousPeriodDelta(list, period, now);
  if (previous <= 0 || share === null) return null;
  const ref = period === "year" ? "del año pasado" : period === "month" ? "del mes pasado" : "de la semana pasada";
  const dir = share > 0 ? "arriba" : "abajo";
  return `Vas ${percent(Math.abs(share))} ${dir} ${ref}.`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const monthOf = (iso: string) => fromISODate(iso).getMonth();
