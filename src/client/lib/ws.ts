/**
 * Cliente WebSocket: recibe eventos del servidor y los re-emite
 * como CustomEvent "lifeos:event" para que las páginas reaccionen.
 */
import type { LifeEvent } from "../../shared/types/index.js";
import { toast } from "../components/ui.js";

const TOASTABLE: Record<string, string> = {
  goal_created: "Objetivo creado",
  goal_completed: "Objetivo completado",
  project_created: "Proyecto creado",
  project_completed: "Proyecto completado",
  task_created: "Tarea creada",
  task_completed: "Tarea completada",
  scenario_created: "Escenario creado",
};

export function connectWebSocket(): void {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/ws`);

  socket.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data as string) as { type: string; event?: LifeEvent };
      if (msg.type === "event" && msg.event) {
        document.dispatchEvent(new CustomEvent<LifeEvent>("lifeos:event", { detail: msg.event }));
        const label = TOASTABLE[msg.event.type];
        if (label) toast(`${label}: ${msg.event.message}`, "success");
      }
    } catch {
      /* mensaje no JSON: ignorar */
    }
  });

  socket.addEventListener("close", () => {
    // Reintento simple tras 5s
    setTimeout(connectWebSocket, 5000);
  });
}
