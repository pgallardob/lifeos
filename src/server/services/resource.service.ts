import type { Resource, ResourceType } from "../../shared/types/index.js";
import { execute, query, queryOne } from "../database/database.js";
import { HttpError } from "../lib/http-error.js";
import { logEvent } from "./event.service.js";

interface ResourceRow {
  id: string;
  type: string;
  available: number;
  capacity: number;
  unit: string;
  updated_at: string;
}

function toResource(row: ResourceRow): Resource {
  return {
    id: row.id,
    type: row.type as ResourceType,
    available: row.available,
    capacity: row.capacity,
    unit: row.unit,
    updatedAt: row.updated_at,
  };
}

export async function listResources(userId: string): Promise<Resource[]> {
  const rows = await query<ResourceRow>(
    `SELECT * FROM resources WHERE user_id = $1 ORDER BY type`,
    [userId],
  );
  return rows.map(toResource);
}

export async function updateResource(
  userId: string,
  type: ResourceType,
  input: { available?: number | null; capacity?: number | null; unit?: string | null },
): Promise<Resource> {
  const row = await queryOne<ResourceRow>(
    `SELECT * FROM resources WHERE type = $1 AND user_id = $2`,
    [type, userId],
  );
  if (!row) throw HttpError.notFound(`Recurso "${type}" no encontrado.`);

  const available = input.available ?? row.available;
  const capacity = input.capacity ?? row.capacity;
  if (capacity < 0 || available < 0) {
    throw HttpError.badRequest("Los valores del recurso no pueden ser negativos.");
  }

  await execute(
    `UPDATE resources SET available = $1, capacity = $2, unit = $3, updated_at = now()
     WHERE type = $4 AND user_id = $5`,
    [available, capacity, input.unit ?? row.unit, type, userId],
  );

  await logEvent(userId, "resource_updated", `Recurso "${type}" actualizado`, "resource", row.id);
  return toResource(
    (await queryOne<ResourceRow>(`SELECT * FROM resources WHERE type = $1 AND user_id = $2`, [type, userId]))!,
  );
}
