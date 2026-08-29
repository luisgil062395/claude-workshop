import { useEffect, useRef, useState } from "react";
import { extractExpense } from "../api";

// Feature detection at module load. Firefox has no support at all, so the mic
// button is hidden rather than offered and then failing.
const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

// CLAUDE.md section 22. "Revisión" is set by the parent once a draft lands.
const LABELS = {
  idle: "Listo",
  listening: "Escuchando...",
  transcribing: "Transcribiendo...",
  extracting: "Entendiendo...",
  done: "Revisión",
};

// Recognition error codes -> plain Spanish. Anything unlisted falls through to
// a generic message rather than showing the user a raw error code.
const RECOGNITION_ERRORS = {
  "not-allowed":
    "No diste permiso al micrófono. Puedes activarlo en tu navegador o escribir el gasto.",
  "service-not-allowed":
    "El navegador bloqueó el reconocimiento de voz. Puedes escribir el gasto.",
  "no-speech": "No escuché nada. Intenta de nuevo o escribe el gasto.",
  "audio-capture":
    "No se encontró un micrófono disponible. Puedes escribir el gasto.",
  network: "Falló la conexión del reconocimiento de voz. Puedes escribir el gasto.",
};

export default function VoiceExpenseInput({ onDraft }) {
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  // Whether the current transcript came from speech. Editing a spoken
  // transcript is still voice-originated; typing one from scratch is not.
  const [source, setSource] = useState("text");

  const recognitionRef = useRef(null);
  // Tracks whether the user pressed "Detener" so onend can tell a cancellation
  // from a natural end and skip extraction.
  const cancelledRef = useRef(false);

  // Stop any live recognition if the component goes away mid-listen.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  async function runExtraction(text, inputMethod) {
    const clean = text.trim();
    if (!clean) {
      setError("No hay texto que interpretar.");
      setPhase("idle");
      return;
    }

    setPhase("extracting");
    setError("");
    setNotes("");
    try {
      const draft = await extractExpense(clean, inputMethod);
      const { missing_fields: missing, notes: draftNotes, ...fields } = draft;
      onDraft(fields, missing || []);
      if (draftNotes) setNotes(draftNotes);
      if (missing?.length) {
        setError(
          "SUMA no pudo determinar todos los datos. Revisa los campos marcados en el formulario."
        );
      }
      setPhase("done");
    } catch (requestError) {
      // The transcript stays on screen and the form is untouched, so nothing
      // the user said or typed is lost. CLAUDE.md 32.12.
      setError(
        requestError.fields?.detail ||
          "No se pudo interpretar el texto. Revisa que el servidor esté disponible, o captura el gasto manualmente."
      );
      setPhase("idle");
    }
  }

  function startListening() {
    setError("");
    setNotes("");
    setTranscript("");
    setInterim("");
    cancelledRef.current = false;
    setSource("text");

    // Constructed only now: this is the click that asks for microphone access.
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
      if (event.error === "aborted") return; // user pressed Detener
      setError(
        RECOGNITION_ERRORS[event.error] ||
          "No se pudo reconocer la voz. Puedes escribir el gasto."
      );
      setPhase("idle");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setInterim("");
      if (cancelledRef.current) {
        setPhase("idle");
        return;
      }
      if (finalText.trim()) runExtraction(finalText, "voice");
      else setPhase((current) => (current === "listening" ? "idle" : current));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError("No se pudo iniciar el micrófono. Puedes escribir el gasto.");
      setPhase("idle");
    }
  }

  function stopListening() {
    cancelledRef.current = true;
    recognitionRef.current?.stop();
  }

  const listening = phase === "listening" || phase === "transcribing";
  const busy = phase === "extracting";

  return (
    <section className="voice" aria-labelledby="voice-heading">
      <h2 id="voice-heading">Registrar por voz</h2>

      {!SpeechRecognition ? (
        <p className="notice">
          Tu navegador no permite el reconocimiento de voz. Escribe el gasto abajo
          para que SUMA lo interprete, o captúralo directamente en el formulario.
        </p>
      ) : (
        <p className="hint">
          Di algo como &laquo;ayer gasté 180 pesos en Costco en el súper&raquo;.
        </p>
      )}

      <div className="voice-controls">
        {SpeechRecognition && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={busy}
            aria-pressed={listening}
          >
            {/* Text, not just colour, carries the state. The icon is decorative. */}
            <span aria-hidden="true">{listening ? "■" : "●"}</span>{" "}
            {listening ? "Detener" : "Hablar"}
          </button>
        )}

        {/* The status line is the single announcement point for every phase. */}
        <p className="voice-status" role="status" aria-live="polite">
          <span className={`phase phase-${phase}`}>{LABELS[phase]}</span>
          {interim && <span className="interim"> {interim}</span>}
        </p>
      </div>

      <div className="field">
        <label htmlFor="transcript">Transcripción</label>
        <textarea
          id="transcript"
          rows={2}
          value={transcript}
          onChange={(event) => {
            // Typing into an empty box means this is a typed expense, not voice.
            if (!transcript) setSource("text");
            setTranscript(event.target.value);
          }}
          placeholder="Aquí aparece lo que SUMA escuchó. Puedes corregirlo."
          aria-describedby="transcript-help"
        />
        <p className="hint" id="transcript-help">
          Puedes editar el texto y volver a interpretarlo. Nada se guarda hasta que
          confirmes en el formulario.
        </p>
      </div>

      <button
        type="button"
        className="secondary"
        onClick={() => runExtraction(transcript, source)}
        disabled={busy || listening || !transcript.trim()}
      >
        {busy ? "Interpretando..." : "Interpretar texto"}
      </button>

      {notes && <p className="notice">{notes}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
