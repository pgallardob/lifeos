/**
 * Sistema de componentes UI de LifeOS (sección 25 del documento).
 * Todos los componentes crean DOM de forma segura (sin innerHTML).
 */
import { el, svgEl } from "../lib/dom.js";

// ─── Button ───────────────────────────────────────────────────────────────────

export interface ButtonOptions {
  label: string;
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "default" | "sm";
  icon?: string;
  type?: "button" | "submit";
  onClick?: (event: MouseEvent) => void;
  ariaLabel?: string;
}

export function Button(opts: ButtonOptions): HTMLButtonElement {
  const variant = opts.variant ?? "default";
  const cls = ["btn"];
  if (variant !== "default") cls.push(`btn--${variant}`);
  if (opts.size === "sm") cls.push("btn--sm");

  const btn = el("button", {
    className: cls.join(" "),
    type: opts.type ?? "button",
    ...(opts.ariaLabel ? { "aria-label": opts.ariaLabel } : {}),
  });
  if (opts.icon) {
    btn.append(el("span", { "aria-hidden": "true", textContent: opts.icon }));
  }
  btn.append(el("span", { textContent: opts.label }));
  if (opts.onClick) btn.addEventListener("click", opts.onClick);
  return btn;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card(children: (Node | string)[], interactive = false): HTMLElement {
  return el("article", {
    className: `card${interactive ? " card--interactive" : ""}`,
  }, children);
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const BADGE_TEXT: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  paused: "Pausado",
  archived: "Archivado",
  pending: "Pendiente",
  in_progress: "En curso",
  blocked: "Bloqueado",
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export function Badge(kind: string, text?: string): HTMLElement {
  return el("span", {
    className: `badge badge--${kind}`,
    textContent: text ?? BADGE_TEXT[kind] ?? kind,
  });
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

export function ProgressBar(
  value: number,
  variant?: "cyan" | "success" | "warning" | "danger",
): HTMLElement {
  const pct = Math.max(0, Math.min(100, value));
  const bar = el("div", {
    className: "progress-bar",
    role: "progressbar",
    "aria-valuenow": pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
  });
  bar.append(
    el("div", {
      className: `progress-bar__fill${variant ? ` progress-bar__fill--${variant}` : ""}`,
      style: `width: ${pct}%`,
    }),
  );
  return bar;
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────

export function ProgressRing(value: number, size = 96, strokeWidth = 6): SVGSVGElement {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  const c = size / 2;

  const svg = svgEl("svg", {
    class: "progress-ring",
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    role: "img",
    "aria-label": `${Math.round(pct)}% completado`,
  });
  svg.append(
    svgEl("circle", {
      class: "progress-ring__track",
      cx: c, cy: c, r,
      fill: "none",
      "stroke-width": strokeWidth,
    }),
    svgEl("circle", {
      class: "progress-ring__value",
      cx: c, cy: c, r,
      fill: "none",
      "stroke-width": strokeWidth,
      "stroke-dasharray": circumference,
      "stroke-dashoffset": offset,
      transform: `rotate(-90 ${c} ${c})`,
    }),
  );
  const text = svgEl("text", {
    class: "progress-ring__text",
    x: c, y: c,
    "text-anchor": "middle",
    "dominant-baseline": "central",
  });
  text.textContent = `${Math.round(pct)}%`;
  svg.append(text);
  return svg;
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

export function MetricCard(label: string, value: string, modifier = ""): HTMLElement {
  const card = el("article", { className: "metric-card" });
  card.append(
    el("div", { className: "label", textContent: label }),
    el("div", {
      className: `metric-card__value${modifier ? ` ${modifier}` : ""}`,
      textContent: value,
    }),
  );
  return card;
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export function Alert(
  variant: "info" | "warning" | "danger" | "success",
  title: string,
  detail?: string,
): HTMLElement {
  const icons = { info: "◈", warning: "⚠", danger: "△", success: "✓" };
  const box = el("div", { className: `alert alert--${variant}`, role: "alert" });
  const body = el("div");
  body.append(el("div", { className: "today-card__title", textContent: title }));
  if (detail) body.append(el("div", { className: "today-card__detail", textContent: detail }));
  box.append(
    el("span", { className: "alert__icon", "aria-hidden": "true", textContent: icons[variant] }),
    body,
  );
  return box;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastRegion: HTMLElement | null = null;

export function toast(message: string, variant: "default" | "success" | "error" = "default"): void {
  if (!toastRegion) {
    toastRegion = el("div", {
      className: "toast-region",
      role: "status",
      "aria-live": "polite",
    });
    document.body.append(toastRegion);
  }
  const t = el("div", {
    className: `toast${variant !== "default" ? ` toast--${variant}` : ""}`,
    textContent: message,
  });
  toastRegion.append(t);
  requestAnimationFrame(() => t.classList.add("toast--visible"));
  setTimeout(() => {
    t.classList.remove("toast--visible");
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export interface ModalHandle {
  close: () => void;
  element: HTMLElement;
}

export function Modal(title: string, content: HTMLElement, actions: HTMLElement[]): ModalHandle {
  const modal = el("div", { className: "modal", role: "dialog", "aria-modal": "true" });
  modal.append(el("h2", { className: "modal__title", textContent: title }), content);
  if (actions.length) {
    modal.append(el("div", { className: "modal__actions" }, actions));
  }

  const backdrop = el("div", { className: "modal-backdrop" }, [modal]);

  const handle: ModalHandle = {
    element: backdrop,
    close() {
      backdrop.classList.remove("modal-backdrop--open");
      setTimeout(() => backdrop.remove(), 400);
      document.removeEventListener("keydown", onKey);
    },
  };

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") handle.close();
  }
  document.addEventListener("keydown", onKey);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) handle.close();
  });

  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add("modal-backdrop--open"));

  const firstInput = modal.querySelector<HTMLElement>("input, select, textarea, button");
  firstInput?.focus();

  return handle;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs(
  items: TabItem[],
  activeId: string,
  onSelect: (id: string) => void,
): HTMLElement {
  const tabs = el("div", { className: "tabs", role: "tablist" });
  for (const item of items) {
    const tab = el("button", {
      className: "tabs__tab",
      role: "tab",
      type: "button",
      "aria-selected": item.id === activeId,
      textContent: item.label,
    });
    tab.addEventListener("click", () => {
      tabs.querySelectorAll(".tabs__tab").forEach((t) => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      onSelect(item.id);
    });
    tabs.append(tab);
  }
  return tabs;
}
