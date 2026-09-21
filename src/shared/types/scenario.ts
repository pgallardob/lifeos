import type { ISODateString, RiskLevel } from "./common.js";

/** Variables que un escenario puede modificar (sección 18 del documento). */
export interface ScenarioVariables {
  monthlySavings?: number;
  income?: number;
  expenses?: number;
  availableHoursPerWeek?: number;
  energy?: number;
  focus?: number;
  deadline?: ISODateString;
}

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  variables: ScenarioVariables;
  createdAt: ISODateString;
}

export interface SimulationResult {
  scenarioId: string;
  success: boolean;
  /** Fecha proyectada de cumplimiento del objetivo principal. */
  projectedCompletion: ISODateString | null;
  /** Fecha proyectada con el plan actual (línea base). */
  baselineCompletion: ISODateString | null;
  requiredHoursPerWeek: number;
  riskLevel: RiskLevel;
  /** Serie temporal proyectada: acumulado del objetivo por mes. */
  projection: ProjectionPoint[];
  baseline: ProjectionPoint[];
  /** Objetivos/proyectos afectados por el cambio. */
  affected: AffectedItem[];
  summary: string;
}

export interface ProjectionPoint {
  date: ISODateString;
  value: number;
}

export interface AffectedItem {
  kind: "goal" | "project";
  id: string;
  title: string;
  baselineDate: ISODateString | null;
  projectedDate: ISODateString | null;
}
