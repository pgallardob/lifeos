/**
 * Life Vector (sección 22 del documento).
 * Radar vectorial: cada objetivo activo es un vector desde el centro
 * cuya longitud = progreso. La flecha resultante muestra la dirección
 * global de la vida (momentum agregado).
 */
import type { GoalWithProjects } from "../../shared/types/index.js";
import { svgEl } from "../lib/dom.js";

const SIZE = 280;
const C = SIZE / 2;
const R = SIZE / 2 - 36;

interface Vec {
  x: number;
  y: number;
}

function polar(angle: number, radius: number): Vec {
  return { x: C + Math.cos(angle) * radius, y: C + Math.sin(angle) * radius };
}

export function LifeVector(goals: GoalWithProjects[]): SVGSVGElement {
  const svg = svgEl("svg", {
    class: "life-vector",
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    role: "img",
    "aria-label": "Vector de vida: dirección global según objetivos activos",
  });

  const active = goals.filter((g) => g.status === "active");

  // Anillos de referencia (25/50/75/100%)
  for (const pct of [0.25, 0.5, 0.75, 1]) {
    svg.append(
      svgEl("circle", {
        cx: C, cy: C, r: R * pct,
        fill: "none", stroke: "var(--border-subtle)",
        "stroke-width": 1, "stroke-dasharray": pct === 1 ? "none" : "2 4",
      }),
    );
  }

  // Centro
  svg.append(svgEl("circle", { cx: C, cy: C, r: 3, fill: "var(--primary)" }));

  if (!active.length) {
    const t = svgEl("text", {
      x: C, y: C + 5, "text-anchor": "middle",
      fill: "var(--text-muted)", "font-size": 10, "font-family": "var(--font-mono)",
    });
    t.textContent = "SIN OBJETIVOS ACTIVOS";
    svg.append(t);
    return svg;
  }

  // Vector por objetivo, distribuidos angularmente
  let sumX = 0;
  let sumY = 0;
  active.forEach((goal, i) => {
    const angle = (2 * Math.PI * i) / active.length - Math.PI / 2;
    const len = (goal.progress / 100) * R;
    const tip = polar(angle, Math.max(len, 6));
    const edge = polar(angle, R);

    // Eje guía hasta el borde
    svg.append(
      svgEl("line", {
        x1: C, y1: C, x2: edge.x, y2: edge.y,
        stroke: "var(--border-subtle)", "stroke-width": 1,
      }),
    );

    // Vector del objetivo
    svg.append(
      svgEl("line", {
        x1: C, y1: C, x2: tip.x, y2: tip.y,
        stroke: "var(--cyan)", "stroke-width": 2, "stroke-linecap": "round",
      }),
    );
    svg.append(svgEl("circle", { cx: tip.x, cy: tip.y, r: 3.5, fill: "var(--cyan)" }));

    // Etiqueta en el borde
    const labelPos = polar(angle, R + 14);
    const label = svgEl("text", {
      x: labelPos.x, y: labelPos.y + 3, "text-anchor": "middle",
      fill: "var(--text-muted)", "font-size": 8.5,
      "font-family": "var(--font-mono)", "letter-spacing": "0.06em",
    });
    label.textContent = goal.title.toUpperCase().slice(0, 12);
    svg.append(label);

    sumX += Math.cos(angle) * (goal.progress / 100);
    sumY += Math.sin(angle) * (goal.progress / 100);
  });

  // Vector resultante (dirección global)
  const mag = Math.hypot(sumX, sumY);
  if (mag > 0.05) {
    const rx = C + (sumX / mag) * Math.min(mag, 1) * R;
    const ry = C + (sumY / mag) * Math.min(mag, 1) * R;

    const defs = svgEl("defs");
    const marker = svgEl("marker", {
      id: "lv-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5,
      markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse",
    });
    marker.append(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--primary)" }));
    defs.append(marker);
    svg.append(defs);

    svg.append(
      svgEl("line", {
        x1: C, y1: C, x2: rx, y2: ry,
        stroke: "var(--primary)", "stroke-width": 2.5,
        "marker-end": "url(#lv-arrow)",
        opacity: 0.9,
      }),
    );
  }

  return svg;
}
