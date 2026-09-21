import type { EventType, LifeEvent } from "../../shared/types/index.js";
import { execute, query } from "../database/database.js";
import { newId } from "../lib/ids.js";
import { broadcastEvent } from "../ws.js";

interface EventRow {
  id: string;
  type: string;
  message: string;
  entity_kind: string | null;
  entity_id: string | null;
  created_at: string;
}

function toEvent(row: EventRow): LifeEvent {
  return {
    id: row.id,
    type: row.type as EventType,
    message: row.message,
    entityKind: row.entity_kind as LifeEvent["entityKind"],
    entityId: row.entity_id,
    createdAt: row.created_at,
  };
}

/** Registra un evento en el historial de vida (sección 31 del documento). */
export async function logEvent(
  type: EventType,
  message: string,
  entityKind: LifeEvent["entityKind"] = null,
  entityId: string | null = null,
): Promise<LifeEvent> {
  const id = newId("evt");
  await execute(
    `INSERT INTO events (id, type, message, entity_kind, entity_id) VALUES ($1, $2, $3, $4, $5)`,
    [id, type, message, entityKind, entityId],
  );
  const event: LifeEvent = { id, type, message, entityKind, entityId, createdAt: new Date().toISOString() };
  broadcastEvent(event);
  return event;
}

export async function listEvents(limit = 100): Promise<LifeEvent[]> {
  const rows = await query<EventRow>(
    `SELECT * FROM events ORDER BY created_at DESC, id DESC LIMIT $1`,
    [limit],
  );
  return rows.map(toEvent);
}
