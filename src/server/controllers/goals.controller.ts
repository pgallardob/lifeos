import type { Request, Response } from "express";
import type { EntityStatus, Priority } from "../../shared/types/index.js";
import { optDate, optEnum, optNumber, optPercent, optString, reqString } from "../lib/validate.js";
import * as goalService from "../services/goal.service.js";

const STATUSES = ["active", "completed", "paused", "archived"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

type Body = Record<string, unknown>;

function parseInput(body: Body, partial: false): goalService.GoalInput & { title: string };
function parseInput(body: Body, partial: true): goalService.GoalInput;
function parseInput(body: Body, partial: boolean): goalService.GoalInput {
  return {
    title: partial ? (optString(body, "title") ?? undefined) : reqString(body, "title"),
    description: optString(body, "description"),
    progress: optPercent(body, "progress"),
    targetDate: optDate(body, "targetDate"),
    status: optEnum<EntityStatus>(body, "status", STATUSES),
    priority: optEnum<Priority>(body, "priority", PRIORITIES),
    targetValue: optNumber(body, "targetValue", 0),
    currentValue: optNumber(body, "currentValue", 0),
    unit: optString(body, "unit", 50),
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const status = req.query.status;
  const filter =
    typeof status === "string" && (STATUSES as readonly string[]).includes(status)
      ? (status as EntityStatus)
      : undefined;
  res.json(await goalService.listGoals(req.userId, filter));
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json(await goalService.getGoal(req.userId, req.params.id!));
}

export async function create(req: Request, res: Response): Promise<void> {
  const goal = await goalService.createGoal(req.userId, parseInput(req.body as Body, false));
  res.status(201).json(goal);
}

export async function update(req: Request, res: Response): Promise<void> {
  const goal = await goalService.updateGoal(req.userId, req.params.id!, parseInput(req.body as Body, true));
  res.json(goal);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await goalService.deleteGoal(req.userId, req.params.id!);
  res.status(204).end();
}
