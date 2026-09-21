import type { GoalWithProjects } from "../../shared/types/index.js";
import { el } from "../lib/dom.js";
import { dinero, fechaCorta, numero, porcentaje } from "../lib/format.js";
import { Badge, ProgressRing } from "./ui.js";

/**
 * Tarjeta de objetivo (sección 14): anillo de progreso tipo "órbita",
 * con TARGET / CURRENT / DEADLINE debajo.
 */
export function GoalCard(goal: GoalWithProjects, onOpen?: (goal: GoalWithProjects) => void): HTMLElement {
  const card = el("article", {
    className: "card card--interactive goal-card",
    tabindex: "0",
    role: "button",
    "aria-label": `Objetivo ${goal.title}, ${porcentaje(goal.progress)} completado`,
  });

  const head = el("div", { className: "goal-card__head" });
  head.append(
    el("h3", { className: "goal-card__title", textContent: goal.title }),
    Badge(goal.status),
  );

  const orbit = el("div", { className: "goal-card__orbit" });
  orbit.append(ProgressRing(goal.progress, 104, 5));

  const stats = el("div", { className: "goal-card__stats" });
  const stat = (label: string, value: string): HTMLElement => {
    const s = el("div", { className: "goal-card__stat" });
    s.append(
      el("div", { className: "label", textContent: label }),
      el("div", { className: "goal-card__stat-value mono", textContent: value }),
    );
    return s;
  };

  const hasValue = goal.targetValue !== null;
  stats.append(
    stat("Objetivo", hasValue ? formatValue(goal.targetValue!, goal.unit) : "—"),
    stat("Actual", hasValue ? formatValue(goal.currentValue, goal.unit) : "—"),
    stat("Fecha límite", fechaCorta(goal.targetDate)),
  );

  const meta = el("div", { className: "goal-card__meta" });
  meta.append(
    Badge(goal.priority),
    el("span", {
      className: "label",
      textContent: `${goal.projects.length} proyecto${goal.projects.length === 1 ? "" : "s"}`,
    }),
  );

  card.append(head, orbit, stats, meta);

  if (onOpen) {
    card.addEventListener("click", () => onOpen(goal));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(goal);
      }
    });
  }
  return card;
}

function formatValue(value: number, unit: string | null): string {
  if (unit && /^(CLP|USD|EUR|MXN|ARS|COP)$/i.test(unit)) return dinero(value, unit.toUpperCase());
  return unit ? `${numero(value)} ${unit}` : numero(value);
}
