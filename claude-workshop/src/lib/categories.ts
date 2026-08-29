import type { ExpenseCategory } from "./types";
import {
  ForkKnife, ShoppingCart, Bus, Bag, House, Receipt, Heartbeat,
  FilmSlate, AirplaneTilt, GraduationCap, User, Repeat, Wallet, DotsThreeCircle,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export type CategoryMeta = {
  id: ExpenseCategory;
  label: string;
  icon: Icon;
  /** Emoji que se muestra en el avatar de la fila de transaccion (ver Figma). */
  emoji: string;
  /** Token de la paleta de datos. El icono, no el color, es el identificador primario. */
  colorVar: string;
};

/**
 * El icono —no el color— es el identificador primario de cada categoria.
 * `colorVar` sigue la paleta de datos de las brand guidelines; el mapeo
 * Comida/Despensa/Transporte/Compras/Otros esta verificado contra
 * assets/screenshots/Container3.png.
 */
export const CATEGORIES: CategoryMeta[] = [
  { id: "food", label: "Comida", icon: ForkKnife, emoji: "\u{1F37D}\u{FE0F}", colorVar: "--chart-1" },
  { id: "groceries", label: "Despensa", icon: ShoppingCart, emoji: "\u{1F6D2}", colorVar: "--chart-2" },
  { id: "transportation", label: "Transporte", icon: Bus, emoji: "\u{1F697}", colorVar: "--chart-3" },
  { id: "shopping", label: "Compras", icon: Bag, emoji: "\u{1F6CD}\u{FE0F}", colorVar: "--chart-6" },
  { id: "housing", label: "Hogar", icon: House, emoji: "\u{1F3E0}", colorVar: "--chart-4" },
  { id: "bills", label: "Servicios", icon: Receipt, emoji: "\u{1F9FE}", colorVar: "--chart-4" },
  { id: "health", label: "Salud", icon: Heartbeat, emoji: "\u{1F48A}", colorVar: "--chart-5" },
  { id: "entertainment", label: "Ocio", icon: FilmSlate, emoji: "\u{1F3AC}", colorVar: "--chart-5" },
  { id: "travel", label: "Viajes", icon: AirplaneTilt, emoji: "\u{2708}\u{FE0F}", colorVar: "--chart-6" },
  { id: "education", label: "Educación", icon: GraduationCap, emoji: "\u{1F393}", colorVar: "--chart-3" },
  { id: "personal", label: "Personal", icon: User, emoji: "\u{1F9F4}", colorVar: "--chart-4" },
  { id: "subscriptions", label: "Suscripciones", icon: Repeat, emoji: "\u{1F504}", colorVar: "--chart-2" },
  { id: "income", label: "Ingreso", icon: Wallet, emoji: "\u{1F4B0}", colorVar: "--chart-1" },
  { id: "other", label: "Otros", icon: DotsThreeCircle, emoji: "\u{1F4E6}", colorVar: "--chart-4" },
];

/** Comercios cuyo emoji es mas reconocible que el de su categoria (ver Figma). */
const MERCHANT_EMOJI: Array<[RegExp, string]> = [
  [/caf[eé]|coffee|starbucks|barista|latte/i, "\u{2615}"],
  [/uber|didi|taxi|cabify/i, "\u{1F697}"],
  [/netflix|spotify|cine|disney|hbo/i, "\u{1F3AC}"],
  [/n[oó]mina|sueldo|salario|quincena|dep[oó]sito/i, "\u{1F4B0}"],
  [/gasolina|pemex|gas /i, "\u{26FD}"],
  [/farmacia|doctor|m[eé]dico/i, "\u{1F48A}"],
];

/** Emoji del avatar: primero el comercio, si no la categoría. */
export function emojiFor(description: string, id: ExpenseCategory | null | undefined): string {
  for (const [re, emoji] of MERCHANT_EMOJI) if (re.test(description)) return emoji;
  return category(id).emoji;
}

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function category(id: ExpenseCategory | null | undefined): CategoryMeta {
  return (id && BY_ID.get(id)) || BY_ID.get("other")!;
}

export function categoryLabel(id: ExpenseCategory | null | undefined): string {
  return id ? category(id).label : "Sin categoría";
}

/** Categorías sugeridas por contexto de inicio elegido en el onboarding. */
export const STARTING_CONTEXTS = [
  { id: "control" as const, label: "Controlar mis gastos", hint: "Comida, transporte, despensa y compras del día a día." },
  { id: "goal" as const, label: "Ahorrar para una meta", hint: "Suma te muestra cuánto puedes apartar cada mes." },
  { id: "understand" as const, label: "Entender en qué se me va", hint: "Suma agrupa y te explica tus patrones." },
];

/** Mapa de palabras clave → categoría. Español primero, inglés como apoyo. */
const KEYWORDS: Array<[ExpenseCategory, string[]]> = [
  ["food", ["café", "cafe", "cafeteria", "cafetería", "restaurante", "restaurant", "comida", "almuerzo", "desayuno", "cena", "taco", "tacos", "pizza", "hamburguesa", "sushi", "starbucks", "comí", "comi", "lunch", "dinner", "breakfast", "coffee", "bar", "cerveza", "antojito", "torta", "fonda", "postre", "helado", "brunch"]],
  ["groceries", ["súper", "super", "supermercado", "mercado", "despensa", "abarrotes", "costco", "walmart", "soriana", "chedraui", "aurrera", "heb", "la comer", "sams", "sam's", "groceries", "grocery", "verdura", "fruta", "carnicería", "carniceria"]],
  ["transportation", ["uber", "didi", "taxi", "cabify", "gasolina", "gas", "metro", "metrobús", "metrobus", "camión", "camion", "autobús", "autobus", "pasaje", "peaje", "caseta", "estacionamiento", "parking", "verificación", "verificacion", "transporte", "bicicleta", "scooter", "vuelo interno"]],
  ["shopping", ["ropa", "zapatos", "tenis", "amazon", "mercado libre", "mercadolibre", "liverpool", "coppel", "zara", "compré", "compre", "tienda", "shopping", "regalo", "electrónica", "electronica", "celular", "audífonos", "audifonos"]],
  ["housing", ["renta", "hipoteca", "mantenimiento", "muebles", "ferretería", "ferreteria", "home depot", "casa", "hogar", "limpieza", "jardín", "jardin", "reparación", "reparacion", "plomero"]],
  ["bills", ["luz", "cfe", "agua", "gas natural", "internet", "telmex", "izzi", "totalplay", "teléfono", "telefono", "recibo", "predial", "servicio", "recarga", "telcel", "at&t", "movistar"]],
  ["health", ["farmacia", "doctor", "médico", "medico", "dentista", "medicina", "hospital", "consulta", "análisis", "analisis", "laboratorio", "seguro médico", "terapia", "psicólogo", "psicologo", "gimnasio", "gym"]],
  ["entertainment", ["cine", "concierto", "boletos", "netflix", "spotify", "juego", "videojuego", "museo", "teatro", "fiesta", "salida", "streaming", "libro", "diversión", "diversion"]],
  ["travel", ["vuelo", "avión", "avion", "hotel", "airbnb", "viaje", "hospedaje", "maleta", "tour", "aeropuerto", "vacaciones"]],
  ["education", ["colegiatura", "curso", "escuela", "universidad", "libros de texto", "material escolar", "clase", "taller", "certificación", "certificacion", "udemy", "platzi"]],
  ["subscriptions", ["suscripción", "suscripcion", "mensualidad", "membresía", "membresia", "plan mensual", "icloud", "google one", "dropbox", "subscription"]],
  ["personal", ["corte de pelo", "peluquería", "peluqueria", "barbería", "barberia", "uñas", "unas", "spa", "cosméticos", "cosmeticos", "maquillaje", "estética", "estetica"]],
  ["income", ["nómina", "nomina", "sueldo", "salario", "me pagaron", "depósito", "deposito", "ingreso", "quincena", "aguinaldo", "bono", "reembolso", "freelance", "factura cobrada"]],
];

/**
 * Infiere una categoría a partir de texto libre.
 * Devuelve `null` cuando no hay señal suficiente — Suma pregunta en vez de adivinar.
 */
export function inferCategory(text: string): { category: ExpenseCategory | null; confidence: number } {
  const haystack = ` ${text.toLowerCase()} `;
  let best: { category: ExpenseCategory; score: number } | null = null;

  for (const [cat, words] of KEYWORDS) {
    for (const word of words) {
      if (!haystack.includes(word)) continue;
      // Palabras más largas y específicas ganan.
      const score = word.length + (haystack.includes(` ${word} `) ? 2 : 0);
      if (!best || score > best.score) best = { category: cat, score };
    }
  }

  if (!best) return { category: null, confidence: 0 };
  return { category: best.category, confidence: Math.min(0.95, 0.55 + best.score / 40) };
}
