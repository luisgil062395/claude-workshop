/**
 * Formato de moneda. Las cifras siempre tabulares para que las columnas cuadren.
 *
 * Regla del design system: el monto va en tinta primaria y el signo lo comunica.
 * El unico color permitido en una cifra es el verde de `--positive` para ingresos,
 * tal como aparece en los disenos (assets/screenshots/Container4.png).
 */

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MXN_ROUND = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `$1,234.50` — sin signo. */
export function money(amount: number, currency = "MXN"): string {
  const fmt = currency === "MXN" ? MXN : new Intl.NumberFormat("es-MX", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return fmt.format(Math.abs(amount)).replace(/^MX\$/, "$");
}

/** `$16,150` — redondeado, para totales grandes. */
export function moneyRound(amount: number, currency = "MXN"): string {
  const fmt = currency === "MXN" ? MXN_ROUND : new Intl.NumberFormat("es-MX", {
    style: "currency", currency, maximumFractionDigits: 0,
  });
  return fmt.format(Math.abs(amount)).replace(/^MX\$/, "$");
}

/**
 * Monto con signo explicito. Se usa el menos tipografico U+2212, no el guion.
 * El signo es obligatorio: nunca se comunica ingreso/gasto solo con color.
 */
export function signedMoney(amount: number, isIncome: boolean, currency = "MXN"): string {
  return `${isIncome ? "+" : "−"}${money(amount, currency)}`;
}

/** Aproximado: `~$16,150`. Para totales que la persona lee de un vistazo. */
export function approxMoney(amount: number, currency = "MXN"): string {
  return `~${moneyRound(amount, currency)}`;
}

export function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}
