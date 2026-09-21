import { NAV_ITEMS } from "../../shared/constants.js";
import { el } from "../lib/dom.js";

/** Grupos del sidebar según la sección 12 del documento. */
const GRUPOS: (readonly (typeof NAV_ITEMS)[number]["id"][])[] = [
  ["overview", "objectives", "projects", "timeline"],
  ["simulator", "insights", "resources"],
  ["settings"],
];

/**
 * Renderiza el sidebar futurista.
 * @param activeId id de la página actual (NAV_ITEMS[].id)
 */
export function renderSidebar(activeId: string): HTMLElement {
  const nav = el("nav", { className: "sidebar__nav", "aria-label": "Navegación principal" });

  GRUPOS.forEach((grupo, gi) => {
    if (gi > 0) nav.append(el("hr", { className: "sidebar__divider" }));
    for (const id of grupo) {
      const item = NAV_ITEMS.find((n) => n.id === id);
      if (!item) continue;
      const link = el("a", {
        className: "sidebar__link",
        href: item.href,
        ...(item.id === activeId ? { "aria-current": "page" } : {}),
      });
      link.append(
        el("span", { className: "sidebar__icon", "aria-hidden": "true", textContent: item.icon }),
        el("span", { textContent: item.label }),
      );
      nav.append(link);
    }
  });

  const logo = el("a", { className: "sidebar__logo", href: "/" });
  logo.append(
    el("span", { className: "sidebar__logo-mark", "aria-hidden": "true", textContent: "◉" }),
    el("span", { textContent: "LIFEOS" }),
  );

  const footer = el("div", { className: "sidebar__footer" });
  footer.append(
    el("span", { className: "status-dot", "aria-hidden": "true" }),
    el("span", { textContent: "SISTEMA EN LÍNEA" }),
  );

  const aside = el("aside", { className: "sidebar" });
  aside.append(logo, nav, footer);
  return aside;
}
