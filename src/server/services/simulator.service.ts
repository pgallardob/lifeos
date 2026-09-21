import { runSimulation, type SimGoal, type SimProject } from "../../engine/simulator.js";
import type {
  Scenario,
  ScenarioVariables,
  SimulationResult,
} from "../../shared/types/index.js";
import { execute, query, queryOne } from "../database/database.js";
import { HttpError } from "../lib/http-error.js";
import { newId } from "../lib/ids.js";
import { logEvent } from "./event.service.js";

interface ScenarioRow {
  id: string;
  name: string;
  description: string | null;
  variables: string;
  result: string | null;
  created_at: string;
}

function toScenario(row: ScenarioRow): Scenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    variables: JSON.parse(row.variables) as ScenarioVariables,
    createdAt: row.created_at,
  };
}

/** Construye el estado actual desde la BD y ejecuta el motor de simulación. */
export async function runScenario(name: string, description: string | null, variables: ScenarioVariables): Promise<SimulationResult> {
  const goals = await query<{
    id: string; title: string; target_value: number | null;
    current_value: number; unit: string | null; target_date: string | null;
  }>(
    `SELECT id, title, target_value, current_value, unit, target_date FROM goals WHERE status = 'active'`,
  );
  const simGoals: SimGoal[] = goals.map((g) => ({
    id: g.id,
    title: g.title,
    targetValue: g.target_value,
    currentValue: g.current_value,
    unit: g.unit,
    targetDate: g.target_date,
  }));

  const projects = await query<{
    id: string; title: string; deadline: string | null; pending_hours: number;
  }>(
    `SELECT p.id, p.title, p.deadline,
            COALESCE(SUM(CASE WHEN t.status != 'completed' THEN t.estimated_hours ELSE 0 END), 0) AS pending_hours
     FROM projects p
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.status = 'active'
     GROUP BY p.id`,
  );
  const simProjects: SimProject[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    deadline: p.deadline,
    pendingHours: p.pending_hours,
  }));

  const resources = await query<{ type: string; available: number }>(
    `SELECT type, available FROM resources`,
  );
  const res = (type: string) => resources.find((r) => r.type === type)?.available ?? 0;

  const result = runSimulation({
    variables,
    goals: simGoals,
    projects: simProjects,
    baselineMonthlySavings: res("money"),
    baselineWeeklyHours: res("time"),
  });

  const id = newId("scn");
  await execute(
    `INSERT INTO scenarios (id, name, description, variables, result) VALUES ($1, $2, $3, $4, $5)`,
    [id, name, description, JSON.stringify(variables), JSON.stringify(result)],
  );

  await logEvent("scenario_created", `Escenario creado: "${name}"`, "scenario", id);

  return { scenarioId: id, ...result };
}

export async function listScenarios(): Promise<Scenario[]> {
  const rows = await query<ScenarioRow>(`SELECT * FROM scenarios ORDER BY created_at DESC`);
  return rows.map(toScenario);
}

export async function getScenario(id: string): Promise<Scenario & { result: SimulationResult | null }> {
  const row = await queryOne<ScenarioRow>(`SELECT * FROM scenarios WHERE id = $1`, [id]);
  if (!row) throw HttpError.notFound(`Escenario "${id}" no encontrado.`);
  return {
    ...toScenario(row),
    result: row.result
      ? ({ scenarioId: row.id, ...(JSON.parse(row.result) as object) } as SimulationResult)
      : null,
  };
}
