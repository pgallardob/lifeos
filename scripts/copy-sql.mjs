// Copia schema.sql y las migraciones al directorio de build (dist/server/database).
// tsc no emite archivos .sql; este paso forma parte de `npm run build:server`.
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("src/server/database");
const dest = resolve("dist/server/database");

mkdirSync(dest, { recursive: true });
cpSync(resolve(src, "schema.sql"), resolve(dest, "schema.sql"));
cpSync(resolve(src, "migrations"), resolve(dest, "migrations"), { recursive: true });

console.log("[build] SQL copiado a dist/server/database");
