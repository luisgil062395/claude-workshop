/**
 * Orientacion financiera determinista (CLAUDE.md §13, §30).
 *
 * Cada respuesta distingue cuatro cosas y las etiqueta:
 *   hecho        — lo que esta guardado
 *   calculo      — lo que se deriva de ello, de forma reproducible
 *   sugerencia   — lo que podria cambiar
 *   incertidumbre— lo que falta para que la cuenta sea completa
 *
 * Nunca se presenta una proyeccion como garantia, y si falta contexto
 * financiero se dice explicitamente en vez de suponerlo.
 */

import type { Expense, FinancialProfile, ScenarioRow } from "./types";
import { money } from "./money";
import { type Period, dailyAverage, totalIncome, totalSpent } from "./metrics";

export type GuidanceClaim = {
  kind: "hecho" | "cálculo" | "sugerencia" | "incertidumbre";
  text: string;
};

export type Guidance = {
  claims: GuidanceClaim[];
  scenarios?: { title: string; caption: string; rows: ScenarioRow[] };
};

/** Ingreso disponible al mes: ingreso registrado o declarado, menos gasto. */
export function monthlyAvailable(
  list: Expense[], profile: FinancialProfile, now = new Date(),
): { available: number | null; income: number | null; spent: number; assumed: string[] } {
  const spent = totalSpent(list, "month", now);
  const recorded = totalIncome(list, "month", now);
  const assumed: string[] = [];

  let income: number | null = null;
  if (profile.monthlyIncome && profile.monthlyIncome > 0) {
    income = profile.monthlyIncome;
  } else if (recorded > 0) {
    income = recorded;
    assumed.push("tu ingreso sale de los depósitos que registraste este mes");
  }

  const fixed = profile.fixedMonthlyExpenses ?? 0;
  if (fixed > 0) assumed.push(`incluye ${money(fixed)} de gastos fijos declarados`);

  const available = income === null ? null : income - spent - fixed;
  return { available, income, spent, assumed };
}

/** Cuanto tomaria juntar `target` al ritmo actual, con escenarios alternativos. */
export function savingsPlan(
  list: Expense[], profile: FinancialProfile, target: number, now = new Date(),
): Guidance {
  const { available, income, spent, assumed } = monthlyAvailable(list, profile, now);
  const claims: GuidanceClaim[] = [
    { kind: "hecho", text: `Este mes llevas ${money(spent)} de gasto registrado.` },
  ];

  if (available === null) {
    claims.push({
      kind: "incertidumbre",
      text: "Todavía no sé cuánto ingresas al mes, así que no puedo calcular cuánto te queda disponible. Dime tu ingreso mensual y lo estimo.",
    });
    return { claims };
  }

  claims.push({
    kind: "hecho",
    text: `Tu ingreso considerado es ${money(income ?? 0)} al mes.`,
  });

  if (available <= 0) {
    claims.push({
      kind: "cálculo",
      text: "Con lo registrado hasta ahora, este mes no queda margen disponible para ahorrar.",
    });
    return { claims };
  }

  const months = Math.ceil(target / available);
  claims.push({
    kind: "cálculo",
    text: `Te quedan aproximadamente ${money(available)} disponibles al mes. A ese ritmo, juntar ${money(target)} toma cerca de ${months} ${months === 1 ? "mes" : "meses"}.`,
  });

  const rows: ScenarioRow[] = [
    { label: `Ritmo actual · ${money(available)}/mes`, detail: `~${months} ${months === 1 ? "mes" : "meses"}` },
    { label: `Si apartas ${money(available * 1.2)}/mes`, detail: `~${Math.ceil(target / (available * 1.2))} meses` },
    { label: `Si apartas ${money(available * 1.4)}/mes`, detail: `~${Math.ceil(target / (available * 1.4))} meses` },
  ];

  claims.push({
    kind: "incertidumbre",
    text: assumed.length
      ? `Este cálculo supone que tu ingreso y tu gasto se mantienen parecidos, y ${assumed.join("; ")}.`
      : "Este cálculo supone que tu ingreso y tu gasto se mantienen parecidos.",
  });

  return { claims, scenarios: { title: "Escenarios", caption: "Comparación al ritmo actual y apartando más.", rows } };
}

/** ¿Alcanza para una compra de `amount`? */
export function affordability(
  list: Expense[], profile: FinancialProfile, amount: number, now = new Date(),
): Guidance {
  const { available, income } = monthlyAvailable(list, profile, now);
  const claims: GuidanceClaim[] = [];

  if (available === null || income === null) {
    claims.push({
      kind: "incertidumbre",
      text: `No puedo decirte si ${money(amount)} te alcanza sin saber tu ingreso mensual. Si me lo dices, lo calculo con tus gastos reales.`,
    });
    return { claims };
  }

  const savings = profile.savings ?? 0;
  claims.push({ kind: "hecho", text: `Tienes ${money(savings)} en ahorros declarados y ${money(available)} disponibles este mes.` });

  if (savings >= amount) {
    claims.push({ kind: "cálculo", text: `${money(amount)} cabe en tus ahorros actuales y te dejaría ${money(savings - amount)}.` });
  } else if (available > 0) {
    const months = Math.ceil((amount - savings) / available);
    claims.push({ kind: "cálculo", text: `Te faltan ${money(amount - savings)}. A ${money(available)} al mes, los juntas en unos ${months} ${months === 1 ? "mes" : "meses"}.` });
    claims.push({ kind: "sugerencia", text: "Si quieres acelerarlo, dime en qué categoría prefieres recortar y te muestro el efecto." });
  } else {
    claims.push({ kind: "cálculo", text: "Con el gasto registrado este mes no queda margen para acercarte a esa compra." });
  }

  claims.push({ kind: "incertidumbre", text: "No incluyo gastos que no hayas registrado ni pagos anuales que no me hayas contado." });
  return { claims };
}

/** Cuanto podrias liberar recortando un porcentaje de una categoria. */
export function trimScenario(categoryLabel: string, monthlyValue: number, share = 0.15): GuidanceClaim {
  return {
    kind: "sugerencia",
    text: `Reducir ${categoryLabel.toLowerCase()} un ${Math.round(share * 100)}% liberaría aproximadamente ${money(monthlyValue * share)} al mes.`,
  };
}

export function averageClaim(list: Expense[], period: Period, now = new Date()): GuidanceClaim {
  return {
    kind: "cálculo",
    text: `Tu promedio es ${money(dailyAverage(list, period, now))} al día en este periodo.`,
  };
}
