/**
 * Modo Enfoque (sección 26 del documento).
 * Overlay minimalista a pantalla completa: una tarea, un temporizador,
 * nada más. Al terminar, registra los minutos enfocados en la tarea.
 */
import { api, ApiError } from "../lib/api.js";
import { el } from "../lib/dom.js";
import { toast } from "./ui.js";
import type { Task } from "../../shared/types/index.js";

function fmtTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function mountFocusMode(): void {
  let overlay: HTMLElement | null = null;
  let interval: number | null = null;
  let elapsed = 0;
  let running = false;
  let currentTask: Task | null = null;

  async function open(): Promise<void> {
    if (overlay) return;

    let tasks: Task[] = [];
    try {
      tasks = await api.get<Task[]>("/api/tasks?status=in_progress");
      if (!tasks.length) tasks = await api.get<Task[]>("/api/tasks?status=pending");
    } catch {
      toast("No se pudieron cargar las tareas", "error");
      return;
    }

    elapsed = 0;
    running = false;
    currentTask = tasks[0] ?? null;

    // ─── UI ───────────────────────────────────────────────────────────────────
    const timerEl = el("div", { className: "focus__timer mono", textContent: "00:00" });
    const taskTitle = el("div", {
      className: "focus__task",
      textContent: currentTask?.title ?? "Sin tareas activas",
    });

    const select = el("select", { className: "focus__select", "aria-label": "Tarea en foco" }) as HTMLSelectElement;
    for (const t of tasks) {
      select.append(el("option", { value: t.id, textContent: t.title }));
    }
    select.addEventListener("change", () => {
      currentTask = tasks.find((t) => t.id === select.value) ?? null;
      taskTitle.textContent = currentTask?.title ?? "";
    });

    const toggleBtn = el("button", {
      className: "btn btn--primary focus__toggle",
      type: "button",
      textContent: "▶ Iniciar",
    });
    toggleBtn.addEventListener("click", () => {
      running = !running;
      toggleBtn.textContent = running ? "⏸ Pausar" : "▶ Reanudar";
      if (running) {
        interval = window.setInterval(() => {
          elapsed++;
          timerEl.textContent = fmtTimer(elapsed);
        }, 1000);
      } else if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    });

    const doneBtn = el("button", {
      className: "btn focus__done",
      type: "button",
      textContent: "✓ Completar tarea",
    });
    doneBtn.addEventListener("click", () => void finish(true));

    const exitBtn = el("button", {
      className: "btn btn--ghost focus__exit",
      type: "button",
      "aria-label": "Salir del modo enfoque",
      textContent: "✕ Salir",
    });
    exitBtn.addEventListener("click", () => void finish(false));

    const box = el("div", { className: "focus", role: "dialog", "aria-modal": "true", "aria-label": "Modo enfoque" });
    const center = el("div", { className: "focus__center" });
    center.append(
      el("div", { className: "label", textContent: "MODO ENFOQUE" }),
      select,
      taskTitle,
      timerEl,
      el("div", { className: "focus__actions" }, [toggleBtn, doneBtn]),
    );
    box.append(exitBtn, center);

    overlay = el("div", { className: "focus-backdrop" }, [box]);
    document.body.append(overlay);
    requestAnimationFrame(() => overlay!.classList.add("focus-backdrop--open"));

    document.addEventListener("keydown", onKey);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") void finish(false);
  }

  async function finish(markCompleted: boolean): Promise<void> {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
    document.removeEventListener("keydown", onKey);

    const minutes = Math.round(elapsed / 60);
    if (currentTask && (minutes > 0 || markCompleted)) {
      try {
        const patch: Record<string, unknown> = {
          focusedMinutes: currentTask.focusedMinutes + minutes,
        };
        if (markCompleted) patch.status = "completed";
        await api.patch(`/api/tasks/${currentTask.id}`, patch);
        toast(
          markCompleted
            ? `✓ ${currentTask.title} — completada`
            : `${minutes} min registrados en "${currentTask.title}"`,
          "success",
        );
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "Error al registrar el enfoque", "error");
      }
    }

    if (overlay) {
      overlay.classList.remove("focus-backdrop--open");
      const node = overlay;
      overlay = null;
      setTimeout(() => node.remove(), 300);
    }
  }

  document.addEventListener("lifeos:focus-mode", () => void open());
}
