import { useState } from "react";
import { ArrowUp, Info, Plus, WarningCircle } from "@phosphor-icons/react";
import { askSuma } from "../api";
import { monthsLabel, pesos } from "../money";

// Suggestions double as an explanation of what SUMA can answer -- an empty
// text box gives the user no idea what to type.
const SUGGESTIONS = [
  "¿Cuánto me dura el dinero?",
  "¿En qué gasté más?",
  "Si dejo de gastar en lo flexible, ¿cuánto más me dura?",
];

// The numbers behind an answer, disclosed on demand. The explanation stays
// auditable without turning the reply into a report.
function ContextDetails({ context }) {
  const scenarios = context?.scenarios || [];
  if (scenarios.length === 0) return null;

  return (
    <details className="answer-context">
      <summary>Ver los números en los que me basé</summary>
      <ul>
        {scenarios.map((s) => (
          <li key={s.key}>
            <span className="ctx-label">{s.label}</span>
            <span className="ctx-value">
              {pesos(s.monthly_spending)}/mes
              {s.months !== null && s.months !== undefined
                ? ` · ${monthsLabel(s.months)}`
                : " · sostenible"}
            </span>
          </li>
        ))}
      </ul>
      <p className="ctx-note">
        Todas estas cifras las calcula SUMA a partir de tus datos, no el modelo
        de lenguaje.
      </p>
    </details>
  );
}

export default function AskSuma() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [context, setContext] = useState(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function send(text) {
    const clean = (text ?? question).trim();
    if (!clean) return;

    setAsking(true);
    setError("");
    setAnswer(null);
    try {
      const result = await askSuma(clean);
      setAnswer({ question: clean, text: result.answer });
      setContext(result.context);
      setQuestion("");
    } catch (requestError) {
      // The question stays in the box so nothing typed is lost.
      setError(
        requestError.fields?.detail ||
          "No pude responder ahora mismo. Tus cifras siguen disponibles arriba."
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="ask" aria-labelledby="ask-heading">
      <h2 id="ask-heading" className="section-label">Pregúntame</h2>

      {/* The user's own message uses a bubble; SUMA answers on the background. */}
      {answer && (
        <>
          <p className="user-bubble">{answer.question}</p>

          <div className="suma-says">
            <span className="brand-mark" aria-hidden="true">
              <Plus size={12} weight="bold" />
            </span>
            <div>
              <p>{answer.text}</p>
              <ContextDetails context={context} />
            </div>
          </div>
        </>
      )}

      {!answer && (
        <ul className="suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="suggestion"
                onClick={() => send(suggestion)}
                disabled={asking}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label htmlFor="ask-input" className="visually-hidden">
          Pregúntale algo a SUMA sobre tu dinero
        </label>
        <input
          id="ask-input"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Pregúntame sobre tu dinero…"
          disabled={asking}
        />
        <button
          type="submit"
          className="composer-send"
          disabled={asking || !question.trim()}
          aria-label="Enviar pregunta"
        >
          <ArrowUp size={20} weight="bold" aria-hidden="true" />
        </button>
      </form>

      <p className="ask-status" role="status" aria-live="polite">
        {asking ? "Pensando…" : ""}
      </p>

      {error && (
        <p className="field-message is-error" role="alert">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          {error}
        </p>
      )}

      <p className="uncertainty">
        <Info size={14} aria-hidden="true" />
        SUMA calcula las cifras y luego las explica. No es un asesor financiero.
      </p>
    </section>
  );
}
