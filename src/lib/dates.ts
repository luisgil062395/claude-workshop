/**
 * Resolución de fechas contra la fecha local y la zona horaria de la persona.
 *
 * Distinción crítica del producto:
 *   `date`      — cuándo ocurrió el gasto.
 *   `createdAt` — cuándo se registró.
 * Nunca se sobrescribe `date` con la fecha de registro si se dijo otra cosa.
 */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function startOfWeek(d: Date): Date {
  // Semana de lunes a domingo (convención es-MX).
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (copy.getDay() + 6) % 7;
  return addDays(copy, -day);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = fromISODate(toISODate(b)).getTime() - fromISODate(toISODate(a)).getTime();
  return Math.round(ms / 86_400_000);
}

const MONTHS: Record<string, number> = {
  enero: 0, ene: 0, january: 0, jan: 0,
  febrero: 1, feb: 1, february: 1,
  marzo: 2, mar: 2, march: 2,
  abril: 3, abr: 3, april: 3, apr: 3,
  mayo: 4, may: 4,
  junio: 5, jun: 5, june: 5,
  julio: 6, jul: 6, july: 6,
  agosto: 7, ago: 7, august: 7, aug: 7,
  septiembre: 8, sep: 8, sept: 8, september: 8, setiembre: 8,
  octubre: 9, oct: 9, october: 9,
  noviembre: 10, nov: 10, november: 10,
  diciembre: 11, dic: 11, december: 11, dec: 11,
};

/** lunes = 1 … domingo = 0, igual que Date.getDay(). */
const WEEKDAYS: Record<string, number> = {
  domingo: 0, sunday: 0, sun: 0, dom: 0,
  lunes: 1, monday: 1, mon: 1, lun: 1,
  martes: 2, tuesday: 2, tue: 2, mar: 2,
  miercoles: 3, "miércoles": 3, wednesday: 3, wed: 3, mie: 3, "mié": 3,
  jueves: 4, thursday: 4, thu: 4, jue: 4,
  viernes: 5, friday: 5, fri: 5, vie: 5,
  sabado: 6, "sábado": 6, saturday: 6, sat: 6, sab: 6, "sáb": 6,
};

const SPELLED_NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, one: 1,
  dos: 2, two: 2,
  tres: 3, three: 3,
  cuatro: 4, four: 4,
  cinco: 5, five: 5,
  seis: 6, six: 6,
  siete: 7, seven: 7,
  ocho: 8, eight: 8,
  nueve: 9, nine: 9,
  diez: 10, ten: 10,
};

export type DateResolution = {
  /** YYYY-MM-DD, o null si el texto no menciona fecha. */
  date: string | null;
  /** Fragmento del texto que produjo la fecha, para poder explicarlo. */
  matched: string | null;
  /** Frase legible: "ayer", "el viernes pasado". */
  phrase: string | null;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Extrae una expresión de fecha del texto y la resuelve contra `now`.
 * No inventa: si no hay expresión, devuelve `date: null` y el pipeline
 * usará la fecha de hoy marcándola como supuesto revisable.
 */
export function resolveDateExpression(input: string, now = new Date()): DateResolution {
  const text = norm(input);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hit = (d: Date, matched: string, phrase: string): DateResolution => ({
    date: toISODate(d),
    matched,
    phrase,
  });

  // --- Días relativos directos ---
  if (/\banteayer\b|\bantier\b|\bantes de ayer\b/.test(text)) return hit(addDays(today, -2), "anteayer", "anteayer");
  if (/\bayer\b|\byesterday\b/.test(text)) return hit(addDays(today, -1), "ayer", "ayer");
  if (/\bpasado ma[ñn]ana\b|\bday after tomorrow\b/.test(text)) return hit(addDays(today, 2), "pasado mañana", "pasado mañana");
  if (/\banoche\b|\blast night\b/.test(text)) return hit(addDays(today, -1), "anoche", "anoche");
  if (/\besta ma[ñn]ana\b|\bthis morning\b|\besta tarde\b|\besta noche\b|\bhoy\b|\btoday\b/.test(text)) {
    const m = text.match(/esta ma[ñn]ana|this morning|esta tarde|esta noche|hoy|today/);
    return hit(today, m?.[0] ?? "hoy", "hoy");
  }
  // "mañana" solo cuenta como futuro si no venía de "esta mañana" (ya cubierto arriba).
  if (/\bma[ñn]ana\b|\btomorrow\b/.test(text)) return hit(addDays(today, 1), "mañana", "mañana");

  // --- "hace N días / semanas" · "N days ago" ---
  const ago = text.match(/\bhace\s+(\d+|[a-záéíóú]+)\s+(d[ií]as?|semanas?|meses?|mes)\b/)
    ?? text.match(/\b(\d+|[a-z]+)\s+(days?|weeks?|months?)\s+ago\b/);
  if (ago) {
    const raw = ago[1];
    const n = /^\d+$/.test(raw) ? Number(raw) : SPELLED_NUMBERS[raw];
    if (n && n > 0) {
      const unit = ago[2];
      if (/d[ií]a|day/.test(unit)) return hit(addDays(today, -n), ago[0], ago[0]);
      if (/semana|week/.test(unit)) return hit(addDays(today, -n * 7), ago[0], ago[0]);
      const d = new Date(today);
      d.setMonth(d.getMonth() - n);
      return hit(d, ago[0], ago[0]);
    }
  }

  // --- "el fin de semana pasado" → sábado anterior ---
  if (/\bfin de semana pasado\b|\blast weekend\b/.test(text)) {
    const back = ((today.getDay() - 6) + 7) % 7 || 7;
    return hit(addDays(today, -back), "fin de semana pasado", "el fin de semana pasado");
  }

  // --- Día de la semana: "el viernes pasado", "el lunes", "on monday" ---
  const wd = text.match(/\b(?:el\s+|on\s+|este\s+)?(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b(\s+pasado)?/);
  if (wd) {
    const target = WEEKDAYS[wd[1]];
    if (target !== undefined) {
      let back = (today.getDay() - target + 7) % 7;
      // "el viernes pasado" o el mismo día de hoy → la ocurrencia anterior.
      if (back === 0) back = 7;
      if (wd[2] && back < 7) back += 0; // "pasado" ya implica la ocurrencia anterior
      return hit(addDays(today, -back), wd[0], wd[0].trim());
    }
  }

  // --- "20 de agosto" / "20 de agosto de 2026" ---
  const esDate = text.match(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:de|del)\s+(\d{4}))?/);
  if (esDate) {
    const month = MONTHS[esDate[2]];
    const day = Number(esDate[1]);
    if (month !== undefined && day >= 1 && day <= 31) {
      const year = esDate[3] ? Number(esDate[3]) : inferYear(month, day, today);
      return hit(new Date(year, month, day), esDate[0], esDate[0]);
    }
  }

  // --- "August 20" / "agosto 20" / "Aug 20th" ---
  const enDate = text.match(/\b([a-záéíóú]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/);
  if (enDate) {
    const month = MONTHS[enDate[1]];
    const day = Number(enDate[2]);
    if (month !== undefined && day >= 1 && day <= 31) {
      const year = enDate[3] ? Number(enDate[3]) : inferYear(month, day, today);
      return hit(new Date(year, month, day), enDate[0], enDate[0]);
    }
  }

  // --- Formatos numéricos: 2026-08-28, 28/08/2026, 28/08 ---
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return hit(new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])), iso[0], iso[0]);

  const slash = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    if (day <= 31 && month >= 0 && month <= 11) {
      let year = slash[3] ? Number(slash[3]) : inferYear(month, day, today);
      if (year < 100) year += 2000;
      return hit(new Date(year, month, day), slash[0], slash[0]);
    }
  }

  return { date: null, matched: null, phrase: null };
}

/** Una fecha sin año se interpreta como la más reciente que ya ocurrió. */
function inferYear(month: number, day: number, today: Date): number {
  const candidate = new Date(today.getFullYear(), month, day);
  return candidate.getTime() > today.getTime() + 86_400_000 ? today.getFullYear() - 1 : today.getFullYear();
}

const DAY_LABEL = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" });
const DAY_SHORT = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const WEEKDAY_LABEL = new Intl.DateTimeFormat("es-MX", { weekday: "long" });
const TIME_LABEL = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });

/** "Hoy", "Ayer", "martes 26 de agosto" — para encabezados de historial. */
export function humanDate(iso: string, now = new Date()): string {
  const diff = daysBetween(fromISODate(iso), now);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  const d = fromISODate(iso);
  if (diff > 1 && diff < 7) return `${WEEKDAY_LABEL.format(d)} ${DAY_LABEL.format(d)}`;
  return DAY_LABEL.format(d);
}

export function shortDate(iso: string): string {
  return DAY_SHORT.format(fromISODate(iso));
}

export function timeOf(isoTimestamp: string): string {
  return TIME_LABEL.format(new Date(isoTimestamp));
}

export const MONTH_SHORT = new Intl.DateTimeFormat("es-MX", { month: "short" });
export const MONTH_LONG = new Intl.DateTimeFormat("es-MX", { month: "long" });

/**
 * "Hoy", "Ayer", "Hace 3 días", "12 de agosto".
 * Es la forma que usan las filas de transacción en los diseños de Figma
 * (assets/screenshots/Container4.png).
 */
export function relativeDay(iso: string, now = new Date()): string {
  const diff = daysBetween(fromISODate(iso), now);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  if (diff > 1 && diff <= 7) return `Hace ${diff} días`;
  return DAY_LABEL.format(fromISODate(iso));
}
