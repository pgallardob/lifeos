import type { ISODateString } from "./common.js";

export type InsightSeverity = "info" | "warning" | "critical" | "positive";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  /** Explicación de por qué aparece la recomendación (sección 22). */
  explanation: string;
  /** Acción sugerida. */
  action: string | null;
  createdAt: ISODateString;
}
