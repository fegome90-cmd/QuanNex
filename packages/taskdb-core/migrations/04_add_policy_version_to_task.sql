-- Migración 04: Agregar policy_version a la tabla task
-- Plan Maestro TaskDB - OLA 2: Políticas Versionadas
-- Objetivo: Permitir que las reglas de negocio evolucionen sin invalidar tareas anteriores

-- Agregar columna policy_version a la tabla task
ALTER TABLE task
ADD COLUMN policy_version TEXT NOT NULL DEFAULT '1.0.0';

-- Crear índice para optimizar búsquedas por versión de política
CREATE INDEX IF NOT EXISTS idx_task_policy_version ON task(policy_version);

-- Actualizar tareas existentes para que tengan la versión inicial
UPDATE task 
SET policy_version = '1.0.0' 
WHERE policy_version IS NULL OR policy_version = '';

-- Verificar integridad: todas las tareas deben tener policy_version
-- Este es un GATE de integridad que fallará si hay inconsistencias
SELECT COUNT(*) as tasks_without_policy_version
FROM task 
WHERE policy_version IS NULL OR policy_version = '';

-- Si el resultado es > 0, la migración falló
-- Expected result: 0
