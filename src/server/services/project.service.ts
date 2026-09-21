import type { EntityStatus, Priority, Project, ProjectWithRisk } from "../../shared/types/index.js";
import { execute, query, queryOne } from "../database/database.js";
import { HttpError } from "../lib/http-error.js";
import { newId } from "../lib/ids.js";
import { logEvent } from "./event.service.js";
import { getProjectRisk } from "./risk.service.js";

interface ProjectRow {
  id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  priority: string;
  start_date: string | null;
  deadline: string | null;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    description: row.description,
    progress: row.progress,
    status: row.status as EntityStatus,
    priority: row.priority as Priority,
    startDate: row.start_date,
    deadline: row.deadline,
    estimatedHours: row.estimated_hours,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ProjectInput {
  goalId?: string | null;
  title?: string;
  description?: string | null;
  progress?: number | null;
  status?: EntityStatus | null;
  priority?: Priority | null;
  startDate?: string | null;
  deadline?: string | null;
  estimatedHours?: number | null;
}

async function assertGoalExists(goalId: string | null | undefined): Promise<void> {
  if (goalId === null || goalId === undefined) return;
  const exists = await queryOne(`SELECT 1 FROM goals WHERE id = $1`, [goalId]);
  if (!exists) throw HttpError.badRequest(`El objetivo "${goalId}" no existe.`);
}

async function withRisk(project: Project): Promise<ProjectWithRisk> {
  const risk = await getProjectRisk(project.id);
  return { ...project, riskLevel: risk.level, riskScore: risk.score };
}

export async function listProjects(goalId?: string): Promise<ProjectWithRisk[]> {
  const rows = goalId
    ? await query<ProjectRow>(`SELECT * FROM projects WHERE goal_id = $1 ORDER BY created_at DESC`, [goalId])
    : await query<ProjectRow>(`SELECT * FROM projects ORDER BY created_at DESC`);
  return Promise.all(rows.map((row) => withRisk(toProject(row))));
}

export async function getProject(id: string): Promise<ProjectWithRisk> {
  const row = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [id]);
  if (!row) throw HttpError.notFound(`Proyecto "${id}" no encontrado.`);
  return withRisk(toProject(row));
}

export async function createProject(input: ProjectInput & { title: string }): Promise<Project> {
  await assertGoalExists(input.goalId);
  const id = newId("proj");
  await execute(
    `INSERT INTO projects (id, goal_id, title, description, progress, status, priority, start_date, deadline, estimated_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      input.goalId ?? null,
      input.title,
      input.description ?? null,
      input.progress ?? 0,
      input.status ?? "active",
      input.priority ?? "medium",
      input.startDate ?? null,
      input.deadline ?? null,
      input.estimatedHours ?? null,
    ],
  );
  await logEvent("project_created", `Proyecto creado: "${input.title}"`, "project", id);
  return getProject(id);
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const existing = await getProject(id);
  if (input.goalId !== undefined) await assertGoalExists(input.goalId);

  const merged = {
    goalId: input.goalId !== undefined ? input.goalId : existing.goalId,
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    progress: input.progress ?? existing.progress,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    startDate: input.startDate !== undefined ? input.startDate : existing.startDate,
    deadline: input.deadline !== undefined ? input.deadline : existing.deadline,
    estimatedHours:
      input.estimatedHours !== undefined ? input.estimatedHours : existing.estimatedHours,
  };

  const becameCompleted = merged.status === "completed" && existing.status !== "completed";

  await execute(
    `UPDATE projects SET goal_id = $1, title = $2, description = $3, progress = $4, status = $5,
       priority = $6, start_date = $7, deadline = $8, estimated_hours = $9, updated_at = now()
     WHERE id = $10`,
    [
      merged.goalId,
      merged.title,
      merged.description,
      merged.progress,
      merged.status,
      merged.priority,
      merged.startDate,
      merged.deadline,
      merged.estimatedHours,
      id,
    ],
  );

  if (becameCompleted) {
    await logEvent("project_completed", `Proyecto completado: "${merged.title}"`, "project", id);
  }
  return getProject(id);
}

export async function deleteProject(id: string): Promise<void> {
  await getProject(id); // lanza 404 si no existe
  await execute(`DELETE FROM projects WHERE id = $1`, [id]);
}
