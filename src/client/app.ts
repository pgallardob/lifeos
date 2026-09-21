/**
 * Bootstrap compartido de LifeOS.
 * Cada página declara <body data-page="overview|objectives|…"> y este módulo
 * monta el shell (sidebar + contenido) y la barra superior.
 */
import { mountCommandPalette } from "./components/command-palette.js";
import { mountFocusMode } from "./components/focus-mode.js";
import { mountOnboarding } from "./components/onboarding.js";
import { renderSidebar } from "./components/sidebar.js";
import { logout, requireSession } from "./lib/auth.js";
import { el, mount, svgEl } from "./lib/dom.js";
import { fechaLarga } from "./lib/format.js";
import { connectWebSocket } from "./lib/ws.js";

export interface ShellOptions {
  /** id de navegación activo (NAV_ITEMS[].id) */
  active: string;
}

/** Monta el layout: sidebar + <main> con topbar. Devuelve el contenedor de página.
 *  Exige sesión activa: si no hay, redirige al login. */
export async function mountShell(options: ShellOptions): Promise<HTMLElement> {
  const user = await requireSession();
  const page = mount('[data-page-content]');
  const shell = el("div", { className: "app-shell" });

  const main = el("main", { className: "main", id: "main-content" });
  main.append(renderTopbar(user.name));

  // Mueve el contenido declarado en el HTML dentro de <main>
  while (page.firstChild) main.append(page.firstChild);
  page.remove();

  shell.append(renderSidebar(options.active), main);

  // Enlace "saltar al contenido" para navegación por teclado (sección 28)
  const skip = el("a", {
    className: "skip-link",
    href: "#main-content",
    textContent: "Saltar al contenido",
  });
  // Footer fijo con copyright
  const footer = el("footer", { className: "app-footer" });
  footer.append(
    el("span", { textContent: "2026" }),
    el("span", { className: "app-footer__sep", "aria-hidden": "true", textContent: "||" }),
    el("span", { textContent: "Todos los derechos reservados" }),
    el("span", { className: "app-footer__sep", "aria-hidden": "true", textContent: "||" }),
    el("span", { textContent: "Desarrollado por P. Gallardo" }),
  );

  document.body.append(skip, shell, footer);
  mountCommandPalette();
  mountFocusMode();
  connectWebSocket();
  mountOnboarding(user.id);
  registerServiceWorker();
  return main;
}

/** Registra el service worker solo en producción (en dev interferiría con HMR). */
function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch((err) => {
    console.warn("[lifeos] no se pudo registrar el service worker:", err);
  });
}

function renderTopbar(userName: string): HTMLElement {
  const topbar = el("header", { className: "topbar" });

  const date = el("span", { className: "topbar__date", textContent: fechaLarga() });

  const right = el("div", { className: "topbar__actions" });
  const status = el("span", { className: "topbar__status" });
  status.append(
    el("span", { className: "status-dot", "aria-hidden": "true" }),
    el("span", { textContent: "ESTADO ● ÓPTIMO" }),
  );

  const paletteBtn = el("button", {
    className: "kbd-hint",
    type: "button",
    "aria-label": "Abrir paleta de comandos",
    textContent: "⌘ K",
  });
  paletteBtn.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("lifeos:command-palette"));
  });

  const logoutBtn = el("button", {
    className: "btn btn--ghost btn--sm topbar__logout",
    type: "button",
    "aria-label": "Cerrar sesión",
    title: `Cerrar sesión (${userName})`,
  });
  const logoutIcon = svgEl("svg", {
    viewBox: "0 0 24 24", width: 14, height: 14, fill: "none",
    stroke: "currentColor", "stroke-width": 2,
    "stroke-linecap": "round", "stroke-linejoin": "round",
    "aria-hidden": "true",
  });
  logoutIcon.append(
    svgEl("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }),
    svgEl("polyline", { points: "16 17 21 12 16 7" }),
    svgEl("line", { x1: 21, y1: 12, x2: 9, y2: 12 }),
  );
  logoutBtn.append(logoutIcon, el("span", { textContent: "Salir" }));
  logoutBtn.addEventListener("click", () => void logout());

  right.append(paletteBtn, status, logoutBtn);
  topbar.append(date, right);
  return topbar;
}
