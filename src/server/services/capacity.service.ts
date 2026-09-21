import { computeCapacity, type CapacityReport } from "../../engine/capacity.js";
import { query, queryOne } from "../database/database.js";

/** Construye el informe de capacidad a partir del estado real de la BD. */
export async function getCapacityReport(): Promise<CapacityReport> {
  const resources = await query<{ type: string; available: number }>(
    `SELECT type, available FROM resources`,
  );
  const res = (type: string) => resources.find((r) => r.type === type)?.available ?? 0;

  const pending = (await queryOne<{ hours: number; n: number }>(
    `SELECT COALESCE(SUM(estimated_hours), 0) AS hours, COUNT(*)::int AS n
     FROM tasks WHERE status != 'completed'`,
  ))!;

  const activeProjects = (await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM projects WHERE status = 'active'`,
  ))!;

  // Proyectos cuyo rango temporal incluye esta semana
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // lunes
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const ws = weekStart.toISOString().slice(0, 10);
  const we = weekEnd.toISOString().slice(0, 10);

  const overlapping = (await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM projects
     WHERE status = 'active'
       AND (start_date IS NULL OR start_date <= $1)
       AND (deadline IS NULL OR deadline >= $2)`,
    [we, ws],
  ))!;

  return computeCapacity({
    weeklyHoursAvailable: res("time"),
    pendingTaskHours: pending.hours,
    activeProjects: activeProjects.n,
    overlappingProjectsThisWeek: overlapping.n,
    energyPct: res("energy"),
    focusPct: res("focus"),
  });
}
