/** Página de login/registro. Si ya hay sesión, redirige al dashboard. */
import { api, ApiError } from "../lib/api.js";
import { checkPassword } from "../lib/auth.js";

const DASHBOARD = "/pages/dashboard.html";

// Si ya hay sesión activa, directo al dashboard.
try {
  await api.get("/api/auth/me");
  window.location.href = DASHBOARD;
} catch {
  /* sin sesión: mostrar el formulario */
}

const tabLogin = document.getElementById("tab-login") as HTMLButtonElement;
const tabRegister = document.getElementById("tab-register") as HTMLButtonElement;
const formLogin = document.getElementById("form-login") as HTMLFormElement;
const formRegister = document.getElementById("form-register") as HTMLFormElement;
const loginError = document.getElementById("login-error") as HTMLElement;
const registerError = document.getElementById("register-error") as HTMLElement;

function showTab(login: boolean): void {
  tabLogin.classList.toggle("auth__tab--active", login);
  tabRegister.classList.toggle("auth__tab--active", !login);
  tabLogin.setAttribute("aria-selected", String(login));
  tabRegister.setAttribute("aria-selected", String(!login));
  formLogin.hidden = !login;
  formRegister.hidden = login;
}

tabLogin.addEventListener("click", () => showTab(true));
tabRegister.addEventListener("click", () => showTab(false));

function showError(el: HTMLElement, err: unknown): void {
  el.textContent = err instanceof ApiError ? err.message : "Error de conexión. Inténtalo de nuevo.";
  el.hidden = false;
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const btn = formLogin.querySelector<HTMLButtonElement>("button[type=submit]")!;
  btn.disabled = true;
  const data = new FormData(formLogin);
  try {
    await api.post("/api/auth/login", {
      email: data.get("email"),
      password: data.get("password"),
    });
    window.location.href = DASHBOARD;
  } catch (err) {
    showError(loginError, err);
    btn.disabled = false;
  }
});

formRegister.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerError.hidden = true;
  const data = new FormData(formRegister);
  const password = String(data.get("password") ?? "");
  const confirm = String(data.get("confirm") ?? "");
  const policyError = checkPassword(password);
  if (policyError) {
    registerError.textContent = policyError;
    registerError.hidden = false;
    return;
  }
  if (password !== confirm) {
    registerError.textContent = "Las contraseñas no coinciden.";
    registerError.hidden = false;
    return;
  }
  const btn = formRegister.querySelector<HTMLButtonElement>("button[type=submit]")!;
  btn.disabled = true;
  try {
    await api.post("/api/auth/register", {
      name: data.get("name"),
      email: data.get("email"),
      password: data.get("password"),
    });
    window.location.href = DASHBOARD;
  } catch (err) {
    showError(registerError, err);
    btn.disabled = false;
  }
});
