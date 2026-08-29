/**
 * Punto unico de acceso al servicio de IA.
 *
 * ── Como cambiar el mock por Claude ──────────────────────────────────────
 * 1. Crear `remote.ts` que exporte un `AiProvider` cuyo `extract`/`answer`
 *    llamen a un endpoint propio (p. ej. `POST /api/extract`, `/api/chat`)
 *    con `@anthropic-ai/sdk` del lado del servidor. La llave NUNCA va en el
 *    cliente.
 * 2. `setProvider(remoteProvider)` en el arranque cuando haya endpoint.
 * 3. No hay nada mas que tocar: ninguna vista importa el proveedor.
 *
 * Sea cual sea el proveedor, su salida pasa por `validate.ts` antes de tocar
 * el almacenamiento. Se trata como entrada no confiable siempre.
 */

import type { AiProvider } from "./types";
import { mockProvider } from "./mock";

let provider: AiProvider = mockProvider;

export function setProvider(next: AiProvider): void {
  provider = next;
}

export function aiProvider(): AiProvider {
  return provider;
}

/** true cuando la interpretacion es simulada; la UI lo declara en pantalla. */
export function isSimulated(): boolean {
  return provider.kind === "mock";
}

export type {
  AiAnswer, AiContext, AiProvider, ExtractRequest, Intent,
} from "./types";
export { emptyDraft, toExpense, validateDraft } from "./validate";
