import type { Request, Response } from "express";
import type { ScenarioVariables } from "../../shared/types/index.js";
import { HttpError } from "../lib/http-error.js";
import { optDate, optNumber, optString, reqString } from "../lib/validate.js";
import * as simulatorService from "../services/simulator.service.js";

type Body = Record<string, unknown>;

function parseVariables(body: Body): ScenarioVariables {
  const raw = (body.variables ?? body) as Body;
  return {
    monthlySavings: optNumber(raw, "monthlySavings") ?? undefined,
    income: optNumber(raw, "income") ?? undefined,
    expenses: optNumber(raw, "expenses") ?? undefined,
    availableHoursPerWeek: optNumber(raw, "availableHoursPerWeek", 0) ?? undefined,
    energy: optNumber(raw, "energy", 0, 100) ?? undefined,
    focus: optNumber(raw, "focus", 0, 100) ?? undefined,
    deadline: optDate(raw, "deadline") ?? undefined,
  };
}

export async function run(req: Request, res: Response): Promise<void> {
  const body = req.body as Body;
  const name = reqString(body, "name");
  const description = optString(body, "description") ?? null;
  const variables = parseVariables(body);
  if (Object.values(variables).every((v) => v === undefined)) {
    throw HttpError.badRequest("El escenario debe modificar al menos una variable.");
  }
  const result = await simulatorService.runScenario(req.userId, name, description, variables);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await simulatorService.listScenarios(req.userId));
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json(await simulatorService.getScenario(req.userId, req.params.id!));
}
