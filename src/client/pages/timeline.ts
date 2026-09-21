/**
 * Página de Cronología (sección 16): timeline horizontal con zoom.
 */
import { mountShell } from "../app.js";
import { Timeline, type TimelineZoom } from "../components/timeline.js";
import { Tabs, toast } from "../components/ui.js";
import { api } from "../lib/api.js";
import { clear, el, mount } from "../lib/dom.js";
import type { Project, Task } from "../../shared/types/index.js";

await mountShell({ active: "timeline" });

const ZOOMS: { id: TimelineZoom; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },
];

let zoom: TimelineZoom = "month";
let projects: Project[] = [];
let tasks: Task[] = [];

function render(): void {
  const container = mount("#timeline-container");
  clear(container);

  const hasData = projects.some((p) => p.startDate || p.deadline) || tasks.some((t) => t.dueDate);
  if (!hasData) {
    const empty = el("div", { className: "empty-state" });
    empty.append(
      el("span", { className: "empty-state__icon", "aria-hidden": "true", textContent: "◌" }),
      el("p", { textContent: "Asigna fechas a proyectos o tareas para ver la cronología." }),
    );
    container.append(empty);
    return;
  }
  container.append(Timeline(projects, tasks, zoom));
}

mount("#zoom-tabs").append(
  Tabs(ZOOMS, zoom, (id) => {
    zoom = id as TimelineZoom;
    render();
  }),
);

Promise.all([api.get<Project[]>("/api/projects"), api.get<Task[]>("/api/tasks")])
  .then(([p, t]) => {
    projects = p;
    tasks = t;
    render();
  })
  .catch((err) => {
    console.error("[lifeos] error cargando cronología:", err);
    toast("No se pudo cargar la cronología", "error");
  });
