-- Soft delete + auditoría de purgas
-- Ejecutar una vez: psql -U rag -d ragdb -f scripts/migrations/2025-10-03-soft-delete.sql

-- Soft delete en rag_chunks
ALTER TABLE rag_chunks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Índice parcial para búsquedas "vivas" (optimización)
CREATE INDEX IF NOT EXISTS idx_rag_live ON rag_chunks(uri, chunk_idx)
WHERE deleted_at IS NULL;

-- Auditoría de purgas - trazabilidad completa
CREATE TABLE IF NOT EXISTS rag_purge_audit (
  id bigserial PRIMARY KEY,
  run_id text NOT NULL,
  actor text NOT NULL,           -- CI job / usuario
  reason text NOT NULL,          -- e.g., "not_in_source", "manual"
  uris jsonb NOT NULL,           -- lista de URIs afectadas
  dry_run boolean NOT NULL,
  affected_count int NOT NULL,
  threshold int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_purge_audit_run ON rag_purge_audit(run_id);
CREATE INDEX IF NOT EXISTS idx_purge_audit_actor ON rag_purge_audit(actor);
CREATE INDEX IF NOT EXISTS idx_purge_audit_created ON rag_purge_audit(created_at);

-- Comentarios para documentación
COMMENT ON COLUMN rag_chunks.deleted_at IS 'Timestamp de soft-delete. NULL = activo';
COMMENT ON TABLE rag_purge_audit IS 'Auditoría de purgas para trazabilidad y compliance';
COMMENT ON COLUMN rag_purge_audit.run_id IS 'ID único de ejecución para correlación';
COMMENT ON COLUMN rag_purge_audit.actor IS 'Origen de la purga (CI job, usuario, script)';
COMMENT ON COLUMN rag_purge_audit.threshold IS 'Umbral de seguridad utilizado (%)';
