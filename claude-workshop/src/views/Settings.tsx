/**
 * Ajustes: contexto financiero opcional y control sobre los datos.
 *
 * El perfil es opcional y editable (CLAUDE.md §12): se puede usar Suma sin
 * llenar nada. Lo que se declara aqui es lo unico que la orientacion
 * financiera considera; si falta, Suma lo dice en vez de suponerlo.
 */

import { X } from "@phosphor-icons/react";
import { Button } from "../components/primitives";
import { useStore } from "../state/store";

export function Settings() {
  const { settingsOpen, setSettingsOpen, resetData, data } = useStore();
  if (!settingsOpen) return null;

  const profile = data.profile;

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="sheet__head">
          <p className="section-label" id="settings-title">Ajustes</p>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Cerrar ajustes" onClick={() => setSettingsOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <p className="sheet__section">Contexto financiero</p>
        <p className="sheet__hint">
          Opcional. Suma solo lo usa para calcular escenarios y siempre explica sus supuestos.
        </p>

        <dl className="kv">
          <div><dt>Ingreso mensual</dt><dd className="tabular">{fmt(profile.monthlyIncome)}</dd></div>
          <div><dt>Ahorros</dt><dd className="tabular">{fmt(profile.savings)}</dd></div>
          <div><dt>Gastos fijos</dt><dd className="tabular">{fmt(profile.fixedMonthlyExpenses)}</dd></div>
        </dl>
        <p className="sheet__hint">
          La edición del perfil desde la interfaz todavía no está implementada; hoy estos valores
          vienen de los datos de demostración.
        </p>

        <p className="sheet__section">Datos</p>
        <p className="sheet__hint">
          Todo se guarda solo en este navegador. No hay cuenta ni servidor.
        </p>
        <div className="sheet__actions sheet__actions--stack">
          <Button variant="ghost" onClick={() => resetData("demo")}>Restaurar datos de demostración</Button>
          <Button variant="ghost" onClick={() => resetData("empty")}>Empezar de cero</Button>
        </div>
      </div>
    </div>
  );
}

function fmt(value?: number): string {
  return value === undefined ? "No lo has dicho" : `$${value.toLocaleString("es-MX")}`;
}
