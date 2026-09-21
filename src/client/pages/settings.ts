/**
 * Página de Ajustes: datos de la cuenta y acciones de sesión.
 */
import { mountShell } from "../app.js";
import { Button, toast } from "../components/ui.js";
import { api } from "../lib/api.js";
import { logout } from "../lib/auth.js";
import { el, mount } from "../lib/dom.js";
import { fechaCorta } from "../lib/format.js";
import type { User } from "../../shared/types/index.js";

await mountShell({ active: "settings" });

function field(label: string, value: string): HTMLElement {
  const row = el("div", { className: "capacity-row" });
  const head = el("div", { className: "capacity-row__head" });
  head.append(
    el("span", { className: "label", textContent: label }),
    el("span", { className: "mono", textContent: value }),
  );
  row.append(head);
  return row;
}

async function load(): Promise<void> {
  const { user } = await api.get<{ user: User }>("/api/auth/me");

  const account = mount("#account-body");
  account.append(
    field("Nombre", user.name),
    field("Email", user.email),
    field("Cuenta creada", fechaCorta(user.createdAt)),
  );

  const session = mount("#session-body");
  const logoutBtn = Button({
    label: "Cerrar sesión",
    variant: "danger",
    onClick: () => void logout(),
  });
  session.append(
    el("p", {
      className: "muted",
      textContent: "La sesión dura 30 días. Al cerrarla tendrás que volver a entrar con tu email y contraseña.",
    }),
    logoutBtn,
  );
}

load().catch((err) => {
  console.error("[lifeos] error cargando ajustes:", err);
  toast("No se pudieron cargar los ajustes", "error");
});
