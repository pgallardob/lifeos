/** Constructores de campos de formulario reutilizables. */
import { el } from "../lib/dom.js";

export interface FieldSpec {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  value?: string | number | null;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function Field(spec: FieldSpec): HTMLElement {
  const wrap = el("div", { className: "field" });
  const id = `f-${spec.name}`;
  wrap.append(el("label", { for: id, textContent: spec.label }));

  const common: Record<string, string | number | boolean> = {
    id,
    name: spec.name,
    ...(spec.required ? { required: true } : {}),
  };

  if (spec.type === "select") {
    const select = el("select", common);
    for (const opt of spec.options ?? []) {
      const option = el("option", { value: opt.value, textContent: opt.label });
      if (String(spec.value ?? "") === opt.value) option.setAttribute("selected", "");
      select.append(option);
    }
    wrap.append(select);
  } else if (spec.type === "textarea") {
    const area = el("textarea", { ...common, rows: 3 });
    area.value = String(spec.value ?? "");
    wrap.append(area);
  } else {
    const input = el("input", {
      ...common,
      type: spec.type,
      ...(spec.placeholder ? { placeholder: spec.placeholder } : {}),
      ...(spec.min !== undefined ? { min: spec.min } : {}),
      ...(spec.max !== undefined ? { max: spec.max } : {}),
      ...(spec.step !== undefined ? { step: spec.step } : {}),
    });
    input.value = spec.value === null || spec.value === undefined ? "" : String(spec.value);
    wrap.append(input);
  }
  return wrap;
}

/** Lee los valores de un <form> como objeto. "" → undefined. */
export function readForm(form: HTMLFormElement): Record<string, string | number | undefined> {
  const data = new FormData(form);
  const out: Record<string, string | number | undefined> = {};
  for (const [key, value] of data.entries()) {
    const str = String(value).trim();
    if (str === "") {
      out[key] = undefined;
      continue;
    }
    const input = form.elements.namedItem(key);
    out[key] = input instanceof HTMLInputElement && input.type === "number" ? Number(str) : str;
  }
  return out;
}
