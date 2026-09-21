import { computeRisk, type RiskReport } from "../../engine/risk-engine.js";
import { queryOne } from "../database/database.js";

/** Calcula el riesgo de un proyecto a partir del estado real de la BD. */
export async function getProjectRisk(userId: string, projectId: string): Promise<RiskReport> {
  const project = await queryOne<{ deadline: string | null; progress: number }>(
    `SELECT deadline, progress FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  if (!project) {
    return { score: 0, level: "low", factors: [] };
  }

  const today = new Date().toISOString().slice(0, 10);

  const stats = (await queryOne<{ pending: number; overdue: number; pending_hours: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status != 'completed')::int AS pending,
       COUNT(*) FILTER (WHERE status != 'completed' AND due_date IS NOT NULL AND due_date < $1)::int AS overdue,
       COALESCE(SUM(CASE WHEN status != 'completed' THEN estimated_hours ELSE 0 END), 0) AS pending_hours
     FROM tasks WHERE project_id = $2 AND user_id = $3`,
    [today, projectId, userId],
  ))!;

  // Tareas del proyecto bloqueadas por dependencias sin completar
  const blocked = (await queryOne<{ n: number }>(
    `SELECT COUNT(DISTINCT d.task_id)::int AS n
     FROM dependencies d
     JOIN tasks t ON t.id = d.task_id
     JOIN tasks req ON req.id = d.depends_on_task_id
     WHERE t.project_id = $1 AND t.user_id = $2 AND t.status != 'completed' AND req.status != 'completed'`,
    [projectId, userId],
  ))!;

  const time = await queryOne<{ available: number }>(
    `SELECT available FROM resources WHERE type = 'time' AND user_id = $1`,
    [userId],
  );

  const daysToDeadline = project.deadline
    ? Math.floor((new Date(project.deadline).getTime() - Date.now()) / 86_400_000)
    : null;

  return computeRisk({
    pendingTasks: stats.pending,
    overdueTasks: stats.overdue,
    blockedTasks: blocked.n,
    daysToDeadline,
    pendingHours: stats.pending_hours,
    weeklyHoursAvailable: time?.available ?? 0,
    progress: project.progress,
  });
}
