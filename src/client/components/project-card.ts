import type { ProjectWithRisk } from "../../shared/types/index.js";
import { el } from "../lib/dom.js";
import { fechaCorta, horas, porcentaje } from "../lib/format.js";
import { Badge, ProgressBar } from "./ui.js";

const RISK_LABEL: Record<string, string> = { low: "Riesgo bajo", medium: "Riesgo medio", high: "Riesgo alto" };

/** Tarjeta de proyecto: título, progreso, prioridad, riesgo y fecha límite. */
export function ProjectCard(project: ProjectWithRisk, onOpen?: (project: ProjectWithRisk) => void): HTMLElement {
  const card = el("article", {
    className: "card card--interactive project-card",
    tabindex: "0",
    role: "button",
    "aria-label": `Proyecto ${project.title}, ${porcentaje(project.progress)} completado`,
  });

  const head = el("div", { className: "project-card__head" });
  head.append(
    el("h3", { className: "project-card__title", textContent: project.title }),
    Badge(project.status),
  );

  const progressRow = el("div", { className: "project-card__progress" });
  progressRow.append(
    ProgressBar(project.progress, project.progress >= 100 ? "success" : undefined),
    el("span", { className: "mono project-card__pct", textContent: porcentaje(project.progress) }),
  );

  const meta = el("div", { className: "project-card__meta" });
  meta.append(
    Badge(project.priority),
    Badge(project.riskLevel, RISK_LABEL[project.riskLevel]),
    el("span", {
      className: "label",
      textContent: project.deadline ? `límite ${fechaCorta(project.deadline)}` : "sin fecha límite",
    }),
    el("span", {
      className: "label",
      textContent: project.estimatedHours ? horas(project.estimatedHours) : "",
    }),
  );

  card.append(head, progressRow, meta);

  if (onOpen) {
    card.addEventListener("click", () => onOpen(project));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(project);
      }
    });
  }
  return card;
}
