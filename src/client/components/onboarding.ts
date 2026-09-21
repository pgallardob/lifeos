/**
 * Onboarding (sección 31 del documento).
 * Primera visita: modal de bienvenida que explica el flujo
 * Objetivo → Proyecto → Tareas y lleva a crear el primer objetivo.
 */
import { el } from "../lib/dom.js";

const KEY_PREFIX = "lifeos:onboarded";

const STEPS = [
  {
    icon: "◎",
    title: "Define un objetivo",
    text: "Lo que quieres conseguir: independizarte, lanzar un producto, aprender algo.",
  },
  {
    icon: "◈",
    title: "Divídelo en proyectos",
    text: "Cada objetivo se descompone en proyectos concretos con plazos y prioridad.",
  },
  {
    icon: "✓",
    title: "Ejecuta tareas",
    text: "Las tareas son las unidades de trabajo. El sistema calcula capacidad, riesgo y te da insights.",
  },
];

/** Muestra el onboarding una vez por usuario (clave por userId). */
export function mountOnboarding(userId: string): void {
  const key = `${KEY_PREFIX}:${userId}`;
  if (localStorage.getItem(key)) return;

  const list = el("ol", { className: "onboarding__steps" });
  for (const s of STEPS) {
    const li = el("li", { className: "onboarding__step" });
    li.append(
      el("span", { className: "onboarding__icon", "aria-hidden": "true", textContent: s.icon }),
      el("div", {}, [
        el("strong", { textContent: s.title }),
        el("p", { className: "onboarding__text", textContent: s.text }),
      ]),
    );
    list.append(li);
  }

  const startBtn = el("button", {
    className: "btn btn--primary",
    type: "button",
    textContent: "Crear mi primer objetivo",
  });
  startBtn.addEventListener("click", () => {
    close();
    window.location.href = "/pages/goals.html";
  });

  const skipBtn = el("button", {
    className: "btn btn--ghost",
    type: "button",
    textContent: "Explorar primero",
  });
  skipBtn.addEventListener("click", close);

  const box = el("div", {
    className: "onboarding",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "onboarding-title",
  });
  box.append(
    el("div", { className: "onboarding__logo mono", textContent: "LIFEOS" }),
    el("h2", { id: "onboarding-title", textContent: "Tu sistema operativo de vida" }),
    el("p", { className: "onboarding__sub", textContent: "Tres pasos para empezar:" }),
    list,
    el("div", { className: "onboarding__actions" }, [startBtn, skipBtn]),
  );

  const overlay = el("div", { className: "onboarding-backdrop" }, [box]);
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add("onboarding-backdrop--open"));

  function close(): void {
    localStorage.setItem(key, "1");
    overlay.classList.remove("onboarding-backdrop--open");
    setTimeout(() => overlay.remove(), 300);
  }
}
