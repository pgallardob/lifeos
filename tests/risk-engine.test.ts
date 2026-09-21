import { describe, expect, it } from "vitest";
import { computeRisk, type RiskInput } from "../src/engine/risk-engine.js";

const base: RiskInput = {
  pendingTasks: 0,
  overdueTasks: 0,
  blockedTasks: 0,
  daysToDeadline: null,
  pendingHours: 0,
  weeklyHoursAvailable: 40,
  progress: 0,
};

describe("computeRisk", () => {
  it("proyecto sin tareas ni deadline → riesgo bajo", () => {
    const r = computeRisk(base);
    expect(r.level).toBe("low");
    expect(r.score).toBe(0);
  });

  it("deadline cercano con muchas horas pendientes → riesgo alto", () => {
    const r = computeRisk({
      ...base,
      daysToDeadline: 2,
      pendingTasks: 12,
      pendingHours: 80,
      overdueTasks: 1,
    });
    expect(r.level).toBe("high");
    expect(r.factors.length).toBeGreaterThan(0);
  });

  it("tareas bloqueadas elevan el riesgo", () => {
    const r = computeRisk({ ...base, blockedTasks: 2, pendingTasks: 2 });
    expect(r.score).toBeGreaterThan(0);
    expect(r.factors.some((f) => f.includes("bloqueada"))).toBe(true);
  });

  it("deadline ya pasado con trabajo pendiente → riesgo alto", () => {
    const r = computeRisk({
      ...base,
      daysToDeadline: -3,
      pendingTasks: 12,
      overdueTasks: 2,
    });
    expect(r.level).toBe("high");
  });

  it("todo completado con margen → riesgo bajo", () => {
    const r = computeRisk({ ...base, daysToDeadline: 30, progress: 100 });
    expect(r.level).toBe("low");
  });
});
