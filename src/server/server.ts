import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { config } from "./config.js";
import { initDatabase } from "./database/database.js";
import { goalsRouter } from "./routes/goals.routes.js";
import { projectsRouter } from "./routes/projects.routes.js";
import { tasksRouter } from "./routes/tasks.routes.js";
import { resourcesRouter } from "./routes/resources.routes.js";
import { capacityRouter } from "./routes/capacity.routes.js";
import { scenariosRouter } from "./routes/scenarios.routes.js";
import { insightsRouter } from "./routes/insights.routes.js";
import { initWebSocket } from "./ws.js";

const app = express();

app.use(express.json({ limit: "256kb" }));

// ─── Salud del sistema ────────────────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "lifeos", time: new Date().toISOString() });
});

// ─── Rutas de la API ──────────────────────────────────────────────────────────
app.use("/api/goals", goalsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/resources", resourcesRouter);
app.use("/api/capacity", capacityRouter);
app.use("/api/simulations", scenariosRouter);
app.use("/api/insights", insightsRouter);

// ─── Estáticos (build de producción del cliente) ─────────────────────────────
if (existsSync(config.publicDir)) {
  app.use(express.static(config.publicDir, { maxAge: "1h", index: "index.html" }));
}

// ─── 404 para rutas API desconocidas ──────────────────────────────────────────
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Recurso no encontrado" });
});

// ─── Manejo centralizado de errores ───────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Error interno";
  if (!config.isProduction) {
    console.error("[lifeos] error:", err);
  }
  res.status(500).json({ error: message });
});

const server = createServer(app);
initWebSocket(server);

// Inicializa Neon (schema + migraciones) antes de aceptar peticiones.
initDatabase()
  .then(() => {
    server.listen(config.port, config.host, () => {
      console.log(`[lifeos] API escuchando en http://${config.host}:${config.port}`);
      console.log(`[lifeos] WebSocket en ws://${config.host}:${config.port}/ws`);
      console.log(`[lifeos] Base de datos: Neon (Postgres)`);
    });
  })
  .catch((err) => {
    console.error("[lifeos] Error conectando a la base de datos:", err);
    process.exit(1);
  });
