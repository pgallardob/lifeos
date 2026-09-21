# LifeOS

Tu sistema operativo de vida. Define objetivos, divídelos en proyectos y tareas, y deja que el sistema calcule tu capacidad, riesgo y te dé insights accionables.

## Stack

- **Backend**: Node.js + TypeScript + Express + **Postgres (Neon serverless)**
- **Frontend**: Vite multi-página + TypeScript vanilla (sin framework) — **PWA instalable**
- **Tiempo real**: WebSocket (`ws`)
- **Tests**: Vitest (motores puros)

## Requisitos

- Node.js ≥ 18
- npm

## Arranque en desarrollo

```bash
npm install
npm run dev
```

- API: `http://127.0.0.1:4780`
- Cliente (Vite, con proxy a la API): `http://localhost:5173`

> El backend usa el puerto **4780** y el frontend **5173**. No se usa el puerto 3000.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor + cliente en modo desarrollo |
| `npm run dev:server` | Solo la API (tsx watch) |
| `npm run dev:client` | Solo Vite |
| `npm run build` | Build de producción (cliente + servidor) |
| `npm start` | Arranca el build de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Tests de los motores (Vitest) |
| `npm run db:check` | Verifica la base de datos |

## Estructura

```
src/
  engine/        Motores puros (capacity, risk, simulator, insights) — sin BD, testeables
  server/        Express: routes → controllers → services → database
    database/    Postgres (Neon): schema, migraciones, seed
    services/    Lógica de negocio que mapea BD → motores
  client/        Vite multi-página
    components/  UI reutilizable (sidebar, tarjetas, grafo, timeline, paleta, focus…)
    pages/       Una página por sección (dashboard, goals, projects, timeline, resources, simulator, insights)
    lib/         api, dom, format, ws
    styles/      theme, components, dashboard, animations, responsive
  shared/        Tipos y constantes compartidos cliente/servidor
tests/           Tests de los motores
```

## Modelo de datos

`goals` → `projects` → `tasks` (con `task_dependencies`), `resources`, `scenarios`, `events`.
IDs con prefijo: `goal_`, `proj_`, `task_`, `res_`, `scn_`, `evt_`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Salud |
| GET/POST/PATCH/DELETE | `/api/goals` | Objetivos |
| GET/POST/PATCH/DELETE | `/api/projects` | Proyectos (con riesgo) |
| GET | `/api/projects/:id/risk` | Informe de riesgo |
| GET/POST/PATCH/DELETE | `/api/tasks` | Tareas (+ dependencias) |
| GET/PUT | `/api/resources` | Recursos (tiempo, dinero, energía, foco) |
| GET | `/api/capacity` | Informe de capacidad |
| POST/GET | `/api/simulations` | Ejecutar/listar escenarios |
| GET | `/api/insights` | Insights accionables |
| WS | `/ws` | Eventos en tiempo real |

## Funcionalidades

- **Command Center**: métricas, trayectoria de vida, vector de vida, "Hoy".
- **Objetivos / Proyectos / Tareas**: CRUD completo, dependencias con detección de ciclos, grafo SVG.
- **Timeline**: zoom día/semana/mes/año.
- **Recursos + Capacity Engine**: carga de trabajo vs. tiempo disponible.
- **Risk Engine**: nivel de riesgo por proyecto con factores explicados.
- **Simulador**: escenarios "¿qué pasa si…?" con proyección y gráfico comparativo.
- **Insights**: recomendaciones accionables generadas del estado real.
- **Command Palette**: `Ctrl+K` / `⌘K`.
- **Focus Mode**: temporizador de concentración que registra minutos en la tarea.
- **WebSockets**: eventos en tiempo real con toasts.
- **Accesible y responsive**: skip-link, foco visible, `prefers-reduced-motion`, bottom-nav en móvil.
- **PWA**: instalable en el móvil (manifest + service worker + iconos), funciona offline para estáticos.

## Producción

```bash
npm run build
npm start
```

El servidor sirve la API, el WebSocket y los estáticos del cliente desde `dist/public`.

## Despliegue (Render + Neon)

La app está lista para desplegarse como servicio web persistente (soporta WebSockets):

1. **Base de datos**: ya tienes Neon — solo necesitas el `DATABASE_URL` (Pooled connection).
2. **Render**: conecta el repo → Render detecta `render.yaml` → crea el servicio.
   - Build: `npm install && npm run build` · Start: `npm start`
   - Define `DATABASE_URL` como variable de entorno secreta en el dashboard.
   - Render asigna `PORT` y da **HTTPS** automático (necesario para la PWA).
3. **Instalar en el móvil**: abre la URL de Render en el navegador del teléfono →
   "Añadir a pantalla de inicio" → se comporta como app nativa.

> En producción el servidor escucha en `0.0.0.0` (acepta tráfico externo) y sirve
> todo desde un solo proceso: API + WebSocket + frontend estático.
