/**
 * Risk Engine (sección 30 del documento).
 * Calcula el nivel de riesgo de un proyecto a partir de:
 * tareas atrasadas, dependencias bloqueadas, tiempo restante,
 * cantidad de tareas y margen hasta el deadline.
 * Función pura: sin acceso a BD, testeable.
 */
import type { RiskLevel } from "../shared/types/index.js";

export interface RiskInput {
  /** Tareas pendientes/en curso del proyecto. */
  pendingTasks: number;
  /** Tareas con fecha límite ya vencida. */
  overdueTasks: number;
  /** Tareas bloqueadas por dependencias sin completar. */
  blockedTasks: number;
  /** Días hasta el deadline (negativo si ya pasó; null si no hay). */
  daysToDeadline: number | null;
  /** Horas estimadas pendientes. */
  pendingHours: number;
  /** Horas semanales disponibles del usuario. */
  weeklyHoursAvailable: number;
  /** Progreso actual 0–100. */
  progress: number;
}

export interface RiskReport {
  /** 0–100 */
  score: number;
  level: RiskLevel;
  /** Factores que contribuyen al riesgo, explicados. */
  factors: string[];
}

export function computeRisk(input: RiskInput): RiskReport {
  let score = 0;
  const factors: string[] = [];

  // Tareas atrasadas (hasta 30 pts)
  if (input.overdueTasks > 0) {
    const pts = Math.min(30, input.overdueTasks * 15);
    score += pts;
    factors.push(`${input.overdueTasks} tarea${input.overdueTasks === 1 ? "" : "s"} atrasada${input.overdueTasks === 1 ? "" : "s"}`);
  }

  // Dependencias bloqueadas (hasta 25 pts)
  if (input.blockedTasks > 0) {
    const pts = Math.min(25, input.blockedTasks * 12);
    score += pts;
    factors.push(`${input.blockedTasks} tarea${input.blockedTasks === 1 ? "" : "s"} bloqueada${input.blockedTasks === 1 ? "" : "s"} por dependencias`);
  }

  // Margen hasta el deadline (hasta 30 pts)
  if (input.daysToDeadline !== null) {
    if (input.daysToDeadline < 0) {
      score += 30;
      factors.push("la fecha límite ya pasó");
    } else {
      // Semanas restantes vs. semanas necesarias según horas pendientes
      const weeksLeft = input.daysToDeadline / 7;
      const weeksNeeded =
        input.weeklyHoursAvailable > 0 ? input.pendingHours / input.weeklyHoursAvailable : Infinity;
      if (weeksNeeded > weeksLeft) {
        score += 30;
        factors.push(
          `se necesitan ~${Math.ceil(weeksNeeded)} semanas de trabajo pero quedan ${Math.max(0, Math.floor(weeksLeft))}`,
        );
      } else if (weeksLeft < 1 && input.progress < 90) {
        score += 15;
        factors.push("menos de una semana hasta el límite con trabajo pendiente");
      }
    }
  }

  // Volumen de trabajo restante (hasta 15 pts)
  if (input.pendingTasks > 10) {
    score += 15;
    factors.push(`${input.pendingTasks} tareas pendientes`);
  } else if (input.pendingTasks > 5) {
    score += 8;
    factors.push(`${input.pendingTasks} tareas pendientes`);
  }

  score = Math.min(100, Math.round(score));
  const level: RiskLevel = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  return { score, level, factors };
}
