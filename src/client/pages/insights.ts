/**
 * Página de Insights (sección 19): recomendaciones accionables del sistema.
 */
import { mountShell } from "../app.js";
import { toast } from "../components/ui.js";
import { api } from "../lib/api.js";
import { clear, el, mount } from "../lib/dom.js";
import type { Insight, InsightSeverity } from "../../shared/types/index.js";

await mountShell({ active: "insights" });

const SEVERITY_META: Record<InsightSeverity, { icon: string; label: string }> = {
  critical: { icon: "△", label: "Crítico" },
  warning: { icon: "⚠", label: "Atención" },
  info: { icon: "◈", label: "Info" },
  positive: { icon: "✓", label: "Positivo" },
};

async function load(): Promise<void> {
  const list = mount("#insights-list");
  clear(list);

  const insights = await api.get<Insight[]>("/api/insights");

  if (!insights.length) {
    const empty = el("div", { className: "empty-state" });
    empty.append(
      el("span", { className: "empty-state__icon", "aria-hidden": "true", textContent: "✓" }),
      el("p", { textContent: "Todo en orden. El sistema no detecta nada que requiera atención." }),
    );
    list.append(empty);
    return;
  }

  // Orden: critical → warning → info → positive
  const order: InsightSeverity[] = ["critical", "warning", "info", "positive"];
  const sorted = [...insights].sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
  );

  for (const insight of sorted) {
    const meta = SEVERITY_META[insight.severity];
    const card = el("article", { className: `insight-card insight-card--${insight.severity}` });

    const head = el("div", { className: "insight-card__head" });
    head.append(
      el("span", { className: "insight-card__icon", "aria-hidden": "true", textContent: meta.icon }),
      el("span", { className: "insight-card__title", textContent: insight.title }),
      el("span", { className: `badge badge--${insight.severity === "positive" ? "completed" : insight.severity === "info" ? "active" : insight.severity}`, textContent: meta.label }),
    );

    card.append(head, el("p", { className: "insight-card__explanation", textContent: insight.explanation }));

    if (insight.action) {
      const action = el("div", { className: "insight-card__action" });
      action.append(
        el("span", { className: "label", textContent: "Acción sugerida" }),
        el("span", { textContent: insight.action }),
      );
      card.append(action);
    }

    list.append(card);
  }
}

mount("#btn-refresh").addEventListener("click", () => {
  load().catch(() => toast("No se pudieron cargar los insights", "error"));
});

load().catch((err) => {
  console.error("[lifeos] error cargando insights:", err);
  toast("No se pudieron cargar los insights", "error");
});
