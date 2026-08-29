// Resolución determinista de fechas relativas — SUMA_es.md §9.
//
// La IA también recibe la fecha local de hoy en el prompt y puede resolver
// fechas relativas por su cuenta, pero esta capa determinista:
//   1. Es la fuente de verdad para "hoy" (zona horaria local del usuario).
//   2. Sirve para validar/normalizar lo que devuelve el modelo antes de guardar.
//   3. Cubre los casos más comunes sin depender de una llamada al API.
//
// `date` (fecha del gasto) nunca se calcula a partir de `createdAt`; ambas
// se derivan de la fecha de referencia pasada explícitamente (invariante §9).

const WEEKDAY_NAMES: Record<string, number> = {
  domingo: 0,
  sunday: 0,
  lunes: 1,
  monday: 1,
  martes: 2,
  tuesday: 2,
  miercoles: 3,
  miércoles: 3,
  wednesday: 3,
  jueves: 4,
  thursday: 4,
  viernes: 5,
  friday: 5,
  sabado: 6,
  sábado: 6,
  saturday: 6,
};

const MONTH_NAMES: Record<string, number> = {
  enero: 0,
  january: 0,
  febrero: 1,
  february: 1,
  marzo: 2,
  march: 2,
  abril: 3,
  april: 3,
  mayo: 4,
  may: 4,
  junio: 5,
  june: 5,
  julio: 6,
  july: 6,
  agosto: 7,
  august: 7,
  septiembre: 8,
  setiembre: 8,
  september: 8,
  octubre: 9,
  october: 9,
  noviembre: 10,
  november: 10,
  diciembre: 11,
  december: 11,
};

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

/** Formatea usando el calendario local (no UTC) para evitar el corrimiento de un día. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "Hoy" en la fecha/zona horaria local del navegador del usuario. */
export function getLocalToday(referenceDate: Date = new Date()): string {
  return toISODate(referenceDate);
}

function mostRecentWeekday(reference: Date, targetDow: number, includeToday: boolean): Date {
  let cursor = includeToday ? reference : addDays(reference, -1);
  for (let i = 0; i < 7; i++) {
    if (cursor.getDay() === targetDow) return cursor;
    cursor = addDays(cursor, -1);
  }
  return cursor;
}

/**
 * Intenta resolver una expresión de fecha en lenguaje natural (es/en) a
 * YYYY-MM-DD, relativa a `referenceDate` (por defecto, ahora, hora local).
 * Devuelve `undefined` si la expresión no se reconoce — en ese caso, la fecha
 * debe extraerla la IA o preguntarse al usuario (§24), nunca asumirse.
 */
export function resolveRelativeDate(
  expression: string,
  referenceDate: Date = new Date(),
): string | undefined {
  const text = stripAccents(expression.trim().toLowerCase());
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  if (/\b(hoy|today|esta manana|this morning|esta tarde|this afternoon|esta noche|tonight)\b/.test(text)) {
    return toISODate(today);
  }

  if (/\b(manana|tomorrow)\b/.test(text)) {
    return toISODate(addDays(today, 1));
  }

  if (/\b(antier|anteayer|the day before yesterday)\b/.test(text)) {
    return toISODate(addDays(today, -2));
  }

  if (/\b(ayer|yesterday)\b/.test(text)) {
    return toISODate(addDays(today, -1));
  }

  const weeksAgoMatch = text.match(
    /hace\s+(\d+|una|un|dos|tres|cuatro)\s+semanas?|(\d+|one|two|three|four)\s+weeks?\s+ago|last\s+week/,
  );
  if (weeksAgoMatch) {
    if (/last\s+week/.test(text)) return toISODate(addDays(today, -7));
    const raw = weeksAgoMatch[1] ?? weeksAgoMatch[2];
    const n = wordToNumber(raw);
    return toISODate(addDays(today, -7 * n));
  }

  const daysAgoMatch = text.match(
    /hace\s+(\d+|un|una|dos|tres|cuatro|cinco)\s+dias?|(\d+|one|two|three|four|five)\s+days?\s+ago/,
  );
  if (daysAgoMatch) {
    const raw = daysAgoMatch[1] ?? daysAgoMatch[2];
    const n = wordToNumber(raw);
    return toISODate(addDays(today, -n));
  }

  if (/\b(el\s+)?fin\s+de\s+semana\s+pasado|last\s+weekend\b/.test(text)) {
    // Recae en el sábado más reciente antes de hoy.
    return toISODate(mostRecentWeekday(today, 6, false));
  }

  const lastWeekdayMatch = text.match(
    /(?:el\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+pasado|last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
  );
  if (lastWeekdayMatch) {
    const name = lastWeekdayMatch[1] ?? lastWeekdayMatch[2];
    const dow = WEEKDAY_NAMES[name];
    if (dow !== undefined) return toISODate(mostRecentWeekday(today, dow, false));
  }

  const onWeekdayMatch = text.match(
    /\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(el\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/,
  );
  if (onWeekdayMatch) {
    const name = onWeekdayMatch[1] ?? onWeekdayMatch[3];
    const dow = name ? WEEKDAY_NAMES[name] : undefined;
    if (dow !== undefined) return toISODate(mostRecentWeekday(today, dow, true));
  }

  const monthDayMatch = text.match(
    /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/,
  );
  if (monthDayMatch) {
    const month = MONTH_NAMES[monthDayMatch[1]];
    const day = parseInt(monthDayMatch[2], 10);
    let year = today.getFullYear();
    const candidate = new Date(year, month, day);
    if (candidate.getTime() > today.getTime()) year -= 1; // no asumir fechas futuras salvo que se indique
    return toISODate(new Date(year, month, day));
  }

  return undefined;
}

function wordToNumber(raw: string): number {
  const words: Record<string, number> = {
    un: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  };
  if (raw in words) return words[raw];
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 1 : n;
}
