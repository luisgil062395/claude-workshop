import { useEffect, useRef, useState } from "react";
import { Microphone, PencilSimple, Stop, WarningCircle } from "@phosphor-icons/react";
import { extractExpense } from "../api";

// Feature detection at module load. Firefox has no support at all, so the mic
// control is not offered there rather than offered and then failing.
const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

// The canonical voice states. Every one has visible text: the state is
// understandable with the sound off, with a screen reader, or without
// perceiving colour. Animation never carries meaning on its own.
const STATES = {
  idle:          { label: "Toca para hablar",     tone: "resting" },
  listening:     { label: "Te escucho…",          tone: "active" },
  transcribing:  { label: "Transcribiendo…",      tone: "active" },
  extracting:    { label: "Entendiendo…",         tone: "active" },
  review:        { label: "Revisa lo que entendí", tone: "done" },
  error:         { label: "No te escuché bien",   tone: "error" },
  cancelled:     { label: "Cancelado",            tone: "resting" },
};

// Recognition error codes → plain Spanish. Anything unlisted falls through to
// a generic message rather than showing the user a raw error code.
const RECOGNITION_ERRORS = {
  "not-allowed":
    "No diste permiso al micrófono. Puedes activarlo en tu navegador o escribir el gasto.",
  "service-not-allowed":
    "Tu navegador bloqueó el reconocimiento de voz. Puedes escribir el gasto.",
  "no-speech": "No te escuché bien. Intenta de nuevo o escríbelo.",
  "audio-capture": "No encontré un micrófono disponible. Puedes escribir el gasto.",
  network: "Falló la conexión del reconocimiento de voz. Puedes escribir el gasto.",
};

export default function VoiceExpenseInput({ onDraft, onWriteInstead }) {
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  // Whether the current transcript came from speech. Editing a spoken
  // transcript is still voice-originated; typing one from scratch is not.
  const [source, setSource] = useState("text");

  const recognitionRef = useRef(null);
  // Lets onend tell a user cancellation from a natural end, so a cancel
  // doesn't trigger extraction.
  const cancelledRef = useRef(false);

  // Stop any live recognition if the component goes away mid-listen.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  async function runExtraction(text, inputMethod) {
    const clean = text.trim();
    if (!clean) return;

    setPhase("extracting");
    setError("");
    setNotes("");
    try {
      const draft = await extractExpense(clean, inputMethod);
      const { missing_fields: missing, notes: draftNotes, ...fields } = draft;
      onDraft(fields, missing || []);
      if (draftNotes) setNotes(draftNotes);
      setPhase("review");
    } catch (requestError) {
      // The transcript stays on screen and the form is untouched, so nothing
      // the user said is lost.
      setError(
        requestError.fields?.detail ||
          "No pude interpretar el texto. Revisa tu conexión o escribe el gasto."
      );
      setPhase("error");
    }
  }

  function startListening() {
    setError("");
    setNotes("");
    setTranscript("");
    setInterim("");
    setSource("text");
    cancelledRef.current = false;

    // Constructed only now: this click is what asks for microphone access.
    // Nothing requests the microphone on page load.
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = "";

    recognition.onstart = () => setPhase("listening");

    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else pending += result[0].transcript;
      }
      setTranscript(finalText);
      setInterim(pending);
      setSource("voice");
      if (finalText) setPhase("transcribing");
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") return; // the user pressed Cancelar
      setError(
        RECOGNITION_ERRORS[event.error] ||
          "No pude reconocer la voz. Puedes escribir el gasto."
      );
      setPhase("error");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setInterim("");
      if (cancelledRef.current) {
        setPhase("cancelled");
        return;
      }
      if (finalText.trim()) runExtraction(finalText, "voice");
      else setPhase((current) => (current === "listening" ? "error" : current));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError("No pude iniciar el micrófono. Puedes escribir el gasto.");
      setPhase("error");
    }
  }

  function cancel() {
    cancelledRef.current = true;
    recognitionRef.current?.stop();
  }

  const listening = phase === "listening" || phase === "transcribing";
  const busy = phase === "extracting";
  const state = STATES[phase];

  return (
    <section className="voice" aria-labelledby="voice-heading">
      <h2 id="voice-heading" className="visually-hidden">
        Registrar un gasto por voz
      </h2>

      <div className="voice-stage">
        {SpeechRecognition ? (
          <button
            type="button"
            className={`voice-button is-${state.tone}`}
            onClick={listening ? cancel : startListening}
            disabled={busy}
            aria-label={listening ? "Detener la grabación" : "Hablar para registrar un gasto"}
          >
            {listening ? (
              <Stop size={28} weight="fill" aria-hidden="true" />
            ) : (
              <Microphone size={28} weight={busy ? "fill" : "regular"} aria-hidden="true" />
            )}
          </button>
        ) : (
          <p className="voice-unsupported">
            Tu navegador no permite dictar. Escribe el gasto y yo lo interpreto.
          </p>
        )}

        {/* Single announcement point for every voice state. Text always
            present -- never animation or colour alone. */}
        <p className="voice-state" role="status" aria-live="polite">
          {state.label}
        </p>

        {interim && (
          <p className="voice-interim" aria-hidden="true">
            {interim}
          </p>
        )}

        {/* Cancelar and "Escribirlo" are always reachable. */}
        <div className="voice-actions">
          {listening && (
            <button type="button" className="btn-ghost" onClick={cancel}>
              Cancelar
            </button>
          )}
          {!listening && (
            <button type="button" className="btn-ghost" onClick={onWriteInstead}>
              <PencilSimple size={18} aria-hidden="true" /> Escribirlo
            </button>
          )}
        </div>
      </div>

      <div className="field voice-transcript">
        <label htmlFor="transcript">Transcripción</label>
        <textarea
          id="transcript"
          rows={2}
          value={transcript}
          onChange={(event) => {
            // Typing into an empty box means this is typed, not dictated.
            if (!transcript) setSource("text");
            setTranscript(event.target.value);
          }}
          placeholder="Ej. Ayer gasté 180 pesos en Costco"
          aria-describedby="transcript-help"
        />
        <p className="field-hint" id="transcript-help">
          Puedes corregir el texto y volver a interpretarlo. Nada se guarda hasta
          que tú lo confirmes.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => runExtraction(transcript, source)}
          disabled={busy || listening || !transcript.trim()}
        >
          {busy && <span className="spinner" aria-hidden="true" />}
          {busy ? "Entendiendo…" : "Interpretar"}
        </button>
      </div>

      {notes && <p className="voice-note">{notes}</p>}

      {error && (
        <p className="field-message is-error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          {error}
        </p>
      )}
    </section>
  );
}
