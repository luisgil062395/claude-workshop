"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ExpenseReviewCard } from "@/components/ExpenseReviewCard";
import {
  extractExpenseAction,
  extractReceiptAction,
  saveExpenseAction,
} from "@/app/agregar/actions";
import type { ExpenseCandidate } from "@/lib/expenses";

type Status =
  | "idle"
  | "listening"
  | "extracting"
  | "reading-receipt"
  | "review"
  | "saving"
  | "saved"
  | "error";

type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};
type SpeechRecognitionErrorEventLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ACCEPTED_IMAGE_TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const STATUS_LABELS: Partial<Record<Status, string>> = {
  listening: "Escuchando...",
  extracting: "Entendiendo...",
  "reading-receipt": "Leyendo el recibo...",
  saving: "Guardando...",
  saved: "Gasto guardado.",
};

export function ExpenseCapture() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [candidate, setCandidate] = useState<ExpenseCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  async function runExtraction(text: string, inputMethod: "voice" | "text") {
    setStatus("extracting");
    setErrorMessage("");
    const referenceDateISO = new Date().toISOString();
    const result = await extractExpenseAction(text, referenceDateISO, inputMethod);
    if (result.ok) {
      setCandidate(result.candidate);
      setStatus("review");
    } else {
      setErrorMessage(result.error);
      setStatus("error");
    }
  }

  async function handleExtract(event: FormEvent) {
    event.preventDefault();
    await runExtraction(input, "text");
  }

  function handleStartVoice() {
    const RecognitionCtor = getSpeechRecognition();
    if (!RecognitionCtor) return;

    setStatus("listening");
    setErrorMessage("");
    const recognition = new RecognitionCtor();
    recognition.lang = "es-MX";
    recognition.interimResults = false;
    recognition.continuous = false;
    let gotResult = false;

    recognition.onresult = (event) => {
      gotResult = true;
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
      if (transcript.trim() !== "") {
        void runExtraction(transcript, "voice");
      } else {
        setStatus("idle");
      }
    };
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        "no-speech": "No detecté ninguna voz. Intenta de nuevo hablando justo después de presionar el botón.",
        "audio-capture": "No pude acceder al micrófono. Revisa los permisos del sistema para este navegador.",
        "not-allowed": "El permiso de micrófono fue denegado. Actívalo en la configuración del navegador.",
        network: "Falló la conexión con el servicio de voz (puede requerir Google Chrome; algunos navegadores basados en Chromium no tienen acceso a este servicio).",
        "service-not-allowed": "Este navegador no tiene acceso al servicio de reconocimiento de voz de Google. Prueba con Google Chrome.",
      };
      setErrorMessage(
        messages[event.error] ??
          `No pude escucharte claramente (error: ${event.error}). Puedes intentar de nuevo o escribir el gasto.`
      );
      setStatus("error");
    };
    recognition.onend = () => {
      setStatus((current) => {
        if (current !== "listening") return current;
        if (!gotResult) {
          setErrorMessage(
            "No se recibió ninguna transcripción. Este navegador podría no tener acceso al servicio de voz de Google — prueba con Google Chrome."
          );
          return "error";
        }
        return "idle";
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleStopVoice() {
    recognitionRef.current?.stop();
  }

  async function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaType = ACCEPTED_IMAGE_TYPES[file.type];
    if (!mediaType) {
      setErrorMessage("Formato de imagen no soportado. Usa JPEG, PNG, WEBP o GIF.");
      setStatus("error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setStatus("reading-receipt");
    setErrorMessage("");
    try {
      const base64 = await fileToBase64(file);
      const referenceDateISO = new Date().toISOString();
      const result = await extractReceiptAction(base64, mediaType, referenceDateISO);
      if (result.ok) {
        setCandidate(result.candidate);
        setStatus("review");
      } else {
        setErrorMessage(result.error);
        setStatus("error");
      }
    } catch {
      setErrorMessage("No pude leer esa imagen. Intenta con otra foto.");
      setStatus("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirm(edited: Omit<ExpenseCandidate, "uncertainFields">) {
    setStatus("saving");
    const result = await saveExpenseAction(edited);
    if (result.ok) {
      setStatus("saved");
      setInput("");
      setCandidate(null);
    } else {
      setErrorMessage(result.error);
      setStatus("error");
    }
  }

  const isBusy = status === "extracting" || status === "reading-receipt" || status === "listening";
  const statusLabel = status === "error" ? errorMessage : STATUS_LABELS[status];

  return (
    <section aria-labelledby="capture-heading" className="capture">
      {status !== "review" && (
        <div className="capture__intro">
          <p className="eyebrow">Hola 👋</p>
          <h1 id="capture-heading">¿En qué gastaste?</h1>
          <p className="capture__subtitle">
            Escríbelo, dilo en voz alta, o sube una foto del recibo — yo lo organizo.
          </p>
        </div>
      )}

      {status !== "review" && (
        <>
          <form onSubmit={handleExtract} className="composer card">
            <label htmlFor="expense-input" className="visually-hidden">
              Cuéntame en qué gastaste
            </label>
            <textarea
              id="expense-input"
              className="composer__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej. Ayer gasté 180 pesos en Costco en el súper"
              required
              rows={2}
            />
            <div className="composer__actions">
              <div className="composer__tools">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Subir foto de recibo"
                  title="Subir foto de recibo"
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleReceiptChange}
                  className="visually-hidden"
                  aria-label="Subir foto de recibo"
                />

                {voiceSupported && (
                  <button
                    type="button"
                    className={`icon-btn icon-btn--voice ${status === "listening" ? "icon-btn--voice-active" : ""}`}
                    disabled={isBusy && status !== "listening"}
                    onClick={status === "listening" ? handleStopVoice : handleStartVoice}
                    aria-pressed={status === "listening"}
                    aria-label={status === "listening" ? "Detener grabación" : "Hablar"}
                    title={status === "listening" ? "Detener grabación" : "Hablar"}
                  >
                    🎤
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={isBusy || input.trim() === ""}
              >
                {status === "extracting" ? "Entendiendo..." : "Continuar"}
              </button>
            </div>
          </form>

          {!voiceSupported && (
            <p className="field__hint">
              Tu navegador no soporta entrada por voz. Puedes escribir el gasto o subir una
              foto del recibo.
            </p>
          )}
        </>
      )}

      <div role="status" aria-live="polite" className={isBusy ? "status-line status-line--busy" : "status-line"}>
        {isBusy && <span className="spinner" aria-hidden="true" />}
        {statusLabel}
      </div>

      {status === "review" && candidate && (
        <ExpenseReviewCard
          candidate={candidate}
          submitLabel="Guardar"
          onConfirm={handleConfirm}
          onCancel={() => {
            setStatus("idle");
            setCandidate(null);
          }}
        />
      )}
    </section>
  );
}
