import { randomBytes } from "node:crypto";
import type { User } from "../../shared/types/index.js";
import { execute, queryOne } from "../database/database.js";
import { HttpError } from "../lib/http-error.js";
import { newId } from "../lib/ids.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const SESSION_DAYS = 30;

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

/** Recursos iniciales de cada usuario nuevo (time/money/energy/focus). */
async function seedResources(userId: string): Promise<void> {
  const seeds: [string, number, number, string][] = [
    ["time", 40, 40, "h/semana"],
    ["money", 0, 0, "CLP"],
    ["energy", 80, 100, "%"],
    ["focus", 75, 100, "%"],
  ];
  for (const [type, available, capacity, unit] of seeds) {
    await execute(
      `INSERT INTO resources (id, user_id, type, available, capacity, unit)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, type) DO NOTHING`,
      [newId("res"), userId, type, available, capacity, unit],
    );
  }
}

/** Crea una sesión y devuelve el token opaco para la cookie. */
async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await execute(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expires.toISOString()],
  );
  return token;
}

/** Registro: crea usuario, siembra sus recursos y abre sesión. */
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const existing = await queryOne<UserRow>(
    `SELECT id FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  if (existing) {
    throw HttpError.conflict("Ya existe una cuenta con ese email.");
  }

  const id = newId("usr");
  try {
    await execute(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)`,
      [id, name, email.toLowerCase(), hashPassword(password)],
    );
  } catch (err) {
    // Carrera: otro request registró el mismo email entre el check y el INSERT.
    if ((err as { code?: string }).code === "23505") {
      throw HttpError.conflict("Ya existe una cuenta con ese email.");
    }
    throw err;
  }
  await seedResources(id);
  const token = await createSession(id);

  const row = (await queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]))!;
  return { user: toUser(row), token };
}

/**
 * Restablece la contraseña verificando nombre + email.
 * Sin servicio de email, la identidad se confirma con el nombre de la cuenta.
 * Invalida todas las sesiones activas del usuario.
 */
export async function resetPassword(
  name: string,
  email: string,
  newPassword: string,
): Promise<void> {
  const row = await queryOne<UserRow>(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  if (!row || row.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
    throw HttpError.badRequest("Los datos no coinciden con ninguna cuenta.");
  }
  await execute(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    hashPassword(newPassword),
    row.id,
  ]);
  await execute(`DELETE FROM sessions WHERE user_id = $1`, [row.id]);
}

/** Login: verifica credenciales y abre sesión. */
export async function login(
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const row = await queryOne<UserRow>(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw HttpError.unauthorized("Email o contraseña incorrectos.");
  }
  const token = await createSession(row.id);
  return { user: toUser(row), token };
}

/** Cierra la sesión (borra el token). */
export async function logout(token: string): Promise<void> {
  await execute(`DELETE FROM sessions WHERE id = $1`, [token]);
}

/** Resuelve un token de sesión a su usuario (o null si expiró/no existe). */
export async function getUserByToken(token: string): Promise<User | null> {
  const row = await queryOne<UserRow & { expires_at: string }>(
    `SELECT u.*, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [token],
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await logout(token); // limpia sesiones expiradas
    return null;
  }
  return toUser(row);
}
