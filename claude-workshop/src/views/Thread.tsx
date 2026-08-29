/**
 * El hilo es la app. Los datos financieros viven dentro de la conversacion,
 * no en pestanas paralelas.
 */

import { useEffect, useRef } from "react";
import { BrandMark } from "../components/primitives";
import { Message, TypingIndicator } from "../components/Message";
import { Composer } from "../components/Composer";
import { useStore } from "../state/store";

const SUGGESTIONS = [
  "¿Cómo puedo mejorar mis finanzas?",
  "¿Qué recomendaciones tienes?",
  "¿Cuánto gasté esta semana?",
  "¿En qué gasté más este mes?",
];

export function Thread() {
  const { conversation, data, busy, sendText, simulated } = useStore();
  const end = useRef<HTMLDivElement>(null);
  const empty = conversation.messages.length === 0;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [conversation.messages.length, busy]);

  return (
    <div className="thread">
      <div className="thread__scroll">
        {empty ? (
          <div className="empty">
            <BrandMark size={56} />
            <h1 className="empty__title">Hola, soy Suma</h1>
            <p className="empty__text">Cuéntame un gasto o pregúntame algo sobre tu dinero.</p>
          </div>
        ) : (
          <div className="thread__messages" role="log" aria-live="polite" aria-label="Conversación con Suma">
            {conversation.messages.map((m) => (
              <Message key={m.id} message={m} expenses={data.expenses} />
            ))}
            {busy && <TypingIndicator />}
            <div ref={end} />
          </div>
        )}
      </div>

      <div className="thread__foot">
        {empty && (
          <>
            {simulated && (
              <p className="thread__demo">
                Datos de demostración · interpretación simulada
              </p>
            )}
            <ul className="suggestions" aria-label="Preguntas sugeridas">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button type="button" className="suggestion" onClick={() => void sendText(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <Composer />
      </div>
    </div>
  );
}
