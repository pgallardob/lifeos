/**
 * Motor de Insights (sección 19 del documento).
 * Analiza el estado del sistema y genera observaciones accionables:
 * capacidad, riesgo, momentum, deadlines. Función pura, testeable.
 */
import type { Insight, InsightSeverity } from "../shared/types/index.js";
import type { CapacityReport } from "./capacity.js";
import type { RiskReport } from "./risk-engine.js";

export interface InsightInput {
  capacity: CapacityReport;
  /** Riesgo por proyecto activo. */
  projectRisks: { projectId: string; title: string; risk: RiskReport }[];
  /** Tareas completadas en los últimos 7 días. */
  completedLastWeek: number;
  /** Tareas pendientes totales. */
  pendingTasks: number;
  /** Tareas con fecha límite vencida. */
  overdueTasks: number;
  /** Objetivos activos sin proyectos vinculados. */
  goalsWithoutProjects: { id: string; title: string }[];
}

let seq = 0;
function makeInsight(
  severity: InsightSeverity,
  title: string,
  explanation: string,
  action: string | null = null,
): Insight {
  return {
    id: `ins_${++seq}`,
    severity,
    title,
    explanation,
    action,
    createdAt: new Date().toISOString(),
  };
}

export function generateInsights(input: InsightInput): Insight[] {
  seq = 0;
  const out: Insight[] = [];

  // Capacidad
  if (input.capacity.overCapacity) {
    out.push(
      makeInsight(
        "critical",
        "Sobrecarga de capacidad",
        input.capacity.message ?? "Tus compromisos superan tu tiempo disponible.",
        "Pausa un proyecto o amplía plazos",
      ),
    );
  } else if (input.capacity.workloadPct > 75) {
    out.push(
      makeInsight(
        "warning",
        "Capacidad al límite",
        `Estás usando el ${input.capacity.workloadPct}% de tu tiempo semanal.`,
        "Evita añadir más compromisos esta semana",
      ),
    );
  }

  // Riesgo por proyecto
  for (const { projectId, title, risk } of input.projectRisks) {
    if (risk.level === "high") {
      out.push(
        makeInsight(
          "critical",
          `Proyecto en riesgo: ${title}`,
          risk.factors.join("; ") + ".",
          "Revisa plazos o reduce el alcance",
        ),
      );
    } else if (risk.level === "medium") {
      out.push(
        makeInsight(
          "warning",
          `Riesgo moderado: ${title}`,
          risk.factors.join("; ") + ".",
          "Prioriza las tareas críticas",
        ),
      );
    }
  }

  // Tareas atrasadas
  if (input.overdueTasks > 0) {
    out.push(
      makeInsight(
        "warning",
        "Tareas atrasadas",
        `${input.overdueTasks} tarea${input.overdueTasks === 1 ? "" : "s"} superaron su fecha límite.`,
        "Reprograma o elimina las tareas vencidas",
      ),
    );
  }

  // Objetivos sin proyectos
  for (const goal of input.goalsWithoutProjects) {
    out.push(
      makeInsight(
        "info",
        `Objetivo sin plan: ${goal.title}`,
        "Este objetivo no tiene proyectos vinculados.",
        "Crea un proyecto para empezar a avanzar",
      ),
    );
  }

  // Momentum
  if (input.completedLastWeek >= 5) {
    out.push(
      makeInsight(
        "positive",
        "Buen momentum",
        `Completaste ${input.completedLastWeek} tareas esta semana.`,
        "Mantén el ritmo",
      ),
    );
  } else if (input.completedLastWeek === 0 && input.pendingTasks > 0) {
    out.push(
      makeInsight(
        "info",
        "Sin actividad reciente",
        "No completaste tareas esta semana.",
        "Elige una tarea pequeña para recuperar momentum",
      ),
    );
  }

  return out;
}
