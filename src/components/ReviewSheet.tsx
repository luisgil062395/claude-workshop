/**
 * Revision antes de guardar (CLAUDE.md §11).
 *
 * Es el punto donde la persona mantiene el control: ve exactamente lo que Suma
 * entendio, cada campo es editable, y los campos que la IA no pudo determinar
 * aparecen marcados como pendientes en vez de rellenados con una suposicion.
 * Sin monto, concepto, categoria y fecha no se puede guardar.
 */

import { useEffect, useRef } from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useStore } from "../state/store";
import { CATEGORIES } from "../lib/categories";
import { money } from "../lib/money";
import { Button } from "./primitives";

const FIELD_LABEL: Record<string, string> = {
  amount: "monto", description: "concepto", category: "categoría",
  date: "fecha", tip: "propina", tax: "impuesto",
};

export function ReviewSheet() {
  const { review, updateDraft, saveDraft, cancelDraft } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!review) return;
    first.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cancelDraft();
      if (e.key !== "Tab" || !ref.current) return;
      const nodes = ref.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const list = Array.from(nodes).filter((n) => !n.hasAttribute("disabled"));
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [review, cancelDraft]);

  if (!review) return null;
  const { draft, notice } = review;

  const missing: string[] = [];
  if (draft.amount === null || draft.amount <= 0) missing.push("amount");
  if (!draft.description) missing.push("description");
  if (!draft.category) missing.push("category");
  if (!draft.date) missing.push("date");
  const canSave = missing.length === 0;

  // Con confianza baja Suma pregunta en vez de afirmar (§11).
  const unsure = draft.confidence < 0.7;
  const title = unsure ? "Creo que esto es…" : "Suma entendió";

  const pending = draft.uncertainFields
    .map((f) => FIELD_LABEL[f] ?? f)
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) cancelDraft(); }}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        ref={ref}
      >
        <div className="sheet__head">
          <p className="section-label" id="review-title">{title}</p>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Cerrar sin guardar" onClick={cancelDraft}>
            <X size={18} />
          </button>
        </div>

        {draft.receiptImage && (
          <img className="sheet__receipt" src={draft.receiptImage} alt="Recibo que subiste" />
        )}

        {notice && (
          <p className="sheet__notice" role="note">
            <WarningCircle size={16} weight="fill" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}

        <p className="sheet__amount amount-lg">
          {draft.amount !== null ? money(draft.amount, draft.currency) : "Sin monto"}
          <span className="sheet__currency"> {draft.currency}</span>
        </p>

        <div className="field">
          <label htmlFor="f-amount">Monto</label>
          <input
            id="f-amount" ref={first} type="number" inputMode="decimal" step="0.01" min="0"
            className={missing.includes("amount") ? "is-missing" : undefined}
            aria-describedby={missing.includes("amount") ? "f-amount-err" : undefined}
            value={draft.amount ?? ""}
            onChange={(e) => updateDraft({ amount: e.target.value === "" ? null : Number(e.target.value) })}
          />
          {missing.includes("amount") && (
            <p className="field__error" id="f-amount-err">
              <WarningCircle size={14} weight="fill" aria-hidden="true" /> Falta el monto para guardar
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="f-desc">Concepto</label>
          <input
            id="f-desc" type="text"
            className={missing.includes("description") ? "is-missing" : undefined}
            value={draft.description ?? ""}
            placeholder="Comercio o propósito"
            onChange={(e) => updateDraft({ description: e.target.value || null })}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="f-cat">Categoría</label>
            <select
              id="f-cat"
              className={missing.includes("category") ? "is-missing" : undefined}
              value={draft.category ?? ""}
              onChange={(e) => updateDraft({ category: (e.target.value || null) as typeof draft.category })}
            >
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-date">Fecha</label>
            <input
              id="f-date" type="date"
              value={draft.date ?? ""}
              onChange={(e) => updateDraft({ date: e.target.value || null })}
            />
          </div>
        </div>

        {pending.length > 0 && (
          <p className="sheet__pending">
            Sin confirmar: {pending.join(", ")}. Suma no los inventa; revísalos antes de guardar.
          </p>
        )}

        {draft.rawInput && (
          <p className="sheet__raw">Dijiste: «{draft.rawInput}»</p>
        )}

        <div className="sheet__actions">
          <Button variant="ghost" onClick={cancelDraft}>Cancelar</Button>
          <Button variant="primary" onClick={saveDraft} disabled={!canSave}>
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
