/**
 * Servidor WebSocket (sección 25 del documento).
 * Emite eventos de dominio a todos los clientes conectados.
 */
import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { LifeEvent } from "../shared/types/index.js";

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HttpServer): void {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (socket: WebSocket) => {
    socket.send(JSON.stringify({ type: "connected", at: new Date().toISOString() }));
  });
}

/** Emite un evento de dominio a todos los clientes conectados. */
export function broadcastEvent(event: LifeEvent): void {
  if (!wss) return;
  const payload = JSON.stringify({ type: "event", event });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
}
