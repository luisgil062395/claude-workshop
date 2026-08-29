import * as chrono from "chrono-node";

export function resolveDateExpression(
  expression: string,
  referenceDate: Date
): { date: string; resolved: boolean } {
  const parsers = [chrono.es, chrono.en, chrono.casual];
  for (const parser of parsers) {
    const results = parser.parse(expression, referenceDate, {
      forwardDate: false,
    });
    if (results.length > 0) {
      return {
        date: formatDateYYYYMMDD(results[0].start.date()),
        resolved: true,
      };
    }
  }
  return { date: formatDateYYYYMMDD(referenceDate), resolved: false };
}

export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
