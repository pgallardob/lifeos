/**
 * Grafo de dependencias en SVG (sección 15 del documento).
 * Layout por capas topológicas: las tareas sin dependencias arriba,
 * los dependientes debajo. Las flechas apuntan de requisito → dependiente.
 */
import type { Dependency, Task } from "../../shared/types/index.js";
import { svgEl } from "../lib/dom.js";

const NODE_W = 150;
const NODE_H = 46;
const GAP_X = 32;
const GAP_Y = 56;

interface NodePos {
  task: Task;
  layer: number;
  index: number;
  x: number;
  y: number;
}

/** Profundidad de cada tarea = camino más largo desde una raíz. */
function computeLayers(tasks: Task[], deps: Dependency[]): Map<string, number> {
  const depth = new Map<string, number>();
  const byTask = new Map<string, string[]>();
  for (const d of deps) {
    byTask.set(d.taskId, [...(byTask.get(d.taskId) ?? []), d.dependsOnTaskId]);
  }
  const visiting = new Set<string>();

  function depthOf(id: string): number {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0; // ciclo residual: cortar
    visiting.add(id);
    const parents = byTask.get(id) ?? [];
    const d = parents.length ? Math.max(...parents.map(depthOf)) + 1 : 0;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  }

  for (const t of tasks) depthOf(t.id);
  return depth;
}

function nodeColor(task: Task, blockedIds: Set<string>): string {
  if (task.status === "completed") return "var(--success)";
  if (blockedIds.has(task.id) || task.status === "blocked") return "var(--warning)";
  if (task.status === "in_progress") return "var(--cyan)";
  return "var(--border)";
}

export function DependencyGraph(tasks: Task[], deps: Dependency[]): SVGSVGElement {
  const W = Math.max(640, tasks.length * (NODE_W + GAP_X));
  const layers = computeLayers(tasks, deps);
  const maxLayer = Math.max(0, ...layers.values());
  const H = (maxLayer + 1) * (NODE_H + GAP_Y) + 40;

  const svg = svgEl("svg", {
    class: "dep-graph",
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    "aria-label": "Grafo de dependencias entre tareas",
  });

  // Tareas bloqueadas: tienen dependencias sin completar
  const done = new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id));
  const blockedIds = new Set(
    deps.filter((d) => !done.has(d.dependsOnTaskId)).map((d) => d.taskId),
  );

  // Posiciones por capa (centradas)
  const positions = new Map<string, NodePos>();
  const perLayer = new Map<number, Task[]>();
  for (const t of tasks) {
    const l = layers.get(t.id) ?? 0;
    perLayer.set(l, [...(perLayer.get(l) ?? []), t]);
  }
  for (const [layer, group] of perLayer) {
    const rowW = group.length * NODE_W + (group.length - 1) * GAP_X;
    const startX = (W - rowW) / 2;
    group.forEach((task, index) => {
      positions.set(task.id, {
        task, layer, index,
        x: startX + index * (NODE_W + GAP_X),
        y: 20 + layer * (NODE_H + GAP_Y),
      });
    });
  }

  // Aristas (requisito → dependiente) con flecha
  const defs = svgEl("defs");
  const marker = svgEl("marker", {
    id: "dep-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5,
    markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse",
  });
  marker.append(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--text-muted)" }));
  defs.append(marker);
  svg.append(defs);

  for (const d of deps) {
    const from = positions.get(d.dependsOnTaskId);
    const to = positions.get(d.taskId);
    if (!from || !to) continue;
    const x1 = from.x + NODE_W / 2;
    const y1 = from.y + NODE_H;
    const x2 = to.x + NODE_W / 2;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    svg.append(
      svgEl("path", {
        d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - 4}`,
        fill: "none",
        stroke: done.has(d.dependsOnTaskId) ? "var(--success)" : "var(--text-muted)",
        "stroke-width": 1.5,
        "stroke-dasharray": done.has(d.dependsOnTaskId) ? "none" : "4 4",
        "marker-end": "url(#dep-arrow)",
        opacity: 0.7,
      }),
    );
  }

  // Nodos
  for (const pos of positions.values()) {
    const { task } = pos;
    const color = nodeColor(task, blockedIds);
    const g = svgEl("g", { class: "dep-node" });

    g.append(
      svgEl("rect", {
        x: pos.x, y: pos.y, width: NODE_W, height: NODE_H, rx: 8,
        fill: "var(--surface-2)", stroke: color, "stroke-width": 1.5,
      }),
    );

    const title = svgEl("text", {
      x: pos.x + NODE_W / 2, y: pos.y + 19,
      "text-anchor": "middle", fill: "var(--text)",
      "font-size": 11, "font-family": "var(--font-ui)", "font-weight": 500,
    });
    title.textContent = task.title.length > 20 ? `${task.title.slice(0, 19)}…` : task.title;
    g.append(title);

    const status = svgEl("text", {
      x: pos.x + NODE_W / 2, y: pos.y + 35,
      "text-anchor": "middle", fill: color,
      "font-size": 9, "font-family": "var(--font-mono)", "letter-spacing": "0.08em",
    });
    status.textContent =
      task.status === "completed"
        ? "100% ✓"
        : blockedIds.has(task.id)
          ? "BLOQUEADA"
          : task.status === "in_progress"
            ? "EN CURSO"
            : "PENDIENTE";
    g.append(status);

    svg.append(g);
  }

  return svg;
}
