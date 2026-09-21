import { LIMITS } from "../../shared/constants.js";
import { HttpError } from "./http-error.js";

type Body = Record<string, unknown>;

/** String obligatorio, recortado y con longitud máxima. */
export function reqString(body: Body, field: string, max: number = LIMITS.TITLE_MAX): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw HttpError.badRequest(`El campo "${field}" es obligatorio.`);
  }
  if (value.length > max) {
    throw HttpError.badRequest(`El campo "${field}" supera el máximo de ${max} caracteres.`);
  }
  return value.trim();
}

/** String opcional → string | null | undefined (undefined = campo ausente, conservar). */
export function optString(
  body: Body,
  field: string,
  max: number = LIMITS.DESCRIPTION_MAX,
): string | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw HttpError.badRequest(`El campo "${field}" debe ser texto.`);
  }
  if (value.length > max) {
    throw HttpError.badRequest(`El campo "${field}" supera el máximo de ${max} caracteres.`);
  }
  return value.trim();
}

/** Número opcional dentro de un rango → number | null | undefined. */
export function optNumber(
  body: Body,
  field: string,
  min = -Number.MAX_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
): number | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) {
    throw HttpError.badRequest(`El campo "${field}" debe ser un número.`);
  }
  if (num < min || num > max) {
    throw HttpError.badRequest(`El campo "${field}" debe estar entre ${min} y ${max}.`);
  }
  return num;
}

/** Porcentaje 0–100 opcional. */
export function optPercent(body: Body, field: string): number | null | undefined {
  return optNumber(body, field, LIMITS.PERCENT_MIN, LIMITS.PERCENT_MAX);
}

/** Enum opcional → uno de los valores permitidos | null. */
export function optEnum<T extends string>(
  body: Body,
  field: string,
  allowed: readonly T[],
): T | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw HttpError.badRequest(
      `El campo "${field}" debe ser uno de: ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

/** Fecha opcional en formato ISO (YYYY-MM-DD o ISO 8601 completo) → string | null | undefined. */
export function optDate(body: Body, field: string): string | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw HttpError.badRequest(`El campo "${field}" debe ser una fecha ISO.`);
  }
  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw HttpError.badRequest(`El campo "${field}" no es una fecha válida.`);
  }
  return trimmed;
}
