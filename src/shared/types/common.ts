/** Estados y prioridades compartidos entre entidades de LifeOS. */

export type EntityStatus = "active" | "completed" | "paused" | "archived";

export type Priority = "low" | "medium" | "high";

export type RiskLevel = "low" | "medium" | "high";

/** Fecha serializada en ISO 8601 (la API y SQLite trabajan con strings). */
export type ISODateString = string;
