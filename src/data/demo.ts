/**
 * DATOS DE DEMOSTRACION.
 *
 * Nada de esto proviene de una persona real. Se genera con semilla fija para
 * que la app se vea igual en cada carga y las cifras del panel sean
 * reproducibles. La UI lo declara con el aviso `DemoNotice`.
 *
 * Las proporciones estan calibradas contra los disenos de Figma
 * (assets/screenshots/Container3.png): reparto por categoria ~34 / 26 / 18 / 14 / 8
 * y perfil mensual de gasto con agosto como pico del ano.
 */

import type { AppData, Expense, ExpenseCategory } from "../lib/types";
import { toISODate } from "../lib/dates";
import { seeded } from "../lib/id";

/** Peso relativo del gasto de cada mes. Agosto = 1.00, el pico del ano. */
const MONTH_WEIGHT = [0.75, 0.88, 0.69, 0.96, 0.81, 0.91, 0.73, 1.0, 0.86, 0.79, 0.92, 0.84];
const MONTH_BASE = 2400;

/** Reparto por categoria dentro de cada mes, este ano. */
const MIX: Array<{ category: ExpenseCategory; share: number; count: number; merchants: string[] }> = [
  { category: "food", share: 0.35, count: 6, merchants: ["Café Avellaneda", "Taquería El Califa", "Fonda Margarita", "Contramar", "Rosetta", "La Docena", "Panadería Rosetta"] },
  { category: "groceries", share: 0.27, count: 4, merchants: ["Soriana", "Chedraui", "Costco", "La Comer", "Mercado Medellín"] },
  { category: "transportation", share: 0.19, count: 5, merchants: ["Uber", "DiDi", "Metro", "Gasolina Pemex", "Estacionamiento"] },
  { category: "shopping", share: 0.16, count: 2, merchants: ["Amazon", "Liverpool", "Zara", "Mercado Libre"] },
  { category: "health", share: 0.015, count: 1, merchants: ["Farmacia del Ahorro", "Laboratorio Chopo"] },
  { category: "bills", share: 0.01, count: 1, merchants: ["CFE", "Telmex", "Izzi"] },
  { category: "entertainment", share: 0.005, count: 1, merchants: ["Cinépolis", "Spotify"] },
];

/**
 * Reparto del ano pasado. Transporte pesaba mas: asi la comparacion entre
 * ventanas equivalentes tiene una base real que medir, en vez de un insight
 * fabricado.
 */
const MIX_PREV: Record<string, number> = {
  food: 0.33, groceries: 0.26, transportation: 0.22, shopping: 0.155,
  health: 0.02, bills: 0.01, entertainment: 0.005,
};

function rid(n: number): string {
  return `demo_${n.toString(36).padStart(4, "0")}`;
}

/** Reparte `total` en `n` montos con variacion determinista. */
function split(total: number, n: number, rand: () => number): number[] {
  const raw = Array.from({ length: n }, () => 0.6 + rand() * 0.8);
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((w) => Math.round(((w / sum) * total) * 100) / 100);
  // El ultimo absorbe el redondeo para que la suma cuadre exactamente.
  const diff = Math.round((total - out.reduce((a, b) => a + b, 0)) * 100) / 100;
  out[out.length - 1] = Math.round((out[out.length - 1] + diff) * 100) / 100;
  return out;
}

export function demoExpenses(now = new Date()): Expense[] {
  const rand = seeded(20260829);
  const out: Expense[] = [];
  let n = 0;
  const year = now.getFullYear();
  const lastMonth = now.getMonth();

  // Ano anterior completo: da base a las comparaciones "vs. el año pasado".
  for (let m = 0; m < 12; m++) {
    const monthTotal = MONTH_WEIGHT[m] * MONTH_BASE * 0.94;
    const daysInMonth = new Date(year - 1, m + 1, 0).getDate();
    for (const bucket of MIX) {
      const share = MIX_PREV[bucket.category] ?? bucket.share;
      const amounts = split(monthTotal * share, bucket.count, rand);
      for (const amount of amounts) {
        const day = 1 + Math.floor(rand() * daysInMonth);
        out.push({
          id: rid(n++),
          amount,
          currency: "MXN",
          description: bucket.merchants[Math.floor(rand() * bucket.merchants.length)],
          category: bucket.category,
          date: toISODate(new Date(year - 1, m, day)),
          createdAt: new Date(year - 1, m, day, 12, 0).toISOString(),
          inputMethod: "text",
        });
      }
    }
  }

  for (let m = 0; m <= lastMonth; m++) {
    const monthTotal = MONTH_WEIGHT[m] * MONTH_BASE;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    // El mes en curso solo se llena hasta hoy, no hasta fin de mes.
    const lastDay = m === lastMonth ? Math.max(1, now.getDate() - 5) : daysInMonth;

    for (const bucket of MIX) {
      const amounts = split(monthTotal * bucket.share, bucket.count, rand);
      for (const amount of amounts) {
        const day = 1 + Math.floor(rand() * lastDay);
        const hour = 8 + Math.floor(rand() * 12);
        const minute = Math.floor(rand() * 60);
        const date = toISODate(new Date(year, m, day));
        out.push({
          id: rid(n++),
          amount,
          currency: "MXN",
          description: bucket.merchants[Math.floor(rand() * bucket.merchants.length)],
          category: bucket.category,
          date,
          createdAt: new Date(year, m, day, hour, minute).toISOString(),
          inputMethod: rand() < 0.5 ? "voice" : rand() < 0.7 ? "text" : "receipt",
        });
      }
    }

    // Nomina quincenal. El ingreso nunca suma al total gastado.
    for (const day of [15, Math.min(daysInMonth, 30)]) {
      if (m === lastMonth && day > now.getDate()) continue;
      out.push({
        id: rid(n++),
        amount: 9200,
        currency: "MXN",
        description: "Nómina",
        category: "income",
        date: toISODate(new Date(year, m, day)),
        createdAt: new Date(year, m, day, 9, 0).toISOString(),
        inputMethod: "text",
        note: "Quincena",
      });
    }
  }

  return [...out, ...recentFromDesigns(now, n)];
}

/**
 * Las transacciones que aparecen literalmente en los disenos de Figma
 * (Container3.png y Container4.png), colocadas de forma relativa a hoy.
 */
function recentFromDesigns(now: Date, startIndex: number): Expense[] {
  let n = startIndex;
  const day = (back: number) => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back));
  const at = (back: number, h: number, m: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, h, m).toISOString();

  return [
    {
      id: rid(n++), amount: 120, currency: "MXN", description: "Café Avellaneda",
      category: "food", date: day(0), createdAt: at(0, 14, 32), inputMethod: "voice",
      rawInput: "Un café en Avellaneda, 120 pesos", confidence: 0.92,
      location: { name: "Roma Norte" },
    },
    {
      id: rid(n++), amount: 86, currency: "MXN", description: "Uber",
      category: "transportation", date: day(0), createdAt: at(0, 9, 10), inputMethod: "voice",
      rawInput: "Uber al trabajo, 86 pesos", confidence: 0.58,
      // Campo sin confirmar ⇒ la fila se marca "Pendiente".
      uncertainFields: ["category"],
    },
    {
      id: rid(n++), amount: 250, currency: "MXN", description: "Soriana",
      category: "groceries", date: day(1), createdAt: at(1, 18, 40), inputMethod: "text",
      rawInput: "Ayer gasté 250 pesos en Soriana", confidence: 0.88,
    },
    {
      id: rid(n++), amount: 9200, currency: "MXN", description: "Nómina",
      category: "income", date: day(1), createdAt: at(1, 9, 0), inputMethod: "text",
      note: "Quincena",
    },
    {
      id: rid(n++), amount: 219, currency: "MXN", description: "Netflix",
      category: "entertainment", date: day(3), createdAt: at(3, 21, 5), inputMethod: "text",
      note: "Recurrente", recurring: true,
    },
    {
      id: rid(n++), amount: 742.3, currency: "MXN", description: "Súper",
      category: "housing", date: day(4), createdAt: at(4, 12, 15), inputMethod: "receipt",
      note: "Editado", editedByUser: true, confidence: 0.71,
    },
  ];
}

/** Perfil financiero de demostracion. Deliberadamente incompleto: la app
 *  debe saber decir "esto no lo sé" cuando falta contexto. */
export function demoData(now = new Date()): AppData {
  return {
    version: 1,
    expenses: demoExpenses(now),
    goals: [
      { id: "goal_demo", name: "Viaje a Oaxaca", targetAmount: 8000, currentAmount: 3250, createdAt: now.toISOString() },
    ],
    profile: { currency: "MXN", monthlyIncome: 18400, savings: 20000 },
    conversations: [],
    onboardingComplete: false,
    startingContext: null,
  };
}

/** Estado inicial vacio, para empezar de cero desde Ajustes. */
export function emptyData(): AppData {
  return {
    version: 1,
    expenses: [],
    goals: [],
    profile: { currency: "MXN" },
    conversations: [],
    onboardingComplete: false,
    startingContext: null,
  };
}
