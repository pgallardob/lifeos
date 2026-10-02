/** Lookup rápido: nombre registrado para un email. Uso: node scripts/whoami.mjs <email> */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config();
const email = process.argv[2];
if (!email) { console.log("uso: node scripts/whoami.mjs <email>"); process.exit(1); }

const sql = neon(process.env.DATABASE_URL);
if (email === "--all") {
  const all = await sql`SELECT name, email, created_at FROM users ORDER BY created_at`;
  for (const u of all) console.log(`${u.name}  |  ${u.email}  |  ${u.created_at}`);
  console.log(`\n${all.length} usuario(s)`);
  process.exit(0);
}
const rows = await sql`SELECT name, email, created_at FROM users WHERE email = ${email.toLowerCase()}`;
if (!rows.length) { console.log("no existe ese email"); process.exit(0); }
console.log(`nombre: ${rows[0].name}  |  email: ${rows[0].email}  |  creada: ${rows[0].created_at}`);
