-- TaskDB schema for PostgreSQL
CREATE TABLE IF NOT EXISTS taskdb_events (
  id BIGSERIAL PRIMARY KEY,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  component TEXT NOT NULL,
  actor TEXT,
  kind TEXT NOT NULL,
  status TEXT,
  ts BIGINT NOT NULL,
  duration_ms INTEGER,
  payload JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taskdb_events_ts ON taskdb_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_taskdb_events_run ON taskdb_events (run_id);
CREATE INDEX IF NOT EXISTS idx_taskdb_events_task ON taskdb_events (task_id);
CREATE INDEX IF NOT EXISTS idx_taskdb_events_kind ON taskdb_events (kind);
CREATE INDEX IF NOT EXISTS idx_taskdb_events_component ON taskdb_events (component);
