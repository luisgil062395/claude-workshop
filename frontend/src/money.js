// Display formatting only. Never arithmetic: every figure SUMA shows comes
// already computed from Django, as a decimal string.

const format = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const whole = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** "45000.00" -> "$45,000.00" */
export function pesos(value) {
  if (value === null || value === undefined) return "—";
  return `$${format.format(Number(value))}`;
}

/** "45000.00" -> "$45,000" — for headline figures where cents are noise. */
export function pesosShort(value) {
  if (value === null || value === undefined) return "—";
  return `$${whole.format(Number(value))}`;
}

/** "3.2" -> "3.2 meses" / "1.0" -> "1 mes" */
export function monthsLabel(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return n === 1 ? "1 mes" : `${value} meses`;
}
