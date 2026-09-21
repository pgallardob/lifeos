import type { EntityStatus, Goal, GoalWithProjects, Priority } from "../../shared/types/index.js";
import { execute, query, queryOne } from "../database/database.js";
import { HttpError } from "../lib/http-error.js";
import { newId } from "../lib/ids.js";
import { logEvent } from "./event.service.js";

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  target_date: string | null;
  status: string;
  priority: string;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    progress: row.progress,
    targetDate: row.target_date,
    status: row.status as EntityStatus,
    priority: row.priority as Priority,
    targetValue: row.target_value,
    currentValue: row.current_value,
    unit: row.unit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface GoalInput {
  title?: string;
  description?: string | null;
  progress?: number | null;
  targetDate?: string | null;
  status?: EntityStatus | null;
  priority?: Priority | null;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string | null;
}

export async function listGoals(status?: EntityStatus): Promise<GoalWithProjects[]> {
  const rows = status
    ? await query<GoalRow>(`SELECT * FROM goals WHERE status = $1 ORDER BY created_at DESC`, [status])
    : await query<GoalRow>(`SELECT * FROM goals ORDER BY created_at DESC`);

  return Promise.all(
    rows.map(async (row) => {
      const projects = await query<{ id: string }>(
        `SELECT id FROM projects WHERE goal_id = $1 ORDER BY created_at ASC`,
        [row.id],
      );
      return { ...toGoal(row), projects: projects.map((p) => p.id) };
    }),
  );
}

export async function getGoal(id: string): Promise<GoalWithProjects> {
  const row = await queryOne<GoalRow>(`SELECT * FROM goals WHERE id = $1`, [id]);
  if (!row) throw HttpError.notFound(`Objetivo "${id}" no encontrado.`);
  const projects = await query<{ id: string }>(
    `SELECT id FROM projects WHERE goal_id = $1 ORDER BY created_at ASC`,
    [id],
  );
  return { ...toGoal(row), projects: projects.map((p) => p.id) };
}

export async function createGoal(input: GoalInput & { title: string }): Promise<Goal> {
  const id = newId("goal");
  await execute(
    `INSERT INTO goals (id, title, description, progress, target_date, status, priority, target_value, current_value, unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      input.title,
      input.description ?? null,
      input.progress ?? 0,
      input.targetDate ?? null,
      input.status ?? "active",
      input.priority ?? "medium",
      input.targetValue ?? null,
      input.currentValue ?? 0,
      input.unit ?? null,
    ],
  );
  await logEvent("goal_created", `Objetivo creado: "${input.title}"`, "goal", id);
  return getGoal(id);
}

export async function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  const existing = await getGoal(id);

  const merged = {
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    progress: input.progress ?? existing.progress,
    targetDate: input.targetDate !== undefined ? input.targetDate : existing.targetDate,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    targetValue: input.targetValue !== undefined ? input.targetValue : existing.targetValue,
    currentValue: input.currentValue ?? existing.currentValue,
    unit: input.unit !== undefined ? input.unit : existing.unit,
  };

  const becameCompleted = merged.status === "completed" && existing.status !== "completed";

  await execute(
    `UPDATE goals SET title = $1, description = $2, progress = $3, target_date = $4, status = $5,
       priority = $6, target_value = $7, current_value = $8, unit = $9, updated_at = now()
     WHERE id = $10`,
    [
      merged.title,
      merged.description,
      merged.progress,
      merged.targetDate,
      merged.status,
      merged.priority,
      merged.targetValue,
      merged.currentValue,
      merged.unit,
      id,
    ],
  );

  if (becameCompleted) {
    await logEvent("goal_completed", `Objetivo completado: "${merged.title}"`, "goal", id);
  }
  return getGoal(id);
}

export async function deleteGoal(id: string): Promise<void> {
  await getGoal(id); // lanza 404 si no existe
  await execute(`DELETE FROM goals WHERE id = $1`, [id]);
}
