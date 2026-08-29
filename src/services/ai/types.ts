/**
 * Contrato del servicio de IA.
 *
 * La app solo conoce esta interfaz. Hoy la implementa un proveedor determinista
 * local (`mock.ts`); manana puede implementarla uno que llame a Claude sin que
 * cambie una sola vista. Ver `index.ts` para el punto de intercambio.
 */

import type {
  ChatAttachment, Expense, ExpenseDraft, FinancialGoal, FinancialProfile,
} from "../../lib/types";

/** Todo lo que el proveedor puede leer del usuario. Nada mas. */
export type AiContext = {
  expenses: Expense[];
  profile: FinancialProfile;
  goals: FinancialGoal[];
  now: Date;
};

export type ExtractRequest =
  | { method: "text"; text: string }
  | { method: "voice"; transcript: string }
  | { method: "receipt"; fileName: string; dataUrl: string };

export type AiAnswer = {
  text: string;
  attachments?: ChatAttachment[];
  /**
   * true cuando el contenido sale de calculos deterministas sobre los datos
   * guardados. La UI lo usa para poder decir de donde viene una cifra.
   */
  computed: boolean;
};

/** Que quiso hacer la persona al escribir. */
export type Intent = "expense" | "question";

export interface AiProvider {
  readonly name: string;
  /** `mock` habilita los avisos de "datos de demostracion" en la UI. */
  readonly kind: "mock" | "remote";

  /** ¿Esto es un gasto que registrar o una pregunta que responder? */
  classify(text: string): Intent;

  /** Interpreta una entrada y devuelve un borrador SIN guardar nada. */
  extract(req: ExtractRequest, ctx: AiContext): Promise<ExpenseDraft>;

  /** Responde usando unicamente los datos del contexto. */
  answer(question: string, ctx: AiContext): Promise<AiAnswer>;
}
