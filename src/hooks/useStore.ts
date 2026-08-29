import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../lib/store";

/** Suscribe un componente a la única fuente de verdad de gastos/perfil/metas. */
export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
