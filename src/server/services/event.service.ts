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

/** Registra un evento en el historial de vida del usuario. */
export async function logEvent(
  userId: string,
  type: EventType,
  message: string,
  entityKind: LifeEvent["entityKind"] = null,
  entityId: string | null = null,
): Promise<LifeEvent> {
  const id = newId("evt");
  await execute(
    `INSERT INTO events (id, user_id, type, message, entity_kind, entity_id) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, type, message, entityKind, entityId],
  );
  const event: LifeEvent = { id, type, message, entityKind, entityId, createdAt: new Date().toISOString() };
  broadcastEvent(userId, event);
  return event;
}

export async function listEvents(userId: string, limit = 100): Promise<LifeEvent[]> {
  const rows = await query<EventRow>(
    `SELECT * FROM events WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
    [userId, limit],
  );
  return rows.map(toEvent);
}
