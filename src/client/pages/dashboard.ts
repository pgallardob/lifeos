/**
 * Dashboard — Command Center (secciones 6–7 del documento).
 * Carga objetivos, proyectos, tareas y recursos; renderiza métricas,
 * la trayectoria (SVG) y la sección "Hoy".
 */
import { mountShell } from "../app.js";
import { LifeVector } from "../components/life-vector.js";
import { MetricCard } from "../components/ui.js";
import { api } from "../lib/api.js";
import { clear, el, mount, svgEl } from "../lib/dom.js";
import { fechaCorta, horas, numero, porcentaje, saludo } from "../lib/format.js";
import type {
  GoalWithProjects,
  Project,
  Resource,
  Task,
} from "../../shared/types/index.js";

await mountShell({ active: "overview" });

interface DashboardData {
  goals: GoalWithProjects[];
  projects: Project[];
  tasks: Task[];
  resources: Resource[];
}

async function loadData(): Promise<DashboardData> {
  const [goals, projects, tasks, resources] = await Promise.all([
    api.get<GoalWithProjects[]>("/api/goals"),
    api.get<Project[]>("/api/projects"),
    api.get<Task[]>("/api/tasks"),
    api.get<Resource[]>("/api/resources"),
  ]);
  return { goals, projects, tasks, resources };
}

function renderGreeting(data: DashboardData): void {
  mount("#greeting").textContent = saludo().toUpperCase();
  const active = data.goals.filter((g) => g.status === "active").length;
  const energy = data.resources.find((r) => r.type === "energy");
  const sub = mount("#greeting-sub");
  sub.textContent = energy
    ? `Tu vida avanza al ${porcentaje(energy.available)} de capacidad · ${active} objetivo${active === 1 ? "" : "s"} activo${active === 1 ? "" : "s"}`
    : `${active} objetivos activos`;
}

function renderMetrics(data: DashboardData): void {
  const container = mount("#metrics");
  clear(container);

  const energy = data.resources.find((r) => r.type === "energy");
  const pendingTasks = data.tasks.filter((t) => t.status !== "completed").length;

  container.append(
    MetricCard("Objetivos", String(data.goals.filter((g) => g.status === "active").length).padStart(2, "0")),
    MetricCard("Proyectos", String(data.projects.filter((p) => p.status === "active").length).padStart(2, "0")),
    MetricCard("Energía", energy ? porcentaje(energy.available) : "—", "metric-card__value--cyan"),
    MetricCard("Tareas pendientes", String(pendingTasks).padStart(2, "0"), "metric-card__value--success"),
  );
}

/** Trajectory chart: progreso acumulado de objetivos hacia sus fechas límite. */
function renderTrajectory(data: DashboardData): void {
  const svg = mount("#trajectory-chart") as unknown as SVGSVGElement;
  clear(svg as unknown as HTMLElement);

  const W = 800;
  const H = 220;
  const PAD = 24;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const goals = data.goals
    .filter((g) => g.status === "active" && g.targetDate)
    .sort((a, b) => (a.targetDate! < b.targetDate! ? -1 : 1));

  const caption = mount("#trajectory-caption");
  if (goals.length === 0) {
    caption.textContent = "sin objetivos con fecha";
    const text = svgEl("text", {
      x: W / 2, y: H / 2, "text-anchor": "middle",
      fill: "var(--text-muted)", "font-size": 13, "font-family": "var(--font-mono)",
    });
    text.textContent = "CREA UN OBJETIVO CON FECHA LÍMITE PARA VER TU TRAYECTORIA";
    svg.append(text);
    return;
  }

  const now = Date.now();
  const end = Math.max(...goals.map((g) => new Date(g.targetDate!).getTime()));
  const span = Math.max(end - now, 1);

  // Ejes
  svg.append(
    svgEl("line", { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: "var(--border)", "stroke-width": 1 }),
    svgEl("line", { x1: PAD, y1: PAD, x2: PAD, y2: H - PAD, stroke: "var(--border)", "stroke-width": 1 }),
  );

  // Línea ideal (progreso lineal hacia el deadline más lejano)
  svg.append(
    svgEl("line", {
      x1: PAD, y1: H - PAD, x2: W - PAD, y2: PAD,
      stroke: "var(--border)", "stroke-width": 1, "stroke-dasharray": "4 6",
    }),
  );

  // Punto por objetivo: x = fecha límite, y = progreso
  for (const goal of goals) {
    const x = PAD + ((new Date(goal.targetDate!).getTime() - now) / span) * (W - 2 * PAD);
    const y = H - PAD - (goal.progress / 100) * (H - 2 * PAD);
    const onTrack = goal.progress / 100 >= 1 - (new Date(goal.targetDate!).getTime() - now) / span;

    svg.append(
      svgEl("circle", {
        cx: x, cy: y, r: 5,
        fill: onTrack ? "var(--cyan)" : "var(--warning)",
      }),
    );
    const label = svgEl("text", {
      x, y: y - 12, "text-anchor": "middle",
      fill: "var(--text-muted)", "font-size": 10, "font-family": "var(--font-mono)",
    });
    label.textContent = goal.title.toUpperCase().slice(0, 18);
    svg.append(label);
  }

  caption.textContent = `${goals.length} objetivo${goals.length === 1 ? "" : "s"} · horizonte ${fechaCorta(goals[goals.length - 1]!.targetDate)}`;
}

/** Life Vector (sección 22): dirección global según objetivos activos. */
function renderLifeVector(data: DashboardData): void {
  const box = mount("#life-vector");
  clear(box);
  box.append(LifeVector(data.goals));
}

function renderToday(data: DashboardData): void {
  const grid = mount("#today-grid");
  clear(grid);

  const today = new Date().toISOString().slice(0, 10);
  const dueToday = data.tasks.filter(
    (t) => t.status !== "completed" && t.dueDate?.slice(0, 10) === today,
  );
  const inProgress = data.tasks.filter((t) => t.status === "in_progress");
  const blocked = data.tasks.filter((t) => t.status === "blocked");

  const cards: HTMLElement[] = [];

  for (const task of [...inProgress, ...dueToday].slice(0, 3)) {
    const card = el("article", { className: "today-card" });
    card.append(
      el("span", { className: "today-card__icon today-card__icon--focus", "aria-hidden": "true", textContent: "◉" }),
      (() => {
        const body = el("div");
        body.append(
          el("div", { className: "today-card__title", textContent: task.title }),
          el("div", {
            className: "today-card__detail",
            textContent: task.estimatedHours ? `${horas(task.estimatedHours)} estimadas` : "En curso",
          }),
        );
        return body;
      })(),
    );
    cards.push(card);
  }

  if (blocked.length) {
    const card = el("article", { className: "today-card" });
    card.append(
      el("span", { className: "today-card__icon today-card__icon--risk", "aria-hidden": "true", textContent: "⚠" }),
      (() => {
        const body = el("div");
        body.append(
          el("div", { className: "today-card__title", textContent: "Tareas bloqueadas" }),
          el("div", {
            className: "today-card__detail",
            textContent: `${blocked.length} tarea${blocked.length === 1 ? "" : "s"} esperando dependencias`,
          }),
        );
        return body;
      })(),
    );
    cards.push(card);
  }

  if (!cards.length) {
    const empty = el("div", { className: "empty-state" });
    empty.append(
      el("span", { className: "empty-state__icon", "aria-hidden": "true", textContent: "◌" }),
      el("p", { textContent: "Nada programado para hoy. Crea una tarea o marca una en curso." }),
    );
    grid.append(empty);
    return;
  }

  grid.append(...cards);
}

async function init(): Promise<void> {
  try {
    const data = await loadData();
    renderGreeting(data);
    renderMetrics(data);
    renderTrajectory(data);
    renderLifeVector(data);
    renderToday(data);
  } catch (err) {
    console.error("[lifeos] error cargando el panel:", err);
    mount("#greeting-sub").textContent =
      "No se pudo conectar con la API. Verifica que el servidor esté en ejecución.";
  }
}

void init();
