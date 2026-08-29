/**
 * Persistencia local. Es la unica fuente de verdad de los datos de la persona.
 *
 * No hay backend ni cuenta: todo vive en este dispositivo y se puede borrar
 * desde Ajustes. Es coherente con CLAUDE.md §25 — minimizar lo que se guarda y
 * poder eliminarlo.
 */

import type { AppData } from "./types";
import { demoData, emptyData } from "../data/demo";

const KEY = "suma.v1";

export function load(now = new Date()): AppData {
  if (typeof localStorage === "undefined") return demoData(now);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return demoData(now);
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.expenses)) return demoData(now);
    return {
      version: 1,
      expenses: parsed.expenses,
      goals: parsed.goals ?? [],
      profile: parsed.profile ?? { currency: "MXN" },
      conversations: parsed.conversations ?? [],
      onboardingComplete: Boolean(parsed.onboardingComplete),
      startingContext: parsed.startingContext ?? null,
    };
  } catch {
    // Un almacenamiento corrupto no debe dejar la app inservible.
    return demoData(now);
  }
}

export function save(data: AppData): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Cuota llena o modo privado: la sesion sigue funcionando en memoria.
  }
}

export function reset(mode: "demo" | "empty", now = new Date()): AppData {
  const data = mode === "demo" ? demoData(now) : emptyData();
  save(data);
  return data;
}

export function clear(): void {
  if (typeof localStorage === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* sin efecto */ }
}
