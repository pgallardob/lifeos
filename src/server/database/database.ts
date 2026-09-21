import { neonConfig, Pool, type PoolClient, type QueryResult } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ws from "ws";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// El Pool de Neon usa WebSocket en Node.js; hay que indicarle el constructor.
neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;

/** Pool singleton de conexiones a Neon (Postgres serverless). */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

/** Ejecuta una consulta y devuelve todas las filas. */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

/** Ejecuta una consulta y devuelve la primera fila (o undefined). */
export async function queryOne<T>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/** Ejecuta INSERT/UPDATE/DELETE y devuelve el resultado (rowCount, etc.). */
export async function execute(text: string, params: unknown[] = []): Promise<QueryResult> {
  return getPool().query(text, params);
}

/** Cierra el pool (apagado controlado). */
export async function closeDatabase(): Promise<void> {
  await pool?.end();
  pool = null;
}

/**
 * Aplica schema.sql y luego las migraciones numeradas de ./migrations
 * que aún no se hayan ejecutado. Cada migración corre en una transacción
 * sobre un cliente dedicado y se registra en _migrations.
 */
export async function initDatabase(): Promise<void> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    await client.query(schema);

    let files: string[] = [];
    try {
      files = readdirSync(join(__dirname, "migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort();
    } catch {
      return; // Sin carpeta de migraciones.
    }

    const appliedRows = await client.query<{ name: string }>("SELECT name FROM _migrations");
    const applied = new Set(appliedRows.rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(__dirname, "migrations", file), "utf-8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
