-- Migración 001: OBSOLETA desde la migración 003 (multi-usuario).
-- Los recursos ahora son por usuario y se siembran en el registro
-- (auth.service.ts → seedResources). Este archivo queda como no-op
-- para mantener el historial de _migrations.
SELECT 1;
