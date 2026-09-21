-- Migración 003: autenticación multi-usuario.
-- Añade email/password a users, tabla sessions y user_id en todas las tablas.
-- Idempotente: funciona tanto en una BD vieja (añade columnas) como en una
-- fresca (schema.sql ya las creó → IF NOT EXISTS / guards las saltan).
-- Los datos existentes quedan huérfanos (sin usuario) → se eliminan.

-- 1. users: credenciales
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
DELETE FROM users; -- tabla vacía en la práctica; garantiza NOT NULL
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- 2. sessions
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 3. user_id en todas las tablas de datos (nullable primero)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['goals','projects','tasks','dependencies','resources','scenarios','milestones','insights','events']
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS user_id TEXT', t);
  END LOOP;
END $$;

-- 4. Datos huérfanos: sin user_id no pertenecen a nadie → fuera.
DELETE FROM dependencies;
DELETE FROM tasks;
DELETE FROM milestones;
DELETE FROM projects;
DELETE FROM goals;
DELETE FROM resources;
DELETE FROM scenarios;
DELETE FROM insights;
DELETE FROM events;

-- 5. user_id NOT NULL + FK a users
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['goals','projects','tasks','dependencies','resources','scenarios','milestones','insights','events']
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id SET NOT NULL', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_user_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE', t, t || '_user_id_fkey');
    END IF;
  END LOOP;
END $$;

-- 6. resources: el tipo ya no es único global, es único por usuario
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resources_user_type_key') THEN
    ALTER TABLE resources ADD CONSTRAINT resources_user_type_key UNIQUE (user_id, type);
  END IF;
END $$;

-- 7. Índices por usuario
CREATE INDEX IF NOT EXISTS idx_goals_user      ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user   ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user      ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_deps_user       ON dependencies(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user  ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_user  ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user     ON events(user_id);
