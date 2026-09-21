/**
 * Capacity Engine (sección 21 del documento).
 * Determina si el usuario está intentando hacer más de lo que sus
 * recursos permiten. Función pura: sin acceso a BD, testeable.
 */

export interface CapacityInput {
  /** Horas disponibles por semana (recurso "time"). */
  weeklyHoursAvailable: number;
  /** Horas estimadas de todas las tareas pendientes. */
  pendingTaskHours: number;
  /** Proyectos activos. */
  activeProjects: number;
  /** Proyectos cuyo rango [inicio, límite] incluye esta semana. */
  overlappingProjectsThisWeek: number;
  /** Energía disponible 0–100. */
  energyPct: number;
  /** Foco disponible 0–100. */
  focusPct: number;
}

export interface CapacityReport {
  /** % del tiempo semanal ya comprometido por tareas pendientes. */
  workloadPct: number;
  /** % de carga por proyectos activos (heurística: 20 pts por proyecto). */
  projectLoadPct: number;
  /** % de tiempo libre restante esta semana. */
  timeAvailablePct: number;
  /** Capacidad global 0–100 (ponderación de las señales). */
  overallPct: number;
  /** true si los compromisos superan el tiempo disponible. */
  overCapacity: boolean;
  /** Mensaje accionable (sección 43: cada alerta debe decir qué hacer). */
  message: string | null;
}

export function computeCapacity(input: CapacityInput): CapacityReport {
  const workloadPct =
    input.weeklyHoursAvailable > 0
      ? (input.pendingTaskHours / input.weeklyHoursAvailable) * 100
      : input.pendingTaskHours > 0
        ? 100
        : 0;

  const projectLoadPct = Math.min(100, input.activeProjects * 20);
  const timeAvailablePct = Math.max(0, 100 - workloadPct);

  // Capacidad global: pondera tiempo libre, energía y foco
  const overallPct = Math.round(
    timeAvailablePct * 0.5 + input.energyPct * 0.25 + input.focusPct * 0.25,
  );

  const overCapacity = workloadPct > 100;

  let message: string | null = null;
  if (overCapacity) {
    message =
      `Tienes más compromisos (${Math.round(input.pendingTaskHours)}h) que tiempo ` +
      `disponible (${Math.round(input.weeklyHoursAvailable)}h/semana). ` +
      `Pausa un proyecto, amplía plazos o reduce el alcance.`;
  } else if (input.overlappingProjectsThisWeek > 2) {
    message =
      `${input.overlappingProjectsThisWeek} proyectos se solapan esta semana. ` +
      `Considera secuenciarlos en lugar de paralelizarlos.`;
  }

  return {
    workloadPct: Math.round(workloadPct),
    projectLoadPct: Math.round(projectLoadPct),
    timeAvailablePct: Math.round(timeAvailablePct),
    overallPct,
    overCapacity,
    message,
  };
}
