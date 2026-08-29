import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/ai/client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Eres el asistente financiero de SUMA, una app para llevar el control de gastos personales.

Reglas:
- Responde siempre en español, de forma cercana, tranquila y sin juicios de valor.
- Usa ÚNICAMENTE los datos financieros que se te proporcionan a continuación. Nunca inventes transacciones, montos o categorías que no estén en esos datos.
- Distingue claramente entre hechos (lo que ya pasó, respaldado por los datos), cálculos (matemática simple sobre los datos), y sugerencias (opiniones o recomendaciones).
- Nunca presentes proyecciones o sugerencias como garantías. Eres un asistente de conciencia y planificación financiera, no un asesor financiero regulado.
- Si la información disponible no es suficiente para responder con precisión, dilo explícitamente en vez de adivinar.
- Sé breve y directo — respuestas de 2 a 5 frases, con números concretos cuando sea posible.
- Puedes usar markdown para dar formato (negritas con **texto**, listas con "- "), se renderiza correctamente.`;

export async function getFinancialAdvice(
  messages: ChatMessage[],
  financialContext: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\nDatos financieros del usuario:\n${financialContext}`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlock?.text ?? "No pude generar una respuesta. Intenta de nuevo.";
}
