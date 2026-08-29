/**
 * Insights: total del periodo, tendencia, resumen, reparto por categoria e
 * historial completo. Es una sola pantalla desplazable — el listado del final
 * es lo que se ve en assets/screenshots/Container4.png.
 *
 * Cada cifra sale de `lib/metrics`; ninguna la produce un modelo.
 */

import { SectionLabel } from "../components/primitives";
import { BarChart, CategoryBreakdown, InsightCard, TransactionList } from "../components/data";
import { useStore } from "../state/store";
import { approxMoney } from "../lib/money";
import { insightsFor, periodComparison } from "../lib/insights";
import {
  PERIOD_LABEL, PERIOD_TOTAL_LABEL, breakdown, recent, series, totalSpent,
} from "../lib/metrics";
import type { Period } from "../lib/metrics";

const OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "week", label: PERIOD_LABEL.week },
  { value: "month", label: PERIOD_LABEL.month },
  { value: "year", label: PERIOD_LABEL.year },
];

export function Insights() {
  const { data, period, setPeriod, deleteExpense, simulated } = useStore();
  const now = new Date();

  const total = totalSpent(data.expenses, period, now);
  const chart = series(data.expenses, period, now);
  const slices = breakdown(data.expenses, period, now);
  const cards = insightsFor(data.expenses, period, now);
  const comparison = periodComparison(data.expenses, period, now);
  const list = recent(data.expenses, 40);

  return (
    <div className="insights">
      <section className="insights__total">
        <p className="section-label">{PERIOD_TOTAL_LABEL[period]}</p>
        {/* Figma usa el token amount-lg (34/38), no display: medido en
            Container3.png, donde "~$16,150" ocupa 149px de ancho. */}
        <p className="amount-lg tabular">{approxMoney(total)}</p>
      </section>

      <div className="segmented" role="tablist" aria-label="Periodo">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={o.value === period}
            className={`segmented__item${o.value === period ? " is-active" : ""}`}
            onClick={() => setPeriod(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {chart.length > 0 && (
        <BarChart
          data={chart}
          caption={comparison ?? `Gasto registrado ${PERIOD_LABEL[period].toLowerCase()}`}
        />
      )}

      {cards.length > 0 && (
        <section className="insights__section">
          <SectionLabel>Resumen</SectionLabel>
          <div className="insights__cards">
            {cards.map((c) => (
              <InsightCard key={c.id} tone={c.tone}>{c.text}</InsightCard>
            ))}
          </div>
        </section>
      )}

      {slices.length > 0 && (
        <section className="insights__section">
          <SectionLabel>Por categoría</SectionLabel>
          <CategoryBreakdown slices={slices} />
        </section>
      )}

      <section className="insights__section">
        <SectionLabel>Registros recientes</SectionLabel>
        {list.length === 0 ? (
          <p className="empty-inline">Todavía no hay registros. Cuéntale un gasto a Suma y aparecerá aquí.</p>
        ) : (
          <TransactionList
            items={list}
            onSelect={(e) => {
              if (window.confirm(`¿Eliminar «${e.description}»? Esta acción no se puede deshacer.`)) {
                deleteExpense(e.id);
              }
            }}
          />
        )}
      </section>

      {simulated && (
        <p className="insights__demo">
          Datos de demostración generados localmente. No provienen de ninguna cuenta real.
        </p>
      )}
    </div>
  );
}
