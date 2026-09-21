/**
 * Motor de simulación (sección 29 del documento).
 *
 * INPUT → CURRENT STATE → VARIABLE CHANGES → DEPENDENCY ANALYSIS
 *       → RESOURCE ANALYSIS → TIME PROJECTION → SCENARIO RESULT
 *
 * Función pura: recibe el estado actual y las variables del escenario,
 * devuelve la proyección. Sin acceso a BD, testeable.
 */
import type {
  AffectedItem,
  ProjectionPoint,
  RiskLevel,
  ScenarioVariables,
  SimulationResult,
} from "../shared/types/index.js";

export interface SimGoal {
  id: string;
  title: string;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  targetDate: string | null;
}

export interface SimProject {
  id: string;
  title: string;
  deadline: string | null;
  /** Horas de trabajo pendiente estimadas. */
  pendingHours: number;
}

export interface SimulationInput {
  variables: ScenarioVariables;
  goals: SimGoal[];
  projects: SimProject[];
  /** Ahorro mensual actual (línea base). */
  baselineMonthlySavings: number;
  /** Horas semanales disponibles actuales (línea base). */
  baselineWeeklyHours: number;
  now?: Date;
}

const MONTH_MS = 30.44 * 86_400_000;
const WEEK_MS = 7 * 86_400_000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Proyecta la fecha en que un objetivo monetario alcanza su meta. */
function projectGoalDate(
  goal: SimGoal,
  monthlyRate: number,
  now: Date,
): Date | null {
  if (goal.targetValue === null || goal.targetValue <= goal.currentValue) return now;
  if (monthlyRate <= 0) return null;
  const remaining = goal.targetValue - goal.currentValue;
  const months = remaining / monthlyRate;
  return new Date(now.getTime() + months * MONTH_MS);
}

/** Serie mensual acumulada hasta alcanzar la meta (o 24 meses máx). */
function buildProjection(
  goal: SimGoal,
  monthlyRate: number,
  now: Date,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [{ date: iso(now), value: goal.currentValue }];
  if (goal.targetValue === null || monthlyRate <= 0) return points;
  let value = goal.currentValue;
  let t = now.getTime();
  for (let i = 0; i < 240 && value < goal.targetValue; i++) {
    t += MONTH_MS;
    value = Math.min(goal.targetValue, value + monthlyRate);
    points.push({ date: iso(new Date(t)), value: Math.round(value) });
  }
  return points;
}

export function runSimulation(input: SimulationInput): Omit<SimulationResult, "scenarioId"> {
  const now = input.now ?? new Date();
  const v = input.variables;

  // ─── VARIABLE CHANGES ───────────────────────────────────────────────────────
  const newSavings =
    v.monthlySavings ??
    (v.income !== undefined && v.expenses !== undefined
      ? v.income - v.expenses
      : input.baselineMonthlySavings);
  const newWeeklyHours = v.availableHoursPerWeek ?? input.baselineWeeklyHours;

  // ─── TIME PROJECTION: objetivos monetarios ──────────────────────────────────
  const moneyGoals = input.goals.filter((g) => g.targetValue !== null && g.targetValue > 0);
  const primary = moneyGoals[0] ?? input.goals.find((g) => g.targetDate) ?? null;

  let baselineCompletion: Date | null = null;
  let projectedCompletion: Date | null = null;
  let projection: ProjectionPoint[] = [];
  let baseline: ProjectionPoint[] = [];

  if (primary) {
    baselineCompletion = projectGoalDate(primary, input.baselineMonthlySavings, now);
    projectedCompletion = projectGoalDate(primary, newSavings, now);
    projection = buildProjection(primary, newSavings, now);
    baseline = buildProjection(primary, input.baselineMonthlySavings, now);
  }

  // ─── RESOURCE ANALYSIS: proyectos por horas ─────────────────────────────────
  const totalPendingHours = input.projects.reduce((s, p) => s + p.pendingHours, 0);
  const requiredHoursPerWeek =
    v.deadline && totalPendingHours > 0
      ? totalPendingHours / Math.max(1, (new Date(v.deadline).getTime() - now.getTime()) / WEEK_MS)
      : 0;

  // ─── AFFECTED: qué cambia respecto a la línea base ──────────────────────────
  const affected: AffectedItem[] = [];
  for (const goal of moneyGoals) {
    const baseDate = projectGoalDate(goal, input.baselineMonthlySavings, now);
    const newDate = projectGoalDate(goal, newSavings, now);
    if (baseDate?.getTime() !== newDate?.getTime()) {
      affected.push({
        kind: "goal",
        id: goal.id,
        title: goal.title,
        baselineDate: baseDate ? iso(baseDate) : null,
        projectedDate: newDate ? iso(newDate) : null,
      });
    }
  }
  for (const proj of input.projects) {
    if (proj.pendingHours <= 0) continue;
    const baseWeeks = input.baselineWeeklyHours > 0 ? proj.pendingHours / input.baselineWeeklyHours : null;
    const newWeeks = newWeeklyHours > 0 ? proj.pendingHours / newWeeklyHours : null;
    const baseDate = baseWeeks !== null ? new Date(now.getTime() + baseWeeks * WEEK_MS) : null;
    const newDate = newWeeks !== null ? new Date(now.getTime() + newWeeks * WEEK_MS) : null;
    if (baseDate?.getTime() !== newDate?.getTime()) {
      affected.push({
        kind: "project",
        id: proj.id,
        title: proj.title,
        baselineDate: baseDate ? iso(baseDate) : null,
        projectedDate: newDate ? iso(newDate) : null,
      });
    }
  }

  // ─── RISK ───────────────────────────────────────────────────────────────────
  let riskLevel: RiskLevel = "low";
  if (v.deadline && requiredHoursPerWeek > newWeeklyHours) riskLevel = "high";
  else if (v.deadline && requiredHoursPerWeek > newWeeklyHours * 0.8) riskLevel = "medium";
  else if (projectedCompletion === null && primary) riskLevel = "medium";

  const success = projectedCompletion !== null || affected.length > 0;

  const summary = buildSummary(primary, baselineCompletion, projectedCompletion, newSavings, input.baselineMonthlySavings);

  return {
    success,
    projectedCompletion: projectedCompletion ? iso(projectedCompletion) : null,
    baselineCompletion: baselineCompletion ? iso(baselineCompletion) : null,
    requiredHoursPerWeek: Math.round(requiredHoursPerWeek * 10) / 10,
    riskLevel,
    projection,
    baseline,
    affected,
    summary,
  };
}

function buildSummary(
  goal: SimGoal | null,
  baselineDate: Date | null,
  projectedDate: Date | null,
  newSavings: number,
  baselineSavings: number,
): string {
  if (!goal) return "Escenario aplicado a proyectos y recursos.";
  const name = goal.title;
  if (!projectedDate) {
    return `Con ${newSavings}/mes el objetivo "${name}" no se alcanza: el ritmo debe ser positivo.`;
  }
  if (!baselineDate) {
    return `Con ${newSavings}/mes el objetivo "${name}" se alcanzaría el ${iso(projectedDate)}.`;
  }
  const diffDays = Math.round((baselineDate.getTime() - projectedDate.getTime()) / 86_400_000);
  if (diffDays > 0) {
    return `Ahorrando ${newSavings}/mes (antes ${baselineSavings}), "${name}" se alcanza ${diffDays} días antes: ${iso(projectedDate)}.`;
  }
  if (diffDays < 0) {
    return `Con ${newSavings}/mes, "${name}" se retrasa ${-diffDays} días: ${iso(projectedDate)}.`;
  }
  return `El escenario no cambia la fecha de "${name}": ${iso(projectedDate)}.`;
}
