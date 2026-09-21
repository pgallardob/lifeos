import type { ISODateString } from "./common.js";

export type ResourceType = "time" | "money" | "energy" | "focus";

export interface Resource {
  id: string;
  type: ResourceType;
  /** Cantidad disponible por semana (horas, unidades monetarias o %). */
  available: number;
  /** Cantidad total teórica (capacidad máxima). */
  capacity: number;
  unit: string;
  updatedAt: ISODateString;
}
