/**
 * Página de Recursos (secciones 20–21): tarjetas editables de
 * tiempo, dinero, energía y foco + panel de capacidad.
 */
import { mountShell } from "../app.js";
import { Field, readForm } from "../components/forms.js";
import { Button, Modal, ProgressBar, toast } from "../components/ui.js";
import { api, ApiError } from "../lib/api.js";
import { clear, el, mount } from "../lib/dom.js";
import { horas, numero, porcentaje } from "../lib/format.js";
import type { Resource, ResourceType } from "../../shared/types/index.js";
import type { CapacityReport } from "../../engine/capacity.js";

await mountShell({ active: "resources" });

const RESOURCE_META: Record<ResourceType, { label: string; icon: string; hint: string }> = {
  time: { label: "Tiempo", icon: "◌", hint: "Horas disponibles por semana" },
  money: { label: "Dinero", icon: "▣", hint: "Disponible para invertir" },
  energy: { label: "Energía", icon: "⚡", hint: "Nivel actual (%)" },
  focus: { label: "Foco", icon: "◎", hint: "Capacidad de concentración (%)" },
};

let resources: Resource[] = [];
let capacity: CapacityReport | null = null;

async function load(): Promise<void> {
  [resources, capacity] = await Promise.all([
    api.get<Resource[]>("/api/resources"),
    api.get<CapacityReport>("/api/capacity"),
  ]);
  renderCards();
  renderCapacity();
}

function formatResource(r: Resource): string {
  if (r.type === "time") return `${horas(r.available)} disponibles`;
  if (r.type === "money") return `${numero(r.available)} ${r.unit} disponibles`;
  return porcentaje(r.available);
}

function renderCards(): void {
  const grid = mount("#resource-grid");
  clear(grid);

  for (const r of resources) {
    const meta = RESOURCE_META[r.type];
    const card = el("article", { className: "card resource-card" });

    const head = el("div", { className: "resource-card__head" });
    head.append(
      el("span", { className: "resource-card__icon", "aria-hidden": "true", textContent: meta.icon }),
      el("span", { className: "label", textContent: meta.label }),
    );

    const value = el("div", { className: "resource-card__value mono", textContent: formatResource(r) });
    const hint = el("div", { className: "resource-card__hint", textContent: meta.hint });

    const editBtn = Button({
      label: "Ajustar",
      variant: "ghost",
      size: "sm",
      onClick: () => openEdit(r),
    });

    card.append(head, value, hint, editBtn);
    grid.append(card);
  }
}

function openEdit(resource: Resource): void {
  const meta = RESOURCE_META[resource.type];
  const form = el("form") as HTMLFormElement;
  form.append(
    Field({
      name: "available", label: `Disponible (${resource.unit || meta.hint})`,
      type: "number", min: 0, step: 0.5, value: resource.available, required: true,
    }),
    Field({
      name: "capacity", label: "Capacidad total",
      type: "number", min: 0, step: 0.5, value: resource.capacity, required: true,
    }),
    Field({ name: "unit", label: "Unidad", type: "text", value: resource.unit }),
  );

  const modal = Modal(`${meta.label} — ajustar`, form, [
    Button({ label: "Cancelar", variant: "ghost", onClick: () => modal.close() }),
    Button({
      label: "Guardar",
      variant: "primary",
      onClick: async () => {
        if (!form.reportValidity()) return;
        try {
          await api.patch(`/api/resources/${resource.type}`, readForm(form));
          modal.close();
          toast(`${meta.label} actualizado`, "success");
          await load();
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al guardar", "error");
        }
      },
    }),
  ]);
}

/** Panel de capacidad (sección 21): datos del Capacity Engine del servidor. */
function renderCapacity(): void {
  const body = mount("#capacity-body");
  clear(body);
  if (!capacity) return;

  const row = (label: string, pct: number, detail: string): HTMLElement => {
    const wrap = el("div", { className: "capacity-row" });
    const head = el("div", { className: "capacity-row__head" });
    head.append(
      el("span", { className: "label", textContent: label }),
      el("span", { className: "mono capacity-row__pct", textContent: porcentaje(pct) }),
    );
    wrap.append(
      head,
      ProgressBar(pct, pct > 85 ? "danger" : pct > 65 ? "warning" : "cyan"),
      el("div", { className: "capacity-row__detail", textContent: detail }),
    );
    return wrap;
  };

  body.append(
    row("Capacidad global", capacity.overallPct, "Ponderación de tiempo libre, energía y foco"),
    row("Carga de trabajo", capacity.workloadPct, "Horas de tareas pendientes vs. tiempo semanal"),
    row("Proyectos activos", capacity.projectLoadPct, "Carga por proyectos en curso"),
    row("Tiempo libre", capacity.timeAvailablePct, "Margen de tiempo restante esta semana"),
  );

  if (capacity.message) {
    body.append(
      el("div", { className: "capacity-warning" }, [
        el("span", { "aria-hidden": "true", textContent: "⚠ " }),
        el("strong", { textContent: "AVISO DE CAPACIDAD — " }),
        el("span", { textContent: capacity.message }),
      ]),
    );
  }
}

load().catch((err) => {
  console.error("[lifeos] error cargando recursos:", err);
  toast("No se pudieron cargar los recursos", "error");
});
