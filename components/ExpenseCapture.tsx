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

  async function runExtraction(
    text: string,
    inputMethod: "voice" | "text"
  ) {
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

  return (
    <section aria-labelledby="capture-heading">
      <h1 id="capture-heading">Agregar gasto</h1>

      {status !== "review" && (
        <>
          <form onSubmit={handleExtract}>
            <label htmlFor="expense-input">Cuéntame en qué gastaste</label>
            <textarea
              id="expense-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej. Ayer gasté 180 pesos en Costco en el súper"
              required
              rows={3}
            />
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isBusy || input.trim() === ""}
              >
                {status === "extracting" ? "Entendiendo..." : "Continuar"}
              </button>

              {voiceSupported && (
                <button
                  type="button"
                  className="btn"
                  disabled={isBusy && status !== "listening"}
                  onClick={status === "listening" ? handleStopVoice : handleStartVoice}
                  aria-pressed={status === "listening"}
                >
                  {status === "listening" ? "Detener 🎤" : "Hablar 🎤"}
                </button>
              )}

              <button
                type="button"
                className="btn"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                Subir recibo 📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleReceiptChange}
                className="visually-hidden"
                aria-label="Subir foto de recibo"
              />
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

      <div role="status" aria-live="polite">
        {status === "listening" && "Escuchando..."}
        {status === "extracting" && "Entendiendo..."}
        {status === "reading-receipt" && "Leyendo el recibo..."}
        {status === "saving" && "Guardando..."}
        {status === "saved" && "Gasto guardado."}
        {status === "error" && errorMessage}
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
