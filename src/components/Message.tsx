/**
 * Mensajes del hilo.
 *
 * La persona habla en burbuja de tinta; Suma responde en una tarjeta clara
 * firmada con la marca ✚, con los datos financieros anidados dentro de la
 * respuesta en vez de compitiendo con ella.
 */

import type { ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import type { ChatAttachment, ChatMessage, Expense } from "../lib/types";
import { BrandMark } from "./primitives";
import { BarChart, CategoryBreakdown, TransactionRow } from "./data";

/** Negritas con **dobles asteriscos**. Sin HTML: solo texto y <strong>. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  );
}

function Attachment({ att, expenses }: { att: ChatAttachment; expenses: Expense[] }) {
  switch (att.kind) {
    case "expense": {
      const e = expenses.find((x) => x.id === att.expenseId);
      return e ? <div className="msg__nested"><TransactionRow expense={e} /></div> : null;
    }
    case "trend":
      return (
        <div className="msg__nested msg__nested--chart">
          <p className="msg__nested-title">{att.title}</p>
          <BarChart data={att.series} caption={att.caption} />
          <p className="msg__nested-caption">{att.caption}</p>
        </div>
      );
    case "breakdown":
      return (
        <div className="msg__nested msg__nested--chart">
          <p className="msg__nested-title">{att.title}</p>
          <CategoryBreakdown slices={att.slices} />
          <p className="msg__nested-caption">{att.caption}</p>
        </div>
      );
    case "scenarios":
      return (
        <div className="msg__nested msg__nested--chart">
          <p className="msg__nested-title">{att.title}</p>
          <ul className="scenarios">
            {att.rows.map((r) => (
              <li key={r.label}>
                <span>{r.label}</span>
                <span className="tabular">{r.detail}</span>
              </li>
            ))}
          </ul>
          <p className="msg__nested-caption">{att.caption}</p>
        </div>
      );
    case "insight":
      return (
        <div className="msg__nested">
          <p className="msg__nested-title">{att.title}</p>
          <p>{att.body}</p>
        </div>
      );
    case "goal":
      return null;
    case "draft":
      return null;
    case "error":
      return (
        <div className="msg__error" role="alert">
          <WarningCircle size={18} weight="fill" />
          <span>{att.message}</span>
        </div>
      );
    default:
      return null;
  }
}

export function Message({ message, expenses }: { message: ChatMessage; expenses: Expense[] }) {
  if (message.role === "user") {
    return (
      <div className="msg msg--user">
        <p className="bubble bubble--user">{message.text}</p>
      </div>
    );
  }

  return (
    <div className="msg msg--suma">
      <span className="msg__avatar"><BrandMark size={22} /></span>
      <div className="bubble bubble--suma">
        <p className="bubble__text">{rich(message.text)}</p>
        {message.attachments?.map((att, i) => (
          <Attachment key={i} att={att} expenses={expenses} />
        ))}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="msg msg--suma">
      <span className="msg__avatar"><BrandMark size={22} /></span>
      <div className="bubble bubble--suma">
        <span className="typing" role="status" aria-live="polite">
          <span className="sr-only">Suma está pensando</span>
          <i /><i /><i />
        </span>
      </div>
    </div>
  );
}

