-- ═══════════════════════════════════════════════════════════════════════════
-- LifeOS — Esquema de datos (PostgreSQL / Neon)
-- Modelo: USER → GOALS → PROJECTS → TASKS · RESOURCES · SCENARIOS · INSIGHTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  progress      DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  target_date   TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','completed','paused','archived')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high')),
  target_value  DOUBLE PRECISION,
  current_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,
  goal_id         TEXT REFERENCES goals(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  progress        DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','paused','archived')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high')),
  start_date      TEXT,
  deadline        TEXT,
  estimated_hours DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_goal ON projects(goal_id);

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','completed','blocked')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high')),
  estimated_hours DOUBLE PRECISION,
  due_date        TEXT,
  completed_at    TEXT,
  focused_minutes INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due     ON tasks(due_date);

-- Dependencias entre tareas: task_id queda bloqueada hasta completar depends_on_task_id
CREATE TABLE IF NOT EXISTS dependencies (
  id                 TEXT PRIMARY KEY,
  task_id            TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);
CREATE INDEX IF NOT EXISTS idx_deps_task ON dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_deps_on   ON dependencies(depends_on_task_id);

CREATE TABLE IF NOT EXISTS resources (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL UNIQUE
             CHECK (type IN ('time','money','energy','focus')),
  available  DOUBLE PRECISION NOT NULL DEFAULT 0,
  capacity   DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit       TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenarios (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  variables   TEXT NOT NULL DEFAULT '{}', -- JSON con ScenarioVariables
  result      TEXT,                        -- JSON con SimulationResult
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id         TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  goal_id    TEXT REFERENCES goals(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  date       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);

CREATE TABLE IF NOT EXISTS insights (
  id          TEXT PRIMARY KEY,
  severity    TEXT NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info','warning','critical','positive')),
  title       TEXT NOT NULL,
  explanation TEXT NOT NULL,
  action      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  entity_kind TEXT CHECK (entity_kind IN ('goal','project','task','scenario','resource')),
  entity_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
