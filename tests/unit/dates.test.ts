import { describe, it, expect } from "vitest";
import { resolveDateExpression } from "@/lib/dates";

const reference = new Date("2026-08-28T10:00:00");

describe("resolveDateExpression", () => {
  it('resolves "hoy" to the reference date', () => {
    expect(resolveDateExpression("hoy", reference)).toEqual({
      date: "2026-08-28",
      resolved: true,
    });
  });

  it('resolves "ayer" to the day before the reference date', () => {
    expect(resolveDateExpression("ayer", reference)).toEqual({
      date: "2026-08-27",
      resolved: true,
    });
  });

  it("resolves an explicit date phrase", () => {
    expect(resolveDateExpression("20 de agosto", reference)).toEqual({
      date: "2026-08-20",
      resolved: true,
    });
  });

  it("marks an unresolvable phrase as not resolved", () => {
    const result = resolveDateExpression("blah blah not a date", reference);
    expect(result.resolved).toBe(false);
  });
});
