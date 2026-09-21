/**
 * Página del Simulador (secciones 17–18): formulario de variables,
 * ejecución, gráfico comparativo e historial de escenarios.
 */
import { mountShell } from "../app.js";
import { Field, readForm } from "../components/forms.js";
import { SimulationChart } from "../components/simulation-chart.js";
import { Badge, toast } from "../components/ui.js";
import { api, ApiError } from "../lib/api.js";
import { clear, el, mount } from "../lib/dom.js";
import { fechaCorta } from "../lib/format.js";
import type { Scenario, SimulationResult } from "../../shared/types/index.js";

mountShell({ active: "simulator" });

const RISK_TEXT: Record<string, string> = {
  low: "RIESGO BAJO",
  medium: "RIESGO MEDIO",
  high: "RIESGO ALTO",
};

function buildForm(): void {
  const form = mount("#sim-form") as HTMLFormElement;
  form.append(
    Field({ name: "name", label: "Nombre del escenario", type: "text", required: true, placeholder: "Ahorro agresivo" }),
    Field({ name: "monthlySavings", label: "Ahorro mensual", type: "number", min: 0, placeholder: "500000" }),
    Field({ name: "income", label: "Ingreso mensual", type: "number", min: 0 }),
    Field({ name: "expenses", label: "Gasto mensual", type: "number", min: 0 }),
    Field({ name: "availableHoursPerWeek", label: "Horas disponibles / semana", type: "number", min: 0, step: 0.5 }),
    Field({ name: "deadline", label: "Fecha límite (opcional)", type: "date" }),
  );
}

function renderResult(result: SimulationResult): void {
  mount("#sim-summary").textContent = result.summary;

  const riskEl = mount("#sim-risk");
  riskEl.textContent = RISK_TEXT[result.riskLevel] ?? "";
  riskEl.style.color =
    result.riskLevel === "high" ? "var(--danger)"
    : result.riskLevel === "medium" ? "var(--warning)"
    : "var(--success)";

  const chartBox = mount("#sim-chart-container");
  clear(chartBox);
  if (result.projection.length > 1) {
    chartBox.append(SimulationChart(result.baseline, result.projection));
  }

  const affectedBox = mount("#sim-affected");
  clear(affectedBox);
  if (result.affected.length) {
    const list = el("ul", { className: "affected-list" });
    for (const item of result.affected) {
      const li = el("li", { className: "affected-item" });
      li.append(
        el("span", { className: "label", textContent: item.kind === "goal" ? "OBJETIVO" : "PROYECTO" }),
        el("span", { className: "affected-item__title", textContent: item.title }),
        el("span", {
          className: "mono affected-item__dates",
          textContent: `${fechaCorta(item.baselineDate)} → ${fechaCorta(item.projectedDate)}`,
        }),
      );
      list.append(li);
    }
    affectedBox.append(el("h3", { className: "label", textContent: "Elementos afectados" }), list);
  }
}

async function loadHistory(): Promise<void> {
  const box = mount("#sim-history");
  clear(box);
  const scenarios = await api.get<Scenario[]>("/api/simulations");
  if (!scenarios.length) {
    box.append(el("p", { className: "muted", textContent: "Aún no hay escenarios guardados." }));
    return;
  }
  for (const s of scenarios.slice(0, 8)) {
    const row = el("div", { className: "scenario-row" });
    row.append(
      el("span", { className: "scenario-row__name", textContent: s.name }),
      el("span", { className: "label", textContent: fechaCorta(s.createdAt) }),
    );
    box.append(row);
  }
}

mount("#btn-run").addEventListener("click", async () => {
  const form = mount("#sim-form") as HTMLFormElement;
  if (!form.reportValidity()) return;
  const values = readForm(form);
  const { name, ...variables } = values;
  try {
    const result = await api.post<SimulationResult>("/api/simulations", {
      name,
      variables: Object.fromEntries(Object.entries(variables).filter(([, v]) => v !== undefined)),
    });
    renderResult(result);
    toast("Simulación completada", "success");
    await loadHistory();
  } catch (err) {
    toast(err instanceof ApiError ? err.message : "Error al simular", "error");
  }
});

buildForm();
loadHistory().catch(() => toast("No se pudo cargar el historial", "error"));
