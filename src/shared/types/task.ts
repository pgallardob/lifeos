import type { ISODateString, Priority } from "./common.js";

export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  /** Horas estimadas de trabajo. */
  estimatedHours: number | null;
  dueDate: ISODateString | null;
  completedAt: ISODateString | null;
  /** Minutos reales registrados en Focus Mode. */
  focusedMinutes: number;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Dependency {
  id: string;
  /** Tarea que queda bloqueada. */
  taskId: string;
  /** Tarea que debe completarse primero. */
  dependsOnTaskId: string;
  createdAt: ISODateString;
}
