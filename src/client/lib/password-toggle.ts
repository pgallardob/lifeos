/**
 * Ojo para mostrar/ocultar contraseña.
 * attachPasswordToggle(input) envuelve el input en un contenedor
 * con un botón que alterna type password/text.
 */
import { el, svgEl } from "./dom.js";

const EYE = "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z";

function eyeIcon(): SVGSVGElement {
  const svg = svgEl("svg", {
    viewBox: "0 0 24 24", width: 15, height: 15, fill: "none",
    stroke: "currentColor", "stroke-width": 2,
    "stroke-linecap": "round", "stroke-linejoin": "round",
    "aria-hidden": "true",
  });
  svg.append(
    svgEl("path", { d: EYE }),
    svgEl("circle", { cx: 12, cy: 12, r: 3 }),
  );
  return svg;
}

/** Añade el botón ojo a un input type="password" (conserva el foco al alternar). */
export function attachPasswordToggle(input: HTMLInputElement): void {
  const wrap = el("span", { className: "auth__pass" });
  input.before(wrap);
  wrap.append(input);

  const icon = eyeIcon();
  const btn = el("button", {
    type: "button",
    className: "auth__eye",
    "aria-label": "Mostrar contraseña",
    "aria-pressed": "false",
  });
  btn.append(icon);

  let visible = false;
  btn.addEventListener("click", () => {
    visible = !visible;
    input.type = visible ? "text" : "password";
    btn.setAttribute("aria-pressed", String(visible));
    btn.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
    const slash = icon.querySelector("line");
    if (visible && !slash) {
      icon.append(svgEl("line", { x1: 2, y1: 2, x2: 22, y2: 22 }));
    } else if (!visible && slash) {
      slash.remove();
    }
    input.focus();
  });

  wrap.append(btn);
}
