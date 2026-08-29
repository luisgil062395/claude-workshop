/**
 * Proveedor de IA determinista y local.
 *
 * No hay red ni modelo: la interpretacion es un extractor de reglas y las
 * respuestas son calculos sobre los gastos guardados. Mismas entradas, misma
 * salida siempre.
 *
 * Reglas que se respetan aqui, no en la UI:
 *  - lo que no se puede determinar se marca como incierto, nunca se inventa;
 *  - toda cifra que se afirma sale de `lib/metrics`, no de una plantilla;
 *  - cuando faltan datos para responder, se dice que faltan.
 */

import type { ChatAttachment, ExpenseDraft } from "../../lib/types";
import type { AiAnswer, AiContext, AiProvider, ExtractRequest, Intent } from "./types";
import { emptyDraft, validateDraft } from "./validate";
import { inferCategory, category } from "../../lib/categories";
import { resolveDateExpression, todayISO } from "../../lib/dates";
import { money, percent } from "../../lib/money";
import {
  breakdown, matching, previousPeriodDelta, series, totalSpent, inPeriod, spending,
} from "../../lib/metrics";
import type { Period } from "../../lib/metrics";
import { insightsFor, periodComparison } from "../../lib/insights";
import { affordability, monthlyAvailable, savingsPlan } from "../../lib/guidance";

/* ------------------------------------------------------------------ util */

const strip = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const QUESTION_RE =
  /^\s*[¿?]|\b(cuanto|cuanta|cuantos|como|que |qué |cual|cuales|donde|puedo|podria|me alcanza|alcanza para|recomienda|recomendacion|recomendaciones|aconseja|deberia|conviene|ahorrar|sugerencia)\b/;

const INCOME_RE =
  /\b(nomina|sueldo|salario|me pagaron|deposito|deposit|ingreso|quincena|aguinaldo|bono|reembolso|factura cobrada)\b/;

/** Unidades que descartan un numero como monto ("hace 3 días", "4 veces"). */
const NOT_MONEY_AFTER =
  /^\s*(dias?|semanas?|meses?|mes|anos?|horas?|minutos?|veces|vez|%|por ciento|hrs?|min|am|pm|de la|:)/;

type AmountHit = { value: number; index: number; explicit: boolean };

function findAmount(text: string): AmountHit | null {
  const hits: AmountHit[] = [];
  const re = /(\$)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(pesos?|mxn|mn|varos?|lucas?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const after = text.slice(m.index + m[0].length);
    if (NOT_MONEY_AFTER.test(strip(after))) continue;
    const before = strip(text.slice(Math.max(0, m.index - 12), m.index));
    if (/\b(hace|las|a las|son las)\s*$/.test(before)) continue;
    const value = Number(m[2].replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) continue;
    hits.push({ value, index: m.index, explicit: Boolean(m[1] || m[3]) });
  }
  if (hits.length === 0) return null;
  const explicit = hits.filter((h) => h.explicit);
  const pool = explicit.length ? explicit : hits;
  return pool.reduce((a, b) => (b.value > a.value ? b : a));
}

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "y", "o",
  "pesos", "peso", "mxn", "gaste", "gasté", "pague", "pagué", "compre", "compré",
  "ayer", "hoy", "manana", "mañana", "anteayer", "antier", "hace", "dias", "días",
  "en", "por", "para", "con", "que", "me", "mi", "se", "fue", "son", "esta", "este",
]);

/** Comercio o concepto. Prefiere lo que viene despues de "en"/"a"; nunca inventa. */
function findDescription(text: string): string | null {
  const propio = text.match(
    /\b(?:en|a|de)\s+((?:[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'&.-]*)(?:\s+(?:de\s+)?[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'&.-]*)*)/,
  );
  if (propio?.[1]) return propio[1].trim();

  const comun = text.match(/\b(?:en|de|por)\s+(?:el|la|los|las|un|una)?\s*([a-záéíóúñ]{3,}(?:\s+[a-záéíóúñ]{3,})?)/i);
  if (comun?.[1]) {
    const words = comun[1].split(/\s+/).filter((w) => !STOPWORDS.has(strip(w)));
    if (words.length) return words.map(cap).join(" ");
  }

  const words = text.split(/\s+/).map((w) => w.replace(/[^\wÁÉÍÓÚÑáéíóúñ]/g, ""))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(strip(w)) && !/^\d+$/.test(w));
  return words.length ? cap(words[0]) : null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------- extraccion */

function extractFromText(
  text: string, method: "text" | "voice", now: Date,
): ExpenseDraft {
  const raw = text.trim();
  const amount = findAmount(raw);
  const dateRes = resolveDateExpression(raw, now);
  const isIncome = INCOME_RE.test(strip(raw));
  const cat = isIncome
    ? { category: "income" as const, confidence: 0.9 }
    : inferCategory(raw);
  const description = findDescription(raw);

  const uncertain: string[] = [];
  if (!amount) uncertain.push("amount");
  if (!description) uncertain.push("description");
  if (!cat.category) uncertain.push("category");
  // Sin expresion de fecha se asume hoy: es la lectura natural de "pagué 120
  // por un café". No se marca como incierto, pero la fecha sigue siendo
  // editable en la revision y el supuesto se ve ahi.

  // Confianza: media de las senales que si se encontraron.
  const signals = [
    amount ? (amount.explicit ? 1 : 0.75) : 0,
    description ? 0.8 : 0,
    cat.category ? cat.confidence : 0,
    dateRes.date ? 1 : 0.5,
  ];
  const confidence = Math.round((signals.reduce((a, b) => a + b, 0) / signals.length) * 100) / 100;

  const question = !amount
    ? "No alcancé a escuchar el monto. ¿Cuánto fue?"
    : !cat.category
      ? "No pude determinar la categoría. ¿En cuál la pongo?"
      : undefined;

  return {
    amount: amount?.value ?? null,
    currency: "MXN",
    description,
    category: cat.category,
    date: dateRes.date ?? todayISO(now),
    inputMethod: method,
    rawInput: raw,
    confidence,
    uncertainFields: uncertain,
    source: "local",
    question,
  };
}

/**
 * Lectura de recibo simulada.
 *
 * No hay OCR en esta build. Se devuelve una lectura de DEMOSTRACION —la del
 * ejemplo documentado en CLAUDE.md §6— con la propina marcada como
 * desconocida, y `question` lo declara para que la UI lo muestre como tal.
 * Ningun dato se presenta como leido de la imagen real de la persona.
 */
function extractFromReceipt(fileName: string, dataUrl: string, now: Date): ExpenseDraft {
  return {
    amount: 522,
    currency: "MXN",
    description: "Costco",
    category: "groceries",
    date: todayISO(now),
    inputMethod: "receipt",
    rawInput: fileName,
    receiptImage: dataUrl,
    confidence: 0.62,
    uncertainFields: ["tip"],
    items: [
      { description: "Despensa", amount: 450 },
    ],
    tax: 72,
    source: "local",
    question:
      "Esta build no lee recibos todavía: los campos vienen de un ejemplo de demostración. Revísalos y corrígelos antes de guardar.",
  };
}

/* -------------------------------------------------------------- respuestas */

function periodOf(text: string): { period: Period; label: string } {
  const t = strip(text);
  if (/\baño\b|\bano\b|\banual\b|este ano/.test(t)) return { period: "year", label: "este año" };
  if (/\bsemana\b/.test(t)) return { period: "week", label: "esta semana" };
  return { period: "month", label: "este mes" };
}

function trendAttachment(ctx: AiContext, period: Period, title: string, caption: string): ChatAttachment {
  return { kind: "trend", title, caption, series: series(ctx.expenses, period, ctx.now) };
}

function answerFor(question: string, ctx: AiContext): AiAnswer {
  const t = strip(question);
  const { period, label } = periodOf(question);
  const hasData = spending(ctx.expenses).length > 0;

  if (!hasData) {
    return {
      computed: true,
      text: "Todavía no tienes gastos registrados, así que no puedo calcular nada sobre tu dinero. Cuéntame un gasto y empiezo.",
    };
  }

  /* — Recomendaciones / cómo mejorar — */
  if (/recomend|mejorar|consejo|sugerenc|reducir|recortar|ahorrar mas|ahorrar más/.test(t)) {
    return recommendations(ctx);
  }

  /* — ¿Cuánto puedo ahorrar? — */
  if (/cuanto (puedo|podria|podría) ahorrar|cuanto me queda|disponible/.test(t)) {
    const { available, income } = monthlyAvailable(ctx.expenses, ctx.profile, ctx.now);
    if (available === null || income === null) {
      return {
        computed: true,
        text: "Para decirte cuánto puedes ahorrar necesito saber tu ingreso mensual. Dímelo y lo calculo con tus gastos reales, sin suponer nada.",
      };
    }
    return {
      computed: true,
      text: `Con ${money(income)} de ingreso y ${money(totalSpent(ctx.expenses, "month", ctx.now))} gastados este mes, te quedan alrededor de **${money(Math.max(0, available))} al mes**. Es una estimación con lo que has registrado: no incluye gastos que no me hayas contado.`,
    };
  }

  /* — ¿Me alcanza para X? — */
  if (/alcanza|permitirme|puedo comprar|me da para/.test(t)) {
    const hit = findAmount(question);
    if (!hit) {
      return { computed: true, text: "¿De qué monto estamos hablando? Dime la cifra y la comparo con tus ahorros y tu gasto real." };
    }
    const g = affordability(ctx.expenses, ctx.profile, hit.value, ctx.now);
    return { computed: true, text: g.claims.map((c) => c.text).join(" ") };
  }

  /* — ¿Cuánto tardo en juntar X? — */
  if (/juntar|ahorrar\s+\$?\d|meta de/.test(t)) {
    const hit = findAmount(question);
    if (hit) {
      const g = savingsPlan(ctx.expenses, ctx.profile, hit.value, ctx.now);
      const att: ChatAttachment[] = g.scenarios ? [{ kind: "scenarios", ...g.scenarios }] : [];
      return { computed: true, text: g.claims.map((c) => c.text).join(" "), attachments: att };
    }
  }

  /* — ¿En qué gasté más? — */
  if (/en que gast|donde gast|mayor gasto|que categoria|categoria mas/.test(t)) {
    const slices = breakdown(ctx.expenses, period, ctx.now);
    if (!slices.length) return { computed: true, text: `No tienes gastos registrados ${label}.` };
    const top = slices[0];
    return {
      computed: true,
      text: `${label.charAt(0).toUpperCase()}${label.slice(1)} tu mayor categoría es **${top.label}**: ${money(top.value)}, el ${percent(top.share)} de tu gasto.`,
      attachments: [{
        kind: "breakdown",
        title: `Por categoría · ${label}`,
        caption: `Total ${money(slices.reduce((s, x) => s + x.value, 0))} en ${slices.length} categorías.`,
        slices,
      }],
    };
  }

  /* — ¿Cuánto llevo en <algo>? — */
  const enAlgo = question.match(/\b(?:en|de)\s+([a-záéíóúñ]{4,}(?:\s+[a-záéíóúñ]{3,})?)/i);
  if (/cuanto/.test(t) && enAlgo?.[1] && !/semana|mes|ano|año|total/.test(strip(enAlgo[1]))) {
    const needle = enAlgo[1].trim();
    const m = matching(ctx.expenses, needle, period, ctx.now);
    if (m.count > 0) {
      return {
        computed: true,
        text: `Llevas **${money(m.value)}** en ${needle.toLowerCase()} ${label}, en ${m.count} ${m.count === 1 ? "registro" : "registros"}.`,
      };
    }
    return { computed: true, text: `No encuentro registros que coincidan con "${needle}" ${label}. Puede que lo hayas guardado con otro concepto.` };
  }

  /* — ¿Cuánto gasté? — */
  if (/cuanto (gaste|gasté|llevo|he gastado|va|voy)/.test(t) || /total/.test(t)) {
    const value = totalSpent(ctx.expenses, period, ctx.now);
    const cmp = periodComparison(ctx.expenses, period, ctx.now);
    return {
      computed: true,
      text: `Llevas **${money(value)}** gastados ${label}.${cmp ? ` ${cmp}` : ""}`,
      attachments: [trendAttachment(ctx, period, `Gasto · ${label}`, cmp ?? "Tu gasto registrado en el periodo.")],
    };
  }

  /* — Nada que se pueda sostener con datos — */
  return {
    computed: true,
    text: "No estoy seguro de qué necesitas. Puedo decirte cuánto llevas gastado, en qué categoría se te va más, cuánto llevas en algo concreto o qué podrías ajustar. También puedes contarme un gasto y lo registro.",
  };
}

/**
 * Tres ajustes concretos, calculados sobre las categorias reales del mes.
 * El monto liberado es la suma de los recortes propuestos, no una promesa.
 */
function recommendations(ctx: AiContext): AiAnswer {
  const slices = breakdown(ctx.expenses, "month", ctx.now).filter((s) => s.category !== "income");
  const top = slices.slice(0, 3);
  if (top.length === 0) {
    return { computed: true, text: "Aún no tengo suficientes gastos registrados este mes para sugerirte ajustes con fundamento." };
  }

  const TRIM: Record<string, number> = { food: 0.25, entertainment: 0.3, transportation: 0.2, shopping: 0.25, subscriptions: 0.4 };
  const parts: string[] = [];
  let freed = 0;
  top.forEach((s, i) => {
    const rate = TRIM[s.category] ?? 0.15;
    const save = s.value * rate;
    freed += save;
    parts.push(`**${i + 1})** Bajar ${s.label.toLowerCase()} un ${Math.round(rate * 100)}% — hoy llevas ${money(s.value)} y liberarías ${money(save)}`);
  });

  return {
    computed: true,
    text: `Con base en tus gastos de este mes, hay ${top.length === 3 ? "tres" : top.length === 2 ? "dos" : "un"} ajuste${top.length > 1 ? "s" : ""} con efecto medible: ${parts.join(", ")}. En conjunto podrías liberar **~${money(freed)} al mes**. Son escenarios sobre lo que ya registraste, no una promesa.`,
    attachments: [{
      kind: "breakdown",
      title: "De dónde sale",
      caption: "Las categorías sobre las que se calculó el ajuste.",
      slices: top,
    }],
  };
}

/* ---------------------------------------------------------------- provider */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockProvider: AiProvider = {
  name: "local-deterministic",
  kind: "mock",

  classify(text: string): Intent {
    const t = strip(text);
    if (QUESTION_RE.test(t) || text.trim().startsWith("¿") || text.trim().endsWith("?")) {
      // "Pagué 120 en el súper" con signo de interrogación sigue siendo pregunta.
      return "question";
    }
    return findAmount(text) ? "expense" : "question";
  },

  async extract(req: ExtractRequest, ctx: AiContext): Promise<ExpenseDraft> {
    await delay(420);                       // la secuencia se resuelve en <2s percibidos
    const raw =
      req.method === "receipt"
        ? extractFromReceipt(req.fileName, req.dataUrl, ctx.now)
        : extractFromText(
            req.method === "voice" ? req.transcript : req.text,
            req.method,
            ctx.now,
          );

    const result = validateDraft(raw);
    if (!result.ok) {
      // Si la propia salida no valida, no se propaga: se abre en blanco.
      console.warn("[ai] borrador inválido, se abre vacío:", result.issues);
      return emptyDraft(req.method === "receipt" ? "receipt" : req.method, ctx.now);
    }
    return result.draft;
  },

  async answer(question: string, ctx: AiContext): Promise<AiAnswer> {
    await delay(520);
    return answerFor(question, ctx);
  },
};

/** Insights del panel: mismos datos, mismo calculo. */
export { insightsFor, inPeriod, previousPeriodDelta, category };
