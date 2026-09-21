/**
 * Gráfico de simulación (sección 18): dos series — línea base (discontinua)
 * vs. escenario (sólida) — sobre el tiempo.
 */
import type { ProjectionPoint } from "../../shared/types/index.js";
import { svgEl } from "../lib/dom.js";

const W = 800;
const H = 260;
const PAD = { top: 20, right: 20, bottom: 32, left: 64 };

const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}

function toPath(points: ProjectionPoint[], x: (d: string) => number, y: (v: number) => number): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
}

export function SimulationChart(
  baseline: ProjectionPoint[],
  projection: ProjectionPoint[],
): SVGSVGElement {
  const svg = svgEl("svg", {
    class: "sim-chart",
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    "aria-label": "Comparación de proyección: línea base vs. escenario",
  });

  const all = [...baseline, ...projection];
  if (!all.length) return svg;

  const minT = Math.min(...all.map((p) => new Date(p.date).getTime()));
  const maxT = Math.max(...all.map((p) => new Date(p.date).getTime()));
  const maxV = Math.max(...all.map((p) => p.value), 1);
  const spanT = Math.max(maxT - minT, 1);

  const x = (d: string) =>
    PAD.left + ((new Date(d).getTime() - minT) / spanT) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / maxV) * (H - PAD.top - PAD.bottom);

  // Ejes
  svg.append(
    svgEl("line", { x1: PAD.left, y1: H - PAD.bottom, x2: W - PAD.right, y2: H - PAD.bottom, stroke: "var(--border)" }),
    svgEl("line", { x1: PAD.left, y1: PAD.top, x2: PAD.left, y2: H - PAD.bottom, stroke: "var(--border)" }),
  );

  // Ticks Y (4 niveles)
  for (let i = 0; i <= 4; i++) {
    const v = (maxV / 4) * i;
    const ty = y(v);
    svg.append(
      svgEl("line", { x1: PAD.left, y1: ty, x2: W - PAD.right, y2: ty, stroke: "var(--border-subtle)", "stroke-dasharray": "2 4" }),
    );
    const label = svgEl("text", {
      x: PAD.left - 8, y: ty + 3, "text-anchor": "end",
      fill: "var(--text-muted)", "font-size": 10, "font-family": "var(--font-mono)",
    });
    label.textContent = fmtValue(v);
    svg.append(label);
  }

  // Ticks X (inicio, medio, fin)
  for (const p of [all[0]!, all[Math.floor(all.length / 2)]!, all[all.length - 1]!]) {
    const label = svgEl("text", {
      x: x(p.date), y: H - PAD.bottom + 18, "text-anchor": "middle",
      fill: "var(--text-muted)", "font-size": 10, "font-family": "var(--font-mono)",
    });
    label.textContent = fmtDate(p.date);
    svg.append(label);
  }

  // Serie línea base (discontinua, gris)
  if (baseline.length > 1) {
    svg.append(
      svgEl("path", {
        d: toPath(baseline, x, y),
        fill: "none", stroke: "var(--text-muted)",
        "stroke-width": 1.5, "stroke-dasharray": "5 5", opacity: 0.7,
      }),
    );
  }

  // Serie escenario (sólida, cyan)
  if (projection.length > 1) {
    svg.append(
      svgEl("path", {
        d: toPath(projection, x, y),
        fill: "none", stroke: "var(--cyan)", "stroke-width": 2,
      }),
    );
    const last = projection[projection.length - 1]!;
    svg.append(
      svgEl("circle", { cx: x(last.date), cy: y(last.value), r: 4, fill: "var(--cyan)" }),
    );
  }

  // Leyenda
  const legend = svgEl("g");
  const l1 = svgEl("text", { x: PAD.left + 8, y: PAD.top + 4, fill: "var(--cyan)", "font-size": 10, "font-family": "var(--font-mono)" });
  l1.textContent = "— ESCENARIO";
  const l2 = svgEl("text", { x: PAD.left + 96, y: PAD.top + 4, fill: "var(--text-muted)", "font-size": 10, "font-family": "var(--font-mono)" });
  l2.textContent = "- - LÍNEA BASE";
  legend.append(l1, l2);
  svg.append(legend);

  return svg;
}
