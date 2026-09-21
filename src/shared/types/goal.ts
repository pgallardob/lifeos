import type { EntityStatus, ISODateString, Priority } from "./common.js";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  /** 0–100 */
  progress: number;
  targetDate: ISODateString | null;
  status: EntityStatus;
  priority: Priority;
  /** Valor objetivo medible (p. ej. dinero a ahorrar). */
  targetValue: number | null;
  /** Valor actual medible. */
  currentValue: number;
  /** Unidad del valor medible (p. ej. "CLP", "kg", "horas"). */
  unit: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GoalWithProjects extends Goal {
  projects: string[];
}
