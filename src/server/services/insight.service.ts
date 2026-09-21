import { generateInsights } from "../../engine/insights.js";
import type { Insight } from "../../shared/types/index.js";
import { query, queryOne } from "../database/database.js";
import { getCapacityReport } from "./capacity.service.js";
import { getProjectRisk } from "./risk.service.js";

/** Genera los insights actuales a partir del estado real de la BD. */
export async function getInsights(): Promise<Insight[]> {
  const capacity = await getCapacityReport();

  const activeProjects = await query<{ id: string; title: string }>(
    `SELECT id, title FROM projects WHERE status = 'active'`,
  );
  const projectRisks = await Promise.all(
    activeProjects.map(async (p) => ({
      projectId: p.id,
      title: p.title,
      risk: await getProjectRisk(p.id),
    })),
  );

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const completedLastWeek = (await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM tasks WHERE completed_at >= $1`,
    [weekAgo],
  ))!;

  const taskStats = (await queryOne<{ pending: number; overdue: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status != 'completed')::int AS pending,
       COUNT(*) FILTER (WHERE status != 'completed' AND due_date IS NOT NULL AND due_date < $1)::int AS overdue
     FROM tasks`,
    [new Date().toISOString().slice(0, 10)],
  ))!;

  const goalsWithoutProjects = await query<{ id: string; title: string }>(
    `SELECT g.id, g.title FROM goals g
     WHERE g.status = 'active'
       AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.goal_id = g.id)`,
  );

  return generateInsights({
    capacity,
    projectRisks,
    completedLastWeek: completedLastWeek.n,
    pendingTasks: taskStats.pending,
    overdueTasks: taskStats.overdue,
    goalsWithoutProjects,
  });
}
