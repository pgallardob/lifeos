/**
 * Command Palette (sección 23 del documento): ⌘K / Ctrl+K.
 * Búsqueda difusa de acciones: navegación + acciones rápidas.
 */
import { NAV_ITEMS } from "../../shared/constants.js";
import { el } from "../lib/dom.js";

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

function buildCommands(): Command[] {
  const nav: Command[] = NAV_ITEMS.map((item) => ({
    id: `nav-${item.id}`,
    label: `Ir a ${item.label}`,
    hint: item.icon,
    run: () => {
      window.location.href = item.href;
    },
  }));

  const actions: Command[] = [
    {
      id: "new-goal",
      label: "Nuevo objetivo",
      hint: "+",
      run: () => document.dispatchEvent(new CustomEvent("lifeos:new-goal")),
    },
    {
      id: "new-project",
      label: "Nuevo proyecto",
      hint: "+",
      run: () => document.dispatchEvent(new CustomEvent("lifeos:new-project")),
    },
    {
      id: "new-task",
      label: "Nueva tarea",
      hint: "+",
      run: () => document.dispatchEvent(new CustomEvent("lifeos:new-task")),
    },
    {
      id: "focus",
      label: "Modo enfoque",
      hint: "◎",
      run: () => document.dispatchEvent(new CustomEvent("lifeos:focus-mode")),
    },
  ];

  return [...nav, ...actions];
}

/** Coincidencia difusa simple: todas las letras del query en orden. */
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (const ch of t) {
    if (ch === q[qi]) qi++;
    if (qi === q.length) return true;
  }
  return qi === q.length;
}

export function mountCommandPalette(): void {
  const commands = buildCommands();
  let overlay: HTMLElement | null = null;
  let selectedIndex = 0;
  let filtered: Command[] = commands;

  function open(): void {
    if (overlay) return;
    selectedIndex = 0;
    filtered = commands;

    const input = el("input", {
      className: "palette__input",
      type: "text",
      placeholder: "Escribe un comando o búsqueda…",
      "aria-label": "Buscar comando",
      "aria-expanded": "true",
      role: "combobox",
      "aria-controls": "palette-list",
    }) as HTMLInputElement;

    const list = el("ul", { className: "palette__list", id: "palette-list", role: "listbox" });

    const box = el("div", { className: "palette", role: "dialog", "aria-modal": "true", "aria-label": "Paleta de comandos" });
    box.append(input, list);

    overlay = el("div", { className: "palette-backdrop" }, [box]);
    document.body.append(overlay);
    requestAnimationFrame(() => overlay!.classList.add("palette-backdrop--open"));
    input.focus();

    input.addEventListener("input", () => {
      const q = input.value.trim();
      filtered = q ? commands.filter((c) => fuzzyMatch(q, c.label)) : commands;
      selectedIndex = 0;
      renderList();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
        renderList();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderList();
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[selectedIndex]?.run();
        close();
      } else if (e.key === "Escape") {
        close();
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    function renderList(): void {
      while (list.firstChild) list.removeChild(list.firstChild);
      if (!filtered.length) {
        list.append(el("li", { className: "palette__empty", textContent: "Sin resultados" }));
        return;
      }
      filtered.forEach((cmd, i) => {
        const li = el("li", {
          className: `palette__item${i === selectedIndex ? " palette__item--active" : ""}`,
          role: "option",
          "aria-selected": i === selectedIndex,
        });
        if (cmd.hint) li.append(el("span", { className: "palette__hint", "aria-hidden": "true", textContent: cmd.hint }));
        li.append(el("span", { textContent: cmd.label }));
        li.addEventListener("click", () => {
          cmd.run();
          close();
        });
        li.addEventListener("mousemove", () => {
          if (selectedIndex !== i) {
            selectedIndex = i;
            renderList();
          }
        });
        list.append(li);
      });
      list.querySelector(".palette__item--active")?.scrollIntoView({ block: "nearest" });
    }

    renderList();
  }

  function close(): void {
    if (!overlay) return;
    overlay.classList.remove("palette-backdrop--open");
    const node = overlay;
    overlay = null;
    setTimeout(() => node.remove(), 200);
  }

  // Atajo global: ⌘K / Ctrl+K
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay ? close() : open();
    }
  });

  // Evento desde el botón ⌘K del topbar
  document.addEventListener("lifeos:command-palette", open);
}
