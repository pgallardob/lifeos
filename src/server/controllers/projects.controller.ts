import type { Request, Response } from "express";
import type { EntityStatus, Priority } from "../../shared/types/index.js";
import { optDate, optEnum, optNumber, optPercent, optString, reqString } from "../lib/validate.js";
import * as projectService from "../services/project.service.js";
import { getProjectRisk } from "../services/risk.service.js";

const STATUSES = ["active", "completed", "paused", "archived"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

type Body = Record<string, unknown>;

function parseInput(body: Body, partial: false): projectService.ProjectInput & { title: string };
function parseInput(body: Body, partial: true): projectService.ProjectInput;
function parseInput(body: Body, partial: boolean): projectService.ProjectInput {
  return {
    goalId: optString(body, "goalId", 100),
    title: partial ? (optString(body, "title") ?? undefined) : reqString(body, "title"),
    description: optString(body, "description"),
    progress: optPercent(body, "progress"),
    status: optEnum<EntityStatus>(body, "status", STATUSES),
    priority: optEnum<Priority>(body, "priority", PRIORITIES),
    startDate: optDate(body, "startDate"),
    deadline: optDate(body, "deadline"),
    estimatedHours: optNumber(body, "estimatedHours", 0),
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const goalId = typeof req.query.goalId === "string" ? req.query.goalId : undefined;
  res.json(await projectService.listProjects(goalId));
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json(await projectService.getProject(req.params.id!));
}

export async function create(req: Request, res: Response): Promise<void> {
  const project = await projectService.createProject(parseInput(req.body as Body, false));
  res.status(201).json(project);
}

export async function update(req: Request, res: Response): Promise<void> {
  const project = await projectService.updateProject(req.params.id!, parseInput(req.body as Body, true));
  res.json(project);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await projectService.deleteProject(req.params.id!);
  res.status(204).end();
}

export async function risk(req: Request, res: Response): Promise<void> {
  await projectService.getProject(req.params.id!); // 404 si no existe
  res.json(await getProjectRisk(req.params.id!));
}
