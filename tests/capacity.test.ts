import { describe, expect, it } from "vitest";
import { computeCapacity, type CapacityInput } from "../src/engine/capacity.js";

const base: CapacityInput = {
  weeklyHoursAvailable: 40,
  pendingTaskHours: 20,
  activeProjects: 2,
  overlappingProjectsThisWeek: 1,
  energyPct: 80,
  focusPct: 80,
};

describe("computeCapacity", () => {
  it("calcula el porcentaje de carga", () => {
    const r = computeCapacity(base);
    expect(r.workloadPct).toBe(50);
    expect(r.overCapacity).toBe(false);
  });

  it("marca sobrecarga cuando lo comprometido supera lo disponible", () => {
    const r = computeCapacity({ ...base, pendingTaskHours: 45 });
    expect(r.overCapacity).toBe(true);
    expect(r.workloadPct).toBeGreaterThan(100);
  });

  it("reduce la capacidad con energía/foco bajos", () => {
    const high = computeCapacity(base);
    const low = computeCapacity({ ...base, energyPct: 20, focusPct: 20 });
    expect(low.overallPct).toBeLessThan(high.overallPct);
  });

  it("devuelve un mensaje accionable al sobrecargar", () => {
    const r = computeCapacity({ ...base, pendingTaskHours: 60 });
    expect(typeof r.message).toBe("string");
    expect(r.message!.length).toBeGreaterThan(0);
  });

  it("sin sobrecarga ni solapes → sin mensaje", () => {
    const r = computeCapacity(base);
    expect(r.message).toBeNull();
  });
});
