"use server";

import { getFinancialAdvice, type ChatMessage } from "@/lib/ai/chat";
import { buildFinancialContext } from "@/lib/metrics";

export type SendChatMessageResult =
  | { ok: true; reply: string }
  | { ok: false; error: string };

export async function sendChatMessage(
  history: ChatMessage[]
): Promise<SendChatMessageResult> {
  try {
    const context = await buildFinancialContext(new Date());
    const reply = await getFinancialAdvice(history, context);
    return { ok: true, reply };
  } catch {
    return {
      ok: false,
      error: "No pude generar una respuesta en este momento. Intenta de nuevo.",
    };
  }
}
