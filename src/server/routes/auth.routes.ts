import { Router, type Request, type Response } from "express";
import { ah } from "../lib/async-handler.js";
import { SESSION_COOKIE, requireAuth, sessionTokenFrom } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { reqString } from "../lib/validate.js";
import { config } from "../config.js";
import * as authService from "../services/auth.service.js";

export const authRouter = Router();

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 días, en segundos

function setSessionCookie(res: Response, token: string): void {
  const secure = config.isProduction ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`,
  );
}

function clearSessionCookie(res: Response): void {
  const secure = config.isProduction ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
  );
}

function parseCredentials(body: Record<string, unknown>): { email: string; password: string } {
  const email = reqString(body, "email", 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw HttpError.badRequest("El email no tiene un formato válido.");
  }
  const password = reqString(body, "password", 200);
  if (password.length < 6) {
    throw HttpError.badRequest("La contraseña debe tener al menos 6 caracteres.");
  }
  return { email, password };
}

authRouter.post("/register", ah(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const name = reqString(body, "name", 100);
  const { email, password } = parseCredentials(body);
  const { user, token } = await authService.register(name, email, password);
  setSessionCookie(res, token);
  res.status(201).json({ user });
}));

authRouter.post("/login", ah(async (req: Request, res: Response) => {
  const { email, password } = parseCredentials(req.body as Record<string, unknown>);
  const { user, token } = await authService.login(email, password);
  setSessionCookie(res, token);
  res.json({ user });
}));

authRouter.post("/logout", ah(async (req: Request, res: Response) => {
  const token = sessionTokenFrom(req.headers.cookie);
  if (token) await authService.logout(token);
  clearSessionCookie(res);
  res.status(204).end();
}));

authRouter.get("/me", requireAuth, ah(async (req: Request, res: Response) => {
  const token = sessionTokenFrom(req.headers.cookie)!;
  const user = await authService.getUserByToken(token);
  res.json({ user });
}));
