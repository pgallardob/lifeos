import { describe, expect, it } from "vitest";
import { runSimulation, type SimulationInput } from "../src/engine/simulator.js";

const base: SimulationInput = {
  now: new Date("2026-01-01T00:00:00Z"),
  variables: {},
  goals: [
    {
      id: "goal_1",
      title: "Ahorro",
      targetValue: 12000,
      currentValue: 0,
      unit: "USD",
      targetDate: null,
    },
  ],
  projects: [],
  baselineMonthlySavings: 1000,
  baselineWeeklyHours: 40,
};

describe("runSimulation", () => {
  it("proyecta la fecha de un objetivo monetario", () => {
    const r = runSimulation({ ...base, variables: { monthlySavings: 2000 } });
    expect(r.projectedCompletion).not.toBeNull();
    expect(r.projection.length).toBeGreaterThan(1);
    // 12000 a 2000/mes → 6 meses
    expect(r.projectedCompletion!.slice(0, 7)).toBe("2026-07");
  });

  it("más ahorro → fecha más temprana que la base", () => {
    const r = runSimulation({ ...base, variables: { monthlySavings: 4000 } });
    expect(r.projectedCompletion! < r.baselineCompletion!).toBe(true);
  });

  it("ahorro 0 → no se alcanza", () => {
    const r = runSimulation({ ...base, variables: { monthlySavings: 0 } });
    expect(r.projectedCompletion).toBeNull();
    expect(r.summary).toContain("no se alcanza");
  });

  it("lista los elementos afectados", () => {
    const r = runSimulation({ ...base, variables: { monthlySavings: 2000 } });
    expect(r.affected.some((a) => a.id === "goal_1")).toBe(true);
  });
});
