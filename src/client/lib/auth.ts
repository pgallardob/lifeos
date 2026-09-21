/** Guard de sesión del lado cliente + logout. */
import type { User } from "../../shared/types/index.js";
import { api, ApiError } from "./api.js";

const LOGIN_PAGE = "/pages/login.html";

/** Devuelve el usuario autenticado o redirige a /pages/login.html. */
export async function requireSession(): Promise<User> {
  try {
    const { user } = await api.get<{ user: User }>("/api/auth/me");
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.href = LOGIN_PAGE;
      // Promesa que nunca resuelve: detiene el bootstrap de la página.
      return new Promise<User>(() => {});
    }
    throw err;
  }
}

/** Cierra la sesión y vuelve al login. */
export async function logout(): Promise<void> {
  try {
    await api.post("/api/auth/logout", {});
  } finally {
    window.location.href = LOGIN_PAGE;
  }
}
