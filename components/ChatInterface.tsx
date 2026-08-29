"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { sendChatMessage } from "@/app/chat/actions";
import type { ChatMessage } from "@/lib/ai/chat";

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

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setInput("");
    setErrorMessage("");
    setIsSending(true);

    const result = await sendChatMessage(nextHistory);
    setIsSending(false);

    if (result.ok) {
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } else {
      setErrorMessage(result.error);
    }
  }

  function handleStartVoice() {
    const RecognitionCtor = getSpeechRecognition();
    if (!RecognitionCtor) return;

    setListening(true);
    setErrorMessage("");
    const recognition = new RecognitionCtor();
    recognition.lang = "es-MX";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
    };
    recognition.onerror = () => {
      setErrorMessage("No pude escucharte claramente. Intenta de nuevo o escribe tu mensaje.");
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleStopVoice() {
    recognitionRef.current?.stop();
  }

  return (
    <section aria-labelledby="chat-heading" className="chat">
      <h1 id="chat-heading" className="visually-hidden">
        Chat financiero
      </h1>

      <div className="chat__thread">
        {messages.length === 0 && (
          <p className="chat__empty">
            Pregúntame sobre tus gastos o pide una recomendación — por ejemplo:{" "}
            <em>&quot;¿Qué recomendaciones tienes?&quot;</em>
          </p>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="chat__bubble chat__bubble--user">
              {message.content}
            </div>
          ) : (
            <div key={index} className="chat__row">
              <Image src="/logo.png" alt="" width={28} height={28} className="chat__avatar" />
              <div className="chat__bubble chat__bubble--assistant">{message.content}</div>
            </div>
          )
        )}

        {isSending && (
          <div className="chat__row">
            <Image src="/logo.png" alt="" width={28} height={28} className="chat__avatar" />
            <div className="chat__bubble chat__bubble--assistant">
              <span className="spinner" aria-hidden="true" /> Pensando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div role="status" aria-live="polite" className="status-line">
        {errorMessage}
      </div>

      <form onSubmit={handleSend} className="chat__composer">
        <Image src="/logo.png" alt="" width={28} height={28} className="chat__avatar" />
        <label htmlFor="chat-input" className="visually-hidden">
          Escribe o dicta un mensaje
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe o dicta un gasto..."
          className="chat__input"
          disabled={isSending}
        />
        {voiceSupported && (
          <button
            type="button"
            className={`chat__mic ${listening ? "chat__mic--active" : ""}`}
            onClick={listening ? handleStopVoice : handleStartVoice}
            aria-pressed={listening}
            aria-label={listening ? "Detener grabación" : "Hablar"}
          >
            🎤
          </button>
        )}
      </form>
    </section>
  );
}
