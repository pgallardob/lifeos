/** Middleware de autenticación: cookie de sesión → req.userId. */
import type { NextFunction, Request, Response } from "express";
import { getUserByToken } from "../services/auth.service.js";
import { HttpError } from "./http-error.js";

export const SESSION_COOKIE = "lifeos_session";

// Augmentación: req.userId disponible en todos los handlers tras requireAuth.
declare module "express-serve-static-core" {
  interface Request {
    userId: string;
  }
}

/** Extrae el token de sesión de la cookie (parser propio, sin dependencias). */
export function sessionTokenFrom(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Middleware Express: exige sesión válida. Adjunta req.userId. */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = sessionTokenFrom(req.headers.cookie);
    if (!token) throw HttpError.unauthorized();
    const user = await getUserByToken(token);
    if (!user) throw HttpError.unauthorized("Sesión expirada. Vuelve a entrar.");
    req.userId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}

/** Resuelve el userId desde una cabecera cookie (para el upgrade del WebSocket). */
export async function userIdFromCookie(cookieHeader: string | undefined): Promise<string | null> {
  const token = sessionTokenFrom(cookieHeader);
  if (!token) return null;
  const user = await getUserByToken(token);
  return user?.id ?? null;
}
