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

/** Política de contraseña (espejo del servidor). Devuelve el error o null. */
export function checkPassword(password: string): string | null {
  if (
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return "Mínimo 8 caracteres, una mayúscula, una minúscula y un número.";
  }
  return null;
}
