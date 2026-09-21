import type { Dependency, Priority, Task, TaskStatus } from "../../shared/types/index.js";
import { execute, query, queryOne } from "../database/database.js";
import { HttpError } from "../lib/http-error.js";
import { newId } from "../lib/ids.js";
import { logEvent } from "./event.service.js";

interface TaskRow {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimated_hours: number | null;
  due_date: string | null;
  completed_at: string | null;
  focused_minutes: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface DependencyRow {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as Priority,
    estimatedHours: row.estimated_hours,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    focusedMinutes: row.focused_minutes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDependency(row: DependencyRow): Dependency {
  return {
    id: row.id,
    taskId: row.task_id,
    dependsOnTaskId: row.depends_on_task_id,
    createdAt: row.created_at,
  };
}

export interface TaskInput {
  projectId?: string | null;
  title?: string;
  description?: string | null;
  status?: TaskStatus | null;
  priority?: Priority | null;
  estimatedHours?: number | null;
  dueDate?: string | null;
  sortOrder?: number | null;
  focusedMinutes?: number | null;
}

async function assertProjectExists(userId: string, projectId: string | null | undefined): Promise<void> {
  if (projectId === null || projectId === undefined) return;
  const exists = await queryOne(`SELECT 1 FROM projects WHERE id = $1 AND user_id = $2`, [projectId, userId]);
  if (!exists) throw HttpError.badRequest(`El proyecto "${projectId}" no existe.`);
}

/** Recalcula el progreso del proyecto como % de tareas completadas. */
async function recalcProjectProgress(userId: string, projectId: string | null): Promise<void> {
  if (!projectId) return;
  await execute(
    `UPDATE projects SET
       progress = COALESCE(
         (SELECT ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*))
          FROM tasks WHERE project_id = $1 AND user_id = $2),
         0),
       updated_at = now()
     WHERE id = $3 AND user_id = $4`,
    [projectId, userId, projectId, userId],
  );
}

export async function listTasks(userId: string, filters: { projectId?: string; status?: TaskStatus }): Promise<Task[]> {
  const conditions: string[] = [];
  const params: unknown[] = [userId];
  conditions.push(`user_id = $1`);
  if (filters.projectId) {
    params.push(filters.projectId);
    conditions.push(`project_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const rows = await query<TaskRow>(
    `SELECT * FROM tasks ${where} ORDER BY sort_order ASC, created_at ASC`,
    params,
  );
  return rows.map(toTask);
}

export async function getTask(userId: string, id: string): Promise<Task> {
  const row = await queryOne<TaskRow>(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!row) throw HttpError.notFound(`Tarea "${id}" no encontrada.`);
  return toTask(row);
}

export async function createTask(userId: string, input: TaskInput & { title: string }): Promise<Task> {
  await assertProjectExists(userId, input.projectId);
  const id = newId("task");
  const maxOrder = input.projectId
    ? (await queryOne<{ m: number }>(
        `SELECT COALESCE(MAX(sort_order), -1)::int AS m FROM tasks WHERE project_id = $1 AND user_id = $2`,
        [input.projectId, userId],
      ))!.m
    : -1;
  await execute(
    `INSERT INTO tasks (id, user_id, project_id, title, description, status, priority, estimated_hours, due_date, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      userId,
      input.projectId ?? null,
      input.title,
      input.description ?? null,
      input.status ?? "pending",
      input.priority ?? "medium",
      input.estimatedHours ?? null,
      input.dueDate ?? null,
      input.sortOrder ?? maxOrder + 1,
    ],
  );
  await logEvent(userId, "task_created", `Tarea creada: "${input.title}"`, "task", id);
  await recalcProjectProgress(userId, input.projectId ?? null);
  return getTask(userId, id);
}

export async function updateTask(userId: string, id: string, input: TaskInput): Promise<Task> {
  const existing = await getTask(userId, id);
  if (input.projectId !== undefined) await assertProjectExists(userId, input.projectId);

  const merged = {
    projectId: input.projectId !== undefined ? input.projectId : existing.projectId,
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    estimatedHours:
      input.estimatedHours !== undefined ? input.estimatedHours : existing.estimatedHours,
    dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    focusedMinutes: input.focusedMinutes ?? existing.focusedMinutes,
  };

  const becameCompleted = merged.status === "completed" && existing.status !== "completed";
  const gainedFocus = merged.focusedMinutes > existing.focusedMinutes;
  const completedAt = becameCompleted
    ? new Date().toISOString()
    : merged.status !== "completed"
      ? null
      : existing.completedAt;

  await execute(
    `UPDATE tasks SET project_id = $1, title = $2, description = $3, status = $4, priority = $5,
       estimated_hours = $6, due_date = $7, sort_order = $8, completed_at = $9,
       focused_minutes = $10, updated_at = now()
     WHERE id = $11 AND user_id = $12`,
    [
      merged.projectId,
      merged.title,
      merged.description,
      merged.status,
      merged.priority,
      merged.estimatedHours,
      merged.dueDate,
      merged.sortOrder,
      completedAt,
      merged.focusedMinutes,
      id,
      userId,
    ],
  );

  if (becameCompleted) {
    await logEvent(userId, "task_completed", `Tarea completada: "${merged.title}"`, "task", id);
  }
  if (gainedFocus) {
    const mins = merged.focusedMinutes - existing.focusedMinutes;
    await logEvent(userId, "focus_session", `Sesión de enfoque: ${mins} min en "${merged.title}"`, "task", id);
  }
  await recalcProjectProgress(userId, existing.projectId);
  if (merged.projectId !== existing.projectId) await recalcProjectProgress(userId, merged.projectId);
  return getTask(userId, id);
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const existing = await getTask(userId, id);
  await execute(`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, [id, userId]);
  await recalcProjectProgress(userId, existing.projectId);
}

// ─── Dependencias entre tareas ────────────────────────────────────────────────

export async function listDependencies(userId: string, taskId?: string): Promise<Dependency[]> {
  const rows = taskId
    ? await query<DependencyRow>(`SELECT * FROM dependencies WHERE user_id = $1 AND task_id = $2`, [userId, taskId])
    : await query<DependencyRow>(`SELECT * FROM dependencies WHERE user_id = $1`, [userId]);
  return rows.map(toDependency);
}

/** Detecta si añadir taskId → dependsOnTaskId crearía un ciclo (solo dentro del usuario). */
async function wouldCreateCycle(userId: string, taskId: string, dependsOnTaskId: string): Promise<boolean> {
  // Recorre el grafo desde dependsOnTaskId siguiendo "depende de"; si llega a taskId hay ciclo.
  const visited = new Set<string>();
  const queue = [dependsOnTaskId];
  while (queue.length) {
    const current = queue.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const rows = await query<{ depends_on_task_id: string }>(
      `SELECT depends_on_task_id FROM dependencies WHERE task_id = $1 AND user_id = $2`,
      [current, userId],
    );
    for (const row of rows) queue.push(row.depends_on_task_id);
  }
  return false;
}

export async function addDependency(userId: string, taskId: string, dependsOnTaskId: string): Promise<Dependency> {
  await getTask(userId, taskId);
  await getTask(userId, dependsOnTaskId);
  if (taskId === dependsOnTaskId) {
    throw HttpError.badRequest("Una tarea no puede depender de sí misma.");
  }
  if (await wouldCreateCycle(userId, taskId, dependsOnTaskId)) {
    throw HttpError.conflict("La dependencia crearía un ciclo entre tareas.");
  }
  const existing = await queryOne<DependencyRow>(
    `SELECT * FROM dependencies WHERE task_id = $1 AND depends_on_task_id = $2 AND user_id = $3`,
    [taskId, dependsOnTaskId, userId],
  );
  if (existing) return toDependency(existing);

  const id = newId("dep");
  await execute(
    `INSERT INTO dependencies (id, user_id, task_id, depends_on_task_id) VALUES ($1, $2, $3, $4)`,
    [id, userId, taskId, dependsOnTaskId],
  );
  return toDependency(
    (await queryOne<DependencyRow>(`SELECT * FROM dependencies WHERE id = $1 AND user_id = $2`, [id, userId]))!,
  );
}

export async function removeDependency(userId: string, taskId: string, dependsOnTaskId: string): Promise<void> {
  const result = await execute(
    `DELETE FROM dependencies WHERE task_id = $1 AND depends_on_task_id = $2 AND user_id = $3`,
    [taskId, dependsOnTaskId, userId],
  );
  if (result.rowCount === 0) {
    throw HttpError.notFound("La dependencia no existe.");
  }
}
