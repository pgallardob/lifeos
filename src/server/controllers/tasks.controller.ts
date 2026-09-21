import type { Request, Response } from "express";
import type { Priority, TaskStatus } from "../../shared/types/index.js";
import { HttpError } from "../lib/http-error.js";
import { optDate, optEnum, optNumber, optString, reqString } from "../lib/validate.js";
import * as taskService from "../services/task.service.js";

const STATUSES = ["pending", "in_progress", "completed", "blocked"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

type Body = Record<string, unknown>;

function parseInput(body: Body, partial: false): taskService.TaskInput & { title: string };
function parseInput(body: Body, partial: true): taskService.TaskInput;
function parseInput(body: Body, partial: boolean): taskService.TaskInput {
  return {
    projectId: optString(body, "projectId", 100),
    title: partial ? (optString(body, "title") ?? undefined) : reqString(body, "title"),
    description: optString(body, "description"),
    status: optEnum<TaskStatus>(body, "status", STATUSES),
    priority: optEnum<Priority>(body, "priority", PRIORITIES),
    estimatedHours: optNumber(body, "estimatedHours", 0),
    dueDate: optDate(body, "dueDate"),
    sortOrder: optNumber(body, "sortOrder", 0),
    focusedMinutes: optNumber(body, "focusedMinutes", 0),
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  const statusQ = req.query.status;
  const status =
    typeof statusQ === "string" && (STATUSES as readonly string[]).includes(statusQ)
      ? (statusQ as TaskStatus)
      : undefined;
  res.json(await taskService.listTasks(req.userId, { projectId, status }));
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json(await taskService.getTask(req.userId, req.params.id!));
}

export async function create(req: Request, res: Response): Promise<void> {
  const task = await taskService.createTask(req.userId, parseInput(req.body as Body, false));
  res.status(201).json(task);
}

export async function update(req: Request, res: Response): Promise<void> {
  const task = await taskService.updateTask(req.userId, req.params.id!, parseInput(req.body as Body, true));
  res.json(task);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await taskService.deleteTask(req.userId, req.params.id!);
  res.status(204).end();
}

// ─── Dependencias ─────────────────────────────────────────────────────────────

export async function listDependencies(req: Request, res: Response): Promise<void> {
  const taskId = typeof req.query.taskId === "string" ? req.query.taskId : undefined;
  res.json(await taskService.listDependencies(req.userId, taskId));
}

export async function addDependency(req: Request, res: Response): Promise<void> {
  const dependsOnTaskId = (req.body as Body).dependsOnTaskId;
  if (typeof dependsOnTaskId !== "string" || !dependsOnTaskId) {
    throw HttpError.badRequest('El campo "dependsOnTaskId" es obligatorio.');
  }
  const dep = await taskService.addDependency(req.userId, req.params.id!, dependsOnTaskId);
  res.status(201).json(dep);
}

export async function removeDependency(req: Request, res: Response): Promise<void> {
  await taskService.removeDependency(req.userId, req.params.id!, req.params.dependsOnId!);
  res.status(204).end();
}
