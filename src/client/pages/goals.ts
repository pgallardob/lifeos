/**
 * Página de Objetivos (sección 14): grid de órbitas con CRUD completo.
 */
import { mountShell } from "../app.js";
import { Field, readForm } from "../components/forms.js";
import { GoalCard } from "../components/goal-card.js";
import { Button, Modal, Tabs, toast } from "../components/ui.js";
import { api, ApiError } from "../lib/api.js";
import { clear, el, mount } from "../lib/dom.js";
import type { GoalWithProjects } from "../../shared/types/index.js";

mountShell({ active: "objectives" });

type Filter = "active" | "completed" | "paused" | "all";
let currentFilter: Filter = "active";
let goals: GoalWithProjects[] = [];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "active", label: "Activos" },
  { id: "completed", label: "Completados" },
  { id: "paused", label: "Pausados" },
  { id: "all", label: "Todos" },
];

async function load(): Promise<void> {
  goals = await api.get<GoalWithProjects[]>("/api/goals");
  render();
}

function render(): void {
  const grid = mount("#goal-grid");
  clear(grid);

  const filtered =
    currentFilter === "all" ? goals : goals.filter((g) => g.status === currentFilter);

  if (!filtered.length) {
    const empty = el("div", { className: "empty-state" });
    empty.append(
      el("span", { className: "empty-state__icon", "aria-hidden": "true", textContent: "◇" }),
      el("p", {
        textContent:
          currentFilter === "active"
            ? "Sin objetivos activos. Crea el primero para iniciar tu sistema."
            : "No hay objetivos en este estado.",
      }),
    );
    grid.append(empty);
    return;
  }

  for (const goal of filtered) {
    grid.append(GoalCard(goal, openDetail));
  }
}

// ─── Formulario de objetivo (crear / editar) ──────────────────────────────────

function goalForm(goal?: GoalWithProjects): {
  form: HTMLFormElement;
  values: () => Record<string, string | number | undefined>;
} {
  const form = el("form", { className: "form" }) as HTMLFormElement;
  form.append(
    Field({ name: "title", label: "Título", type: "text", required: true, value: goal?.title }),
    Field({ name: "description", label: "Descripción", type: "textarea", value: goal?.description }),
    Field({
      name: "targetDate", label: "Fecha límite", type: "date",
      value: goal?.targetDate?.slice(0, 10) ?? null,
    }),
    Field({
      name: "priority", label: "Prioridad", type: "select", value: goal?.priority ?? "medium",
      options: [
        { value: "low", label: "Baja" },
        { value: "medium", label: "Media" },
        { value: "high", label: "Alta" },
      ],
    }),
    Field({ name: "targetValue", label: "Valor objetivo (opcional)", type: "number", min: 0, value: goal?.targetValue }),
    Field({ name: "currentValue", label: "Valor actual", type: "number", min: 0, value: goal?.currentValue ?? 0 }),
    Field({
      name: "unit", label: "Unidad (CLP, USD, horas…)", type: "text",
      value: goal?.unit, placeholder: "CLP",
    }),
  );
  return { form, values: () => readForm(form) };
}

function openCreate(): void {
  const { form, values } = goalForm();
  const modal = Modal("Nuevo objetivo", form, [
    Button({ label: "Cancelar", variant: "ghost", onClick: () => modal.close() }),
    Button({
      label: "Crear objetivo",
      variant: "primary",
      onClick: async () => {
        if (!form.reportValidity()) return;
        try {
          await api.post("/api/goals", values());
          modal.close();
          toast("Objetivo creado", "success");
          await load();
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al crear el objetivo", "error");
        }
      },
    }),
  ]);
}

function openDetail(goal: GoalWithProjects): void {
  const { form, values } = goalForm(goal);
  const modal = Modal(goal.title, form, [
    Button({
      label: "Eliminar",
      variant: "danger",
      onClick: async () => {
        try {
          await api.delete(`/api/goals/${goal.id}`);
          modal.close();
          toast("Objetivo eliminado", "success");
          await load();
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al eliminar", "error");
        }
      },
    }),
    Button({ label: "Cancelar", variant: "ghost", onClick: () => modal.close() }),
    Button({
      label: "Guardar",
      variant: "primary",
      onClick: async () => {
        if (!form.reportValidity()) return;
        try {
          await api.patch(`/api/goals/${goal.id}`, values());
          modal.close();
          toast("Objetivo actualizado", "success");
          await load();
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al guardar", "error");
        }
      },
    }),
  ]);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

mount("#goal-tabs").append(
  Tabs(FILTERS, currentFilter, (id) => {
    currentFilter = id as Filter;
    render();
  }),
);

mount("#btn-new-goal").addEventListener("click", openCreate);

document.addEventListener("lifeos:new-goal", openCreate);

load().catch((err) => {
  console.error("[lifeos] error cargando objetivos:", err);
  toast("No se pudieron cargar los objetivos", "error");
});
