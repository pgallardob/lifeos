import type { EntityStatus, ISODateString, Priority, RiskLevel } from "./common.js";

export interface Project {
  id: string;
  goalId: string | null;
  title: string;
  description: string | null;
  /** 0–100 */
  progress: number;
  status: EntityStatus;
  priority: Priority;
  startDate: ISODateString | null;
  deadline: ISODateString | null;
  /** Horas estimadas que requiere el proyecto. */
  estimatedHours: number | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProjectWithRisk extends Project {
  riskLevel: RiskLevel;
  riskScore: number;
}
