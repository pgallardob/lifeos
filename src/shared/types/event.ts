import type { ISODateString } from "./common.js";

export type EventType =
  | "task_completed"
  | "task_created"
  | "project_created"
  | "project_completed"
  | "project_risk_changed"
  | "goal_created"
  | "goal_completed"
  | "scenario_created"
  | "focus_session"
  | "resource_updated";

export interface LifeEvent {
  id: string;
  type: EventType;
  message: string;
  /** Entidad relacionada (opcional). */
  entityKind: "goal" | "project" | "task" | "scenario" | "resource" | null;
  entityId: string | null;
  createdAt: ISODateString;
}
