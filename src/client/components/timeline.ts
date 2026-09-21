/**
 * Timeline horizontal (sección 16 del documento).
 * Escala de tiempo con barras de proyecto y marcadores de hitos/tareas.
 * Zoom: day | week | month | year.
 */
import type { Project, Task } from "../../shared/types/index.js";
import { el, svgEl } from "../lib/dom.js";

export type TimelineZoom = "day" | "week" | "month" | "year";

const DAY_MS = 86_400_000;
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const ZOOM_DAYS: Record<TimelineZoom, number> = {
  day: 30,
  week: 120,
  month: 400,
  year: 1100,
};

const ROW_H = 34;
const TOP = 44;
const PAD_X = 16;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

interface Tick {
  x: number;
  label: string;
  major: boolean;
}

export function Timeline(projects: Project[], tasks: Task[], zoom: TimelineZoom): HTMLElement {
  const days = ZOOM_DAYS[zoom];
  const now = startOfDay(new Date());
  const start = addDays(now, -Math.floor(days * 0.15));
  const end = addDays(now, days - Math.floor(days * 0.15));
  const spanMs = end.getTime() - start.getTime();

  const W = 1200;
  const px = (d: Date | string): number =>
    PAD_X + ((new Date(d).getTime() - start.getTime()) / spanMs) * (W - 2 * PAD_X);

  // Filas: una por proyecto + una fila de tareas sueltas
  const rows: { label: string; items: (Project | Task)[] }[] = [
    ...projects.map((p) => ({ label: p.title, items: [p] as (Project | Task)[] })),
  ];
  const looseTasks = tasks.filter((t) => t.dueDate && !t.projectId);
  if (looseTasks.length) rows.push({ label: "Tareas", items: looseTasks });

  const H = TOP + Math.max(rows.length, 1) * ROW_H + 24;

  const svg = svgEl("svg", {
    class: "timeline-svg",
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    "aria-label": "Cronología de proyectos y tareas",
  });

  // ─── Ticks del eje según zoom ───────────────────────────────────────────────
  const ticks: Tick[] = [];
  if (zoom === "day") {
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const major = d.getDay() === 1; // lunes
      ticks.push({
        x: px(d),
        label: major ? `${d.getDate()} ${MESES_CORTO[d.getMonth()]}` : `${d.getDate()}`,
        major,
      });
    }
  } else if (zoom === "week") {
    for (let d = new Date(start); d <= end; d = addDays(d, 7)) {
      ticks.push({ x: px(d), label: `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`, major: true });
    }
  } else if (zoom === "month") {
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      ticks.push({ x: px(d), label: MESES_CORTO[d.getMonth()]!.toUpperCase(), major: true });
    }
  } else {
    for (let d = new Date(start.getFullYear(), 0, 1); d <= end; d = new Date(d.getFullYear() + 1, 0, 1)) {
      ticks.push({ x: px(d), label: String(d.getFullYear()), major: true });
    }
  }

  for (const tick of ticks) {
    if (tick.x < PAD_X || tick.x > W - PAD_X) continue;
    svg.append(
      svgEl("line", {
        x1: tick.x, y1: TOP - 8, x2: tick.x, y2: H - 16,
        stroke: "var(--border-subtle)", "stroke-width": 1,
      }),
    );
    if (tick.major) {
      const label = svgEl("text", {
        x: tick.x + 4, y: TOP - 16,
        fill: "var(--text-muted)", "font-size": 10,
        "font-family": "var(--font-mono)", "letter-spacing": "0.08em",
      });
      label.textContent = tick.label;
      svg.append(label);
    }
  }

  // Línea "hoy"
  const todayX = px(now);
  svg.append(
    svgEl("line", {
      x1: todayX, y1: TOP - 24, x2: todayX, y2: H - 16,
      stroke: "var(--cyan)", "stroke-width": 1, "stroke-dasharray": "3 4",
    }),
  );
  const todayLabel = svgEl("text", {
    x: todayX + 5, y: TOP - 28, fill: "var(--cyan)",
    "font-size": 9, "font-family": "var(--font-mono)", "letter-spacing": "0.1em",
  });
  todayLabel.textContent = "HOY";
  svg.append(todayLabel);

  // ─── Filas ──────────────────────────────────────────────────────────────────
  rows.forEach((row, i) => {
    const y = TOP + i * ROW_H;

    const label = svgEl("text", {
      x: PAD_X, y: y + 14, fill: "var(--text-muted)",
      "font-size": 9, "font-family": "var(--font-mono)", "letter-spacing": "0.06em",
    });
    label.textContent = row.label.toUpperCase().slice(0, 22);
    svg.append(label);

    for (const item of row.items) {
      const isProject = "progress" in item;
      const from = isProject
        ? (item as Project).startDate ?? (item as Project).createdAt
        : (item as Task).dueDate;
      const to = isProject ? (item as Project).deadline : (item as Task).dueDate;
      if (!from && !to) continue;

      const x1 = px(from ?? to!);
      const x2 = px(to ?? from!);
      const color =
        item.status === "completed" ? "var(--success)"
        : item.status === "paused" ? "var(--warning)"
        : "var(--primary)";

      if (isProject && x2 - x1 > 8) {
        // Barra de proyecto con progreso interior
        svg.append(
          svgEl("rect", {
            x: x1, y: y + 4, width: x2 - x1, height: 12, rx: 6,
            fill: "var(--surface-2)", stroke: "var(--border)", "stroke-width": 1,
          }),
        );
        const fillW = ((x2 - x1) * (item as Project).progress) / 100;
        if (fillW > 2) {
          svg.append(
            svgEl("rect", {
              x: x1, y: y + 4, width: fillW, height: 12, rx: 6,
              fill: color, opacity: 0.85,
            }),
          );
        }
      } else {
        // Marcador puntual (tarea o proyecto sin rango)
        svg.append(
          svgEl("circle", {
            cx: x1, cy: y + 10, r: 4, fill: color,
          }),
        );
      }
    }
  });

  const wrap = el("div", { className: "timeline-wrap" }, [svg]);
  return wrap;
}
