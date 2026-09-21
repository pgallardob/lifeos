-- Migración 002: columna para persistir el resultado de cada simulación.
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS result TEXT;
