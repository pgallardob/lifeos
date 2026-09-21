/**
 * Servidor WebSocket (sección 25 del documento).
 * Autentica por cookie de sesión y emite eventos solo al usuario dueño.
 */
import type { Server as HttpServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { LifeEvent } from "../shared/types/index.js";
import { userIdFromCookie } from "./lib/auth.js";

let wss: WebSocketServer | null = null;

// userId asociado a cada socket autenticado.
const socketUser = new WeakMap<WebSocket, string>();

export function initWebSocket(server: HttpServer): void {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    // Solo /ws exacto (con o sin query string); otras rutas de upgrade: ignorar.
    if (req.url?.split("?")[0] !== "/ws") return;
    userIdFromCookie(req.headers.cookie)
      .then((userId) => {
        if (!userId) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        wss!.handleUpgrade(req, socket, head, (ws) => {
          socketUser.set(ws, userId);
          wss!.emit("connection", ws, req);
        });
      })
      .catch(() => socket.destroy()); // BD caída: no dejar el socket colgado
  });

  wss.on("connection", (socket: WebSocket) => {
    socket.send(JSON.stringify({ type: "connected", at: new Date().toISOString() }));
  });
}

/** Emite un evento de dominio solo a los sockets del usuario dueño. */
export function broadcastEvent(userId: string, event: LifeEvent): void {
  if (!wss) return;
  const payload = JSON.stringify({ type: "event", event });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN && socketUser.get(client) === userId) {
      client.send(payload);
    }
  }
}
