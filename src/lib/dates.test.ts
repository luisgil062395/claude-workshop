import { describe, expect, it } from "vitest";
import { getLocalToday, resolveRelativeDate, toISODate } from "./dates";

// Fecha de referencia fija para que las pruebas sean deterministas: sábado.
const REFERENCE = new Date(2026, 7, 29); // 2026-08-29

describe("toISODate / getLocalToday", () => {
  it("formatea con el calendario local, sin corrimiento UTC", () => {
    expect(toISODate(REFERENCE)).toBe("2026-08-29");
    expect(getLocalToday(REFERENCE)).toBe("2026-08-29");
  });
});

describe("resolveRelativeDate", () => {
  it("resuelve 'hoy' / 'today'", () => {
    expect(resolveRelativeDate("hoy", REFERENCE)).toBe("2026-08-29");
    expect(resolveRelativeDate("today", REFERENCE)).toBe("2026-08-29");
  });

  it("resuelve 'ayer' / 'yesterday' (escenario §28 del spec)", () => {
    expect(resolveRelativeDate("ayer", REFERENCE)).toBe("2026-08-28");
    expect(resolveRelativeDate("Yesterday I spent 250 pesos at Soriana", REFERENCE)).toBe("2026-08-28");
  });

  it("resuelve 'antier' / 'two days ago'", () => {
    expect(resolveRelativeDate("antier", REFERENCE)).toBe("2026-08-27");
    expect(resolveRelativeDate("two days ago", REFERENCE)).toBe("2026-08-27");
  });

  it("resuelve 'mañana' / 'tomorrow'", () => {
    expect(resolveRelativeDate("mañana", REFERENCE)).toBe("2026-08-30");
    expect(resolveRelativeDate("tomorrow", REFERENCE)).toBe("2026-08-30");
  });

  it("resuelve 'el viernes pasado' / 'last Friday' al viernes más reciente", () => {
    expect(resolveRelativeDate("el viernes pasado", REFERENCE)).toBe("2026-08-28");
    expect(resolveRelativeDate("last Friday", REFERENCE)).toBe("2026-08-28");
  });

  it("resuelve 'on Monday' al lunes más reciente (incluyendo hoy)", () => {
    expect(resolveRelativeDate("on Monday", REFERENCE)).toBe("2026-08-24");
  });

  it("resuelve 'el fin de semana pasado' / 'last weekend'", () => {
    expect(resolveRelativeDate("el fin de semana pasado", REFERENCE)).toBe("2026-08-22");
    expect(resolveRelativeDate("last weekend", REFERENCE)).toBe("2026-08-22");
  });

  it("resuelve 'hace dos semanas'", () => {
    expect(resolveRelativeDate("hace dos semanas", REFERENCE)).toBe("2026-08-15");
  });

  it("resuelve fechas explícitas 'August 20' / 'August 20th' sin asumir año futuro", () => {
    expect(resolveRelativeDate("August 20", REFERENCE)).toBe("2026-08-20");
    expect(resolveRelativeDate("August 20th", REFERENCE)).toBe("2026-08-20");
  });

  it("nunca asume una fecha futura para un día/mes ya pasado este año", () => {
    // Si el mes/día ya pasó este año, no debe interpretarse como el año próximo.
    expect(resolveRelativeDate("December 31", REFERENCE)).toBe("2025-12-31");
  });

  it("devuelve undefined si no reconoce la expresión (no inventa una fecha)", () => {
    expect(resolveRelativeDate("algún día de la próxima década", REFERENCE)).toBeUndefined();
  });
});
