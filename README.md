# LifeOS

Tu sistema operativo de vida. Define objetivos, divídelos en proyectos y tareas, y deja que el sistema calcule tu capacidad, riesgo y te dé insights accionables. Multi-usuario con autenticación por sesión.

## Stack

- **Backend**: Node.js + TypeScript + Express + **Postgres (Neon serverless)**
- **Frontend**: Vite multi-página + TypeScript vanilla (sin framework) — **PWA instalable**
- **Auth**: sesiones con cookie `HttpOnly` (30 días) + contraseñas con `scrypt`
- **Tiempo real**: WebSocket (`ws`) autenticado por sesión
- **Tests**: Vitest (motores puros)

## Requisitos

- Node.js ≥ 20
- npm
- Una base de datos Postgres (Neon recomendado) — variable `DATABASE_URL` en `.env`

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
    lib/         auth (middleware), password (scrypt), validate, http-error
  client/        Vite multi-página
    components/  UI reutilizable (sidebar, tarjetas, grafo, timeline, paleta, focus…)
    pages/       Una página por sección (login, reset, dashboard, goals, projects,
                 timeline, resources, simulator, insights, settings)
    lib/         api, auth, dom, format, ws
    styles/      theme, components, dashboard, auth, animations, responsive
  shared/        Tipos y constantes compartidos cliente/servidor
tests/           Tests de los motores
scripts/         check-db, test-auth (E2E), copy-sql, gen-icons
```

## Modelo de datos

`users` → `sessions` · `goals` → `projects` → `tasks` (con `dependencies`), `resources`, `scenarios`, `milestones`, `insights`, `events`.
Todas las tablas de datos llevan `user_id` (aislamiento por usuario).
IDs con prefijo: `usr_`, `goal_`, `proj_`, `task_`, `res_`, `scn_`, `evt_`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Salud |
| POST | `/api/auth/register` | Crear cuenta (siembra recursos) |
| POST | `/api/auth/login` | Entrar (cookie de sesión) |
| POST | `/api/auth/logout` | Salir |
| POST | `/api/auth/reset-password` | Restablecer contraseña (nombre + email) |
| GET | `/api/auth/me` | Usuario actual |
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

- **Multi-usuario**: registro, login, recuperación de contraseña y sesiones de 30 días.
  Cada usuario ve solo sus datos (scoping por `user_id` en API y WebSocket).
  Política de contraseña: mínimo 8 caracteres con mayúscula, minúscula y número.
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
- **Ajustes**: perfil de cuenta y cierre de sesión.

## Cómo descargar y subir a GitHub

### Clonar el proyecto

```bash
git clone https://github.com/pgallardob/lifeos.git
cd lifeos
npm install
```

Crea un `.env` con tu `DATABASE_URL` (ver `.env` de ejemplo o el dashboard de Neon)
y arranca con `npm run dev`.

### Subirlo a tu propio GitHub

```bash
# 1. Crea un repo vacío en github.com (sin README ni .gitignore)

# 2. Apunta el remoto a tu repo y sube
git remote set-url origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Si partes de una carpeta sin git:

```bash
git init
git add -A
git commit -m "LifeOS"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

> **Importante**: `.env` está en `.gitignore` — nunca subas tu `DATABASE_URL`.

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
