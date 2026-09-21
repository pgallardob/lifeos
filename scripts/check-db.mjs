// Verificación de la base de datos LifeOS (Neon / Postgres).
// Uso: npm run db:check
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import "dotenv/config";

neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:check] Falta DATABASE_URL en .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

const { rows: tables } = await pool.query(
  `SELECT table_name AS name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name`,
);
const names = tables.map((r) => r.name);
console.log("[db:check] tablas:", names.join(", "));

const expected = [
  "users", "sessions", "goals", "projects", "tasks", "dependencies",
  "resources", "scenarios", "milestones", "insights", "events", "_migrations",
];
const missing = expected.filter((t) => !names.includes(t));
if (missing.length) {
  console.error("[db:check] FALTAN tablas:", missing.join(", "));
  await pool.end();
  process.exit(1);
}

const { rows: resources } = await pool.query(
  "SELECT type, available, capacity, unit FROM resources ORDER BY id",
);
console.log("[db:check] recursos:", JSON.stringify(resources));

const { rows: migrations } = await pool.query(
  "SELECT name FROM _migrations ORDER BY id",
);
console.log("[db:check] migraciones aplicadas:", migrations.map((m) => m.name).join(", ") || "ninguna");

await pool.end();
console.log("[db:check] OK — esquema completo en Neon");
