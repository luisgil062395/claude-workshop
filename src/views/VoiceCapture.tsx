/**
 * Captura por voz.
 *
 * Los diez estados del design system, cada uno con TEXTO VISIBLE y anunciado
 * con aria-live: el estado se entiende con el sonido apagado, con lector de
 * pantalla o sin percibir color. La voz nunca es la unica salida — "Escribir"
 * y "Foto" estan siempre disponibles.
 */

import { useRef } from "react";
import { Gear, ImageSquare, TextAlignLeft, X } from "@phosphor-icons/react";
import { BrandMark } from "../components/primitives";
import { useStore } from "../state/store";
import { approxMoney } from "../lib/money";
import { totalSpent } from "../lib/metrics";
import { demoPhrase } from "../services/speech";

/** Texto visible por estado. Ningun estado se comunica solo con animación. */
const STATE_TEXT: Record<string, string> = {
  idle: "Toca para hablar",
  listening: "Te escucho…",
  recording: "Te escucho…",
  processing: "Procesando…",
  transcribing: "Escuchando…",
  interpreting: "Entendiendo…",
  saving: "Guardando…",
  saved: "Guardado",
  error: "No te escuché bien",
  cancelled: "Toca para hablar",
};

export function VoiceCapture() {
  const {
    data, voiceState, transcript, voiceSimulated,
    closeVoice, startListening, stopListening, receipt, setSettingsOpen,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const week = totalSpent(data.expenses, "week", new Date());
  const active = voiceState === "listening" || voiceState === "recording" || voiceState === "transcribing";
  const busy = voiceState === "interpreting" || voiceState === "processing";

  return (
    <div className="voice" role="dialog" aria-modal="true" aria-label="Registrar un gasto por voz">
      <div className="voice__subheader">
        <button type="button" className="icon-btn" aria-label="Cerrar" onClick={closeVoice}>
          <X size={20} />
        </button>
        <div className="voice__summary">
          <p className="voice__summary-label">Esta semana</p>
          <p className="voice__summary-amount tabular">{approxMoney(week)}</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Ajustes" onClick={() => setSettingsOpen(true)}>
          <Gear size={20} />
        </button>
      </div>

      <div className="voice__stage">
        <div className={`voice__dots${active ? " is-active" : ""}`} aria-hidden="true">
          <i /><i /><i /><i />
        </div>

        <p className="voice__state" role="status" aria-live="polite">
          {STATE_TEXT[voiceState] ?? STATE_TEXT.idle}
        </p>

        {transcript && <p className="voice__transcript">{transcript}</p>}

        {voiceState === "error" && (
          <p className="voice__recovery">
            Puedes intentarlo otra vez o escribirlo.
          </p>
        )}
      </div>

      <div className="voice__hint">
        {voiceState === "idle" && (
          <>
            <p className="voice__example">{demoPhrase()}</p>
            <p className="voice__example-sub">o escríbelo abajo</p>
          </>
        )}
        {voiceSimulated && voiceState === "idle" && (
          <p className="voice__sim">
            Este navegador no dicta: la transcripción será un ejemplo de demostración.
          </p>
        )}
      </div>

      <div className="voice__actions">
        <button type="button" className="voice__pill" onClick={closeVoice}>
          <TextAlignLeft size={18} weight="regular" aria-hidden="true" />
          Escribir
        </button>

        <button
          type="button"
          className={`voice__orb${active ? " is-active" : ""}`}
          onClick={active ? stopListening : startListening}
          disabled={busy}
          aria-label={active ? "Detener y guardar lo dicho" : "Tocar para hablar"}
        >
          <BrandMark size={30} white />
        </button>

        <button type="button" className="voice__pill" onClick={() => fileRef.current?.click()}>
          <ImageSquare size={18} weight="regular" aria-hidden="true" />
          Foto
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Subir foto de un recibo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void receipt(f);
          }}
        />
      </div>
    </div>
  );
}
