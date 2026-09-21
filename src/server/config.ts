import "dotenv/config";
import { resolve } from "node:path";

const DEFAULT_PORT = 4780;
const FORBIDDEN_PORT = 3000; // Puerto en producción real — nunca usarlo.

function parsePort(raw: string | undefined): number {
  const port = raw ? Number.parseInt(raw, 10) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválido: "${raw}". Debe ser un entero entre 1 y 65535.`);
  }
  if (port === FORBIDDEN_PORT) {
    throw new Error(
      "El puerto 3000 está reservado para producción real. Elige otro puerto en .env (PORT).",
    );
  }
  return port;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Falta DATABASE_URL en .env. Obtén la connection string de tu proyecto Neon " +
      "(Dashboard → Connection Details → Pooled connection).",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  port: parsePort(process.env.PORT),
  // En producción (Render/Railway) hay que escuchar en 0.0.0.0 para aceptar
  // tráfico externo; en dev se queda en localhost.
  host: process.env.HOST ?? (isProduction ? "0.0.0.0" : "127.0.0.1"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  databaseUrl,
  publicDir: resolve(process.cwd(), "dist/public"),
} as const;
