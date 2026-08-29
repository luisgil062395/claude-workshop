/**
 * Componentes de datos: control segmentado, grafica de barras, reparto por
 * categoria, tarjetas de insight y fila de transaccion.
 *
 * Reglas no negociables del design system que se aplican aqui:
 *  - toda grafica lleva la frase que la interpreta y etiquetas directas;
 *  - el monto va en tinta primaria; el color vive en el identificador;
 *  - el ingreso lleva signo "+" y etiqueta, nunca solo color;
 *  - cada serie tiene equivalente textual para lectores de pantalla.
 */

import type { ReactNode } from "react";
import { ArrowUpRight, Lightbulb } from "@phosphor-icons/react";
import type { BarPoint, BreakdownSlice, Expense } from "../lib/types";
import { category, emojiFor } from "../lib/categories";
import { money, percent, signedMoney } from "../lib/money";
import { relativeDay, timeOf } from "../lib/dates";
import { isIncome } from "../lib/metrics";
import { Tag } from "./primitives";

/* ------------------------------------------------------ control segmentado */

export function SegmentedControl<T extends string>({
  value, options, onChange, label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`segmented__item${o.value === value ? " is-active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ grafica barras */

/**
 * Barras con esquinas superiores redondeadas. La ultima —el periodo en curso—
 * se destaca con el gradiente de datos; el resto en `--border`.
 */
export function BarChart({ data, caption }: { data: BarPoint[]; caption: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure className="barchart">
      <div className="barchart__plot" role="img"
           aria-label={`${caption.replace(/\.$/, "")}. ${data.map((d) => `${d.label}: ${money(d.value)}`).join(". ")}`}>
        {data.map((d, i) => (
          <div key={d.label} className="barchart__col">
            <div
              className={`barchart__bar${i === data.length - 1 ? " is-current" : ""}`}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="barchart__labels" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.label} className={i === data.length - 1 ? "is-current" : undefined}>{d.label}</span>
        ))}
      </div>
      {/* Equivalente textual: ninguna gráfica se comunica solo con forma. */}
      <figcaption className="sr-only">
        {data.map((d) => `${d.label}: ${money(d.value)}`).join(". ")}
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------- reparto categoria */

/**
 * Top 4 categorias y el resto agrupado en "Otros" — es el reparto de cinco
 * filas del diseno. Cada fila lleva punto de color, etiqueta y porcentaje:
 * el color nunca es el unico portador de significado.
 */
export function CategoryBreakdown({ slices }: { slices: BreakdownSlice[] }) {
  if (slices.length === 0) return null;

  let rows = slices;
  if (slices.length > 5) {
    const head = slices.slice(0, 4);
    const restValue = slices.slice(4).reduce((s, x) => s + x.value, 0);
    const restShare = slices.slice(4).reduce((s, x) => s + x.share, 0);
    rows = [...head, {
      category: "other", label: "Otros", value: restValue, share: restShare,
      colorVar: "--chart-4",
    }];
  }

  return (
    <ul className="breakdown">
      {rows.map((s) => (
        <li key={s.label} className="breakdown__row">
          <span className="breakdown__dot" style={{ background: `var(${s.colorVar})` }} aria-hidden="true" />
          <span className="breakdown__label">{s.label}</span>
          <span className="breakdown__value tabular">{percent(s.share)}</span>
          <span className="sr-only">{money(s.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ insight cards */

export function InsightCard({ tone, children }: { tone: "neutral" | "ai"; children: ReactNode }) {
  return (
    <div className={`insight insight--${tone}`}>
      <span className="insight__icon" aria-hidden="true">
        {tone === "ai" ? <Lightbulb size={16} weight="regular" /> : <ArrowUpRight size={16} weight="bold" />}
      </span>
      <p className="insight__text">{children}</p>
    </div>
  );
}

/* --------------------------------------------------------- fila transaccion */

/** Estado visible de un registro. Deriva de los datos, no es un campo suelto. */
function statusOf(e: Expense): string | null {
  if (e.uncertainFields?.length) return "Pendiente";
  if (e.recurring) return "Recurrente";
  if (e.editedByUser) return "Editado";
  return null;
}

export function TransactionRow({
  expense, onSelect,
}: { expense: Expense; onSelect?: (e: Expense) => void }) {
  const income = isIncome(expense);
  const cat = category(expense.category);
  const day = relativeDay(expense.date);
  const parts = [day];
  if (day === "Hoy") parts.push(timeOf(expense.createdAt));
  parts.push(cat.label);
  const extra = expense.location?.name ?? expense.note;
  if (extra) parts.push(extra);

  const status = statusOf(expense);
  const amount = signedMoney(expense.amount, income, expense.currency);
  const Row = onSelect ? "button" : "div";

  return (
    <Row
      className="tx"
      {...(onSelect ? { type: "button" as const, onClick: () => onSelect(expense) } : {})}
    >
      <span className="tx__avatar" aria-hidden="true">{emojiFor(expense.description, expense.category)}</span>
      <span className="tx__body">
        <span className="tx__title">
          <span className="tx__name">{expense.description}</span>
          {status && <Tag>{status}</Tag>}
        </span>
        <span className="tx__meta">{parts.join(" · ")}</span>
      </span>
      <span className={`tx__amount tabular${income ? " is-income" : ""}`}>{amount}</span>
    </Row>
  );
}

export function TransactionList({
  items, onSelect,
}: { items: Expense[]; onSelect?: (e: Expense) => void }) {
  return (
    <ul className="tx-list">
      {items.map((e) => (
        <li key={e.id}><TransactionRow expense={e} onSelect={onSelect} /></li>
      ))}
    </ul>
  );
}
