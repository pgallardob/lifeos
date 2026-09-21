/**
 * Recuperación de contraseña: verifica nombre + email y permite
 * establecer una contraseña nueva. Cierra todas las sesiones activas.
 */
import { api, ApiError } from "../lib/api.js";

const form = document.getElementById("form-reset") as HTMLFormElement;
const errorEl = document.getElementById("reset-error") as HTMLElement;
const successEl = document.getElementById("reset-success") as HTMLElement;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  successEl.hidden = true;

  const btn = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  btn.disabled = true;
  const data = new FormData(form);
  try {
    await api.post("/api/auth/reset-password", {
      name: data.get("name"),
      email: data.get("email"),
      password: data.get("password"),
    });
    successEl.textContent = "Contraseña actualizada. Redirigiendo al login…";
    successEl.hidden = false;
    setTimeout(() => { window.location.href = "/pages/login.html"; }, 1500);
  } catch (err) {
    errorEl.textContent =
      err instanceof ApiError ? err.message : "Error de conexión. Inténtalo de nuevo.";
    errorEl.hidden = false;
    btn.disabled = false;
  }
});
