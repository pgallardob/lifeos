/**
 * Página de Proyectos (sección 15): lista + detalle con tareas y dependencias.
 */
import { mountShell } from "../app.js";
import { DependencyGraph } from "../components/dependency-graph.js";
import { Field, readForm } from "../components/forms.js";
import { ProjectCard } from "../components/project-card.js";
import { Badge, Button, Modal, ProgressBar, toast } from "../components/ui.js";
import { api, ApiError } from "../lib/api.js";
import { clear, el, mount } from "../lib/dom.js";
import { fechaCorta, horas } from "../lib/format.js";
import type {
  Dependency,
  GoalWithProjects,
  ProjectWithRisk,
  Task,
  TaskStatus,
} from "../../shared/types/index.js";

mountShell({ active: "projects" });

let projects: ProjectWithRisk[] = [];
let goals: GoalWithProjects[] = [];
let selected: ProjectWithRisk | null = null;
let selectedTasks: Task[] = [];
let selectedDeps: Dependency[] = [];

async function load(): Promise<void> {
  [projects, goals] = await Promise.all([
    api.get<ProjectWithRisk[]>("/api/projects"),
    api.get<GoalWithProjects[]>("/api/goals"),
  ]);
  renderList();
}

function renderList(): void {
  const grid = mount("#project-grid");
  clear(grid);

  if (!projects.length) {
    const empty = el("div", { className: "empty-state" });
    empty.append(
      el("span", { className: "empty-state__icon", "aria-hidden": "true", textContent: "⬡" }),
      el("p", { textContent: "Sin proyectos. Crea uno para empezar a construir." }),
    );
    grid.append(empty);
    return;
  }
  for (const p of projects) grid.append(ProjectCard(p, openDetail));
}

// ─── Detalle del proyecto ─────────────────────────────────────────────────────

async function openDetail(project: ProjectWithRisk): Promise<void> {
  selected = project;
  [selectedTasks, selectedDeps] = await Promise.all([
    api.get<Task[]>(`/api/tasks?projectId=${project.id}`),
    api.get<Dependency[]>("/api/tasks/dependencies"),
  ]);
  renderDetail();
}

function renderDetail(): void {
  if (!selected) return;
  const panel = mount("#detail-panel");
  panel.hidden = false;
  mount("#detail-title").textContent = selected.title.toUpperCase();

  const body = mount("#detail-body");
  clear(body);

  // Meta del proyecto
  const meta = el("div", { className: "detail-meta" });
  meta.append(
    Badge(selected.status),
    Badge(selected.priority),
    el("span", { className: "label", textContent: `límite ${fechaCorta(selected.deadline)}` }),
    el("span", { className: "label", textContent: selected.estimatedHours ? `${horas(selected.estimatedHours)} est.` : "" }),
  );

  const progressRow = el("div", { className: "project-card__progress detail-progress" });
  progressRow.append(ProgressBar(selected.progress));

  // Acciones del proyecto
  const actions = el("div", { className: "detail-actions" });
  actions.append(
    Button({ label: "Editar", variant: "ghost", size: "sm", onClick: () => openEdit(selected!) }),
    Button({ label: "+ Tarea", size: "sm", onClick: () => openTaskForm() }),
  );

  // Lista de tareas
  const taskList = el("div", { className: "task-list" });
  const depSet = new Set(selectedDeps.map((d) => d.taskId));
  const depByTask = new Map<string, string[]>();
  for (const d of selectedDeps) {
    depByTask.set(d.taskId, [...(depByTask.get(d.taskId) ?? []), d.dependsOnTaskId]);
  }

  if (!selectedTasks.length) {
    taskList.append(
      el("p", { className: "muted", textContent: "Sin tareas. Añade la primera." }),
    );
  }

  for (const task of selectedTasks) {
    const row = el("div", { className: `task-row task-row--${task.status}` });
    const isBlocked = depSet.has(task.id) && task.status !== "completed";

    const check = el("button", {
      className: "task-row__check",
      type: "button",
      role: "checkbox",
      "aria-checked": task.status === "completed",
      "aria-label": `Marcar "${task.title}" como completada`,
      textContent: task.status === "completed" ? "✓" : "",
    });
    check.addEventListener("click", () => void toggleTask(task));

    const info = el("div", { className: "task-row__info" });
    info.append(el("span", { className: "task-row__title", textContent: task.title }));
    const sub: string[] = [];
    if (task.estimatedHours) sub.push(horas(task.estimatedHours));
    if (task.dueDate) sub.push(fechaCorta(task.dueDate));
    const deps = depByTask.get(task.id) ?? [];
    if (deps.length) {
      const names = deps
        .map((d) => selectedTasks.find((t) => t.id === d)?.title ?? d)
        .join(", ");
      sub.push(`depende de: ${names}`);
    }
    if (sub.length) info.append(el("span", { className: "task-row__sub", textContent: sub.join(" · ") }));

    const right = el("div", { className: "task-row__right" });
    right.append(Badge(isBlocked ? "blocked" : task.status));
    const depBtn = Button({
      label: "⛓",
      variant: "ghost",
      size: "sm",
      ariaLabel: `Gestionar dependencias de "${task.title}"`,
      onClick: () => openDeps(task),
    });
    const delBtn = Button({
      label: "✕",
      variant: "ghost",
      size: "sm",
      ariaLabel: `Eliminar "${task.title}"`,
      onClick: () => void deleteTask(task),
    });
    right.append(depBtn, delBtn);

    row.append(check, info, right);
    taskList.append(row);
  }

  body.append(meta, progressRow, actions, taskList);

  // Grafo de dependencias (sección 15): solo si hay dependencias en el proyecto
  const taskIds = new Set(selectedTasks.map((t) => t.id));
  const projectDeps = selectedDeps.filter((d) => taskIds.has(d.taskId));
  if (projectDeps.length) {
    const graphSection = el("div", { className: "dep-graph-section" });
    graphSection.append(
      el("h3", { className: "label", textContent: "Mapa de dependencias" }),
      DependencyGraph(selectedTasks, projectDeps),
    );
    body.append(graphSection);
  }
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function toggleTask(task: Task): Promise<void> {
  const next: TaskStatus = task.status === "completed" ? "pending" : "completed";
  try {
    await api.patch(`/api/tasks/${task.id}`, { status: next });
    toast(next === "completed" ? `✓ ${task.title} — +momentum` : "Tarea reabierta", "success");
    await openDetail(selected!);
    await load();
  } catch (err) {
    toast(err instanceof ApiError ? err.message : "Error al actualizar", "error");
  }
}

async function deleteTask(task: Task): Promise<void> {
  try {
    await api.delete(`/api/tasks/${task.id}`);
    toast("Tarea eliminada", "success");
    await openDetail(selected!);
    await load();
  } catch (err) {
    toast(err instanceof ApiError ? err.message : "Error al eliminar", "error");
  }
}

// ─── Formularios ──────────────────────────────────────────────────────────────

function projectForm(project?: ProjectWithRisk): {
  form: HTMLFormElement;
  values: () => Record<string, string | number | undefined>;
} {
  const form = el("form") as HTMLFormElement;
  form.append(
    Field({ name: "title", label: "Título", type: "text", required: true, value: project?.title }),
    Field({ name: "description", label: "Descripción", type: "textarea", value: project?.description }),
    Field({
      name: "goalId", label: "Objetivo", type: "select", value: project?.goalId ?? "",
      options: [
        { value: "", label: "— Sin objetivo —" },
        ...goals.map((g) => ({ value: g.id, label: g.title })),
      ],
    }),
    Field({
      name: "priority", label: "Prioridad", type: "select", value: project?.priority ?? "medium",
      options: [
        { value: "low", label: "Baja" },
        { value: "medium", label: "Media" },
        { value: "high", label: "Alta" },
      ],
    }),
    Field({ name: "startDate", label: "Inicio", type: "date", value: project?.startDate?.slice(0, 10) ?? null }),
    Field({ name: "deadline", label: "Fecha límite", type: "date", value: project?.deadline?.slice(0, 10) ?? null }),
    Field({ name: "estimatedHours", label: "Horas estimadas", type: "number", min: 0, value: project?.estimatedHours }),
  );
  return { form, values: () => readForm(form) };
}

function openCreate(): void {
  const { form, values } = projectForm();
  const modal = Modal("Nuevo proyecto", form, [
    Button({ label: "Cancelar", variant: "ghost", onClick: () => modal.close() }),
    Button({
      label: "Crear proyecto",
      variant: "primary",
      onClick: async () => {
        if (!form.reportValidity()) return;
        try {
          await api.post("/api/projects", values());
          modal.close();
          toast("Proyecto creado", "success");
          await load();
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al crear", "error");
        }
      },
    }),
  ]);
}

function openEdit(project: ProjectWithRisk): void {
  const { form, values } = projectForm(project);
  const modal = Modal(`Editar — ${project.title}`, form, [
    Button({
      label: "Eliminar",
      variant: "danger",
      onClick: async () => {
        try {
          await api.delete(`/api/projects/${project.id}`);
          modal.close();
          selected = null;
          mount("#detail-panel").hidden = true;
          toast("Proyecto eliminado", "success");
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
          await api.patch(`/api/projects/${project.id}`, values());
          modal.close();
          toast("Proyecto actualizado", "success");
          await load();
          selected = await api.get<ProjectWithRisk>(`/api/projects/${project.id}`);
          renderDetail();
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al guardar", "error");
        }
      },
    }),
  ]);
}

function openTaskForm(): void {
  if (!selected) return;
  const form = el("form") as HTMLFormElement;
  form.append(
    Field({ name: "title", label: "Título", type: "text", required: true }),
    Field({ name: "estimatedHours", label: "Horas estimadas", type: "number", min: 0, step: 0.5 }),
    Field({ name: "dueDate", label: "Fecha límite", type: "date" }),
    Field({
      name: "priority", label: "Prioridad", type: "select", value: "medium",
      options: [
        { value: "low", label: "Baja" },
        { value: "medium", label: "Media" },
        { value: "high", label: "Alta" },
      ],
    }),
  );
  const modal = Modal(`Nueva tarea — ${selected.title}`, form, [
    Button({ label: "Cancelar", variant: "ghost", onClick: () => modal.close() }),
    Button({
      label: "Añadir tarea",
      variant: "primary",
      onClick: async () => {
        if (!form.reportValidity()) return;
        try {
          await api.post("/api/tasks", { ...readForm(form), projectId: selected!.id });
          modal.close();
          toast("Tarea añadida", "success");
          await openDetail(selected!);
          await load();
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al crear la tarea", "error");
        }
      },
    }),
  ]);
}

function openDeps(task: Task): void {
  const others = selectedTasks.filter((t) => t.id !== task.id && t.status !== "completed");
  const current = new Set(
    selectedDeps.filter((d) => d.taskId === task.id).map((d) => d.dependsOnTaskId),
  );

  const form = el("form") as HTMLFormElement;
  const list = el("div", { className: "dep-list" });
  if (!others.length) {
    list.append(el("p", { className: "muted", textContent: "No hay otras tareas activas en este proyecto." }));
  }
  for (const other of others) {
    const label = el("label", { className: "dep-item" });
    const cb = el("input", { type: "checkbox", value: other.id }) as HTMLInputElement;
    cb.checked = current.has(other.id);
    label.append(cb, el("span", { textContent: other.title }));
    list.append(label);
  }
  form.append(list);

  const modal = Modal(`Dependencias — ${task.title}`, form, [
    Button({ label: "Cancelar", variant: "ghost", onClick: () => modal.close() }),
    Button({
      label: "Guardar",
      variant: "primary",
      onClick: async () => {
        const wanted = new Set(
          [...form.querySelectorAll<HTMLInputElement>("input[type=checkbox]:checked")].map((c) => c.value),
        );
        try {
          for (const dep of current) {
            if (!wanted.has(dep)) {
              await api.delete(`/api/tasks/${task.id}/dependencies/${dep}`);
            }
          }
          for (const dep of wanted) {
            if (!current.has(dep)) {
              await api.post(`/api/tasks/${task.id}/dependencies`, { dependsOnTaskId: dep });
            }
          }
          modal.close();
          toast("Dependencias actualizadas", "success");
          await openDetail(selected!);
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Error al guardar dependencias", "error");
        }
      },
    }),
  ]);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

mount("#btn-new-project").addEventListener("click", openCreate);
mount("#btn-close-detail").addEventListener("click", () => {
  mount("#detail-panel").hidden = true;
  selected = null;
});
document.addEventListener("lifeos:new-project", openCreate);

load().catch((err) => {
  console.error("[lifeos] error cargando proyectos:", err);
  toast("No se pudieron cargar los proyectos", "error");
});
