import { randomUUID } from "node:crypto";

/** Genera un ID con prefijo legible: goal_9f3c…, task_7a21… */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
