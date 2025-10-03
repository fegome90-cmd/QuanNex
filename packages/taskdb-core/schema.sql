-- TaskDB Core Schema - Plan Maestro TaskDB
-- Ola 1: Robustez - Implementación base antifrágil

-- Tabla de políticas versionadas
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rules JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Tabla de tareas con policy_version
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'doing', 'review', 'done', 'cancelled')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    policy_version VARCHAR(20) NOT NULL REFERENCES policies(version),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    assigned_to VARCHAR(100),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    -- Índices para performance
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_policy_version (policy_version),
    INDEX idx_tasks_created_at (created_at),
    INDEX idx_tasks_assigned_to (assigned_to)
);

-- Tabla de ejecuciones (runs)
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    duration_ms INTEGER NULL,
    tool_calls JSONB DEFAULT '[]',
    metrics JSONB DEFAULT '{}',
    error_message TEXT NULL,
    -- Índices
    INDEX idx_runs_task_id (task_id),
    INDEX idx_runs_status (status),
    INDEX idx_runs_started_at (started_at)
);

-- Tabla de gates (verificaciones)
CREATE TABLE IF NOT EXISTS gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('lint', 'policy', 'truth', 'quality', 'security')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pass', 'fail', 'pending')),
    checks JSONB DEFAULT '[]',
    policy_version VARCHAR(20) NOT NULL REFERENCES policies(version),
    run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Índices
    INDEX idx_gates_name (name),
    INDEX idx_gates_type (type),
    INDEX idx_gates_status (status),
    INDEX idx_gates_run_id (run_id)
);

-- Tabla de artifacts (outputs verificables)
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('report', 'code', 'data', 'config')),
    uri VARCHAR(500) NOT NULL,
    hash VARCHAR(64) NOT NULL, -- SHA256
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    -- Índices
    INDEX idx_artifacts_run_id (run_id),
    INDEX idx_artifacts_type (type),
    INDEX idx_artifacts_hash (hash),
    INDEX idx_artifacts_created_at (created_at)
);

-- Tabla de eventos (timeline inmutable)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('task', 'run', 'gate', 'artifact')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB DEFAULT '{}',
    source VARCHAR(20) NOT NULL CHECK (source IN ('api', 'cli', 'agent', 'system')),
    -- Índices para queries eficientes
    INDEX idx_events_entity_id (entity_id),
    INDEX idx_events_entity_type (entity_type),
    INDEX idx_events_timestamp (timestamp),
    INDEX idx_events_type (type),
    INDEX idx_events_source (source)
);

-- Tabla de reportes con provenance
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('analysis', 'audit', 'metrics', 'summary')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published', 'retracted')),
    content JSONB NOT NULL,
    report_provenance JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE NULL,
    retracted_at TIMESTAMP WITH TIME ZONE NULL,
    -- Índices
    INDEX idx_reports_status (status),
    INDEX idx_reports_type (type),
    INDEX idx_reports_created_at (created_at)
);

-- Vista materializada para status_derived
CREATE MATERIALIZED VIEW IF NOT EXISTS task_status_derived AS
SELECT 
    t.id,
    t.title,
    t.status as task_status,
    t.priority,
    t.policy_version,
    t.created_at,
    t.updated_at,
    t.completed_at,
    t.assigned_to,
    t.tags,
    -- Métricas derivadas de runs
    COUNT(r.id) as total_runs,
    COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as successful_runs,
    COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs,
    AVG(r.duration_ms) as avg_duration_ms,
    MAX(r.started_at) as last_run_at,
    -- Métricas derivadas de gates
    COUNT(g.id) as total_gates,
    COUNT(CASE WHEN g.status = 'pass' THEN 1 END) as passed_gates,
    COUNT(CASE WHEN g.status = 'fail' THEN 1 END) as failed_gates,
    -- Score de salud calculado
    CASE 
        WHEN COUNT(r.id) = 0 THEN 0.0
        ELSE (COUNT(CASE WHEN r.status = 'completed' THEN 1 END)::FLOAT / COUNT(r.id)) * 
             (COUNT(CASE WHEN g.status = 'pass' THEN 1 END)::FLOAT / NULLIF(COUNT(g.id), 0))
    END as health_score,
    -- Estado derivado
    CASE 
        WHEN t.status = 'done' THEN 'completed'
        WHEN t.status = 'cancelled' THEN 'cancelled'
        WHEN COUNT(CASE WHEN g.status = 'fail' THEN 1 END) > 0 THEN 'blocked'
        WHEN COUNT(CASE WHEN r.status = 'running' THEN 1 END) > 0 THEN 'running'
        WHEN COUNT(CASE WHEN r.status = 'failed' THEN 1 END) > 0 THEN 'failed'
        ELSE 'pending'
    END as derived_status
FROM tasks t
LEFT JOIN runs r ON t.id = r.task_id
LEFT JOIN gates g ON r.id = g.run_id
GROUP BY t.id, t.title, t.status, t.priority, t.policy_version, t.created_at, t.updated_at, t.completed_at, t.assigned_to, t.tags;

-- Índice único para la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_status_derived_id ON task_status_derived (id);

-- Función para actualizar la vista materializada
CREATE OR REPLACE FUNCTION refresh_task_status_derived()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY task_status_derived;
END;
$$ LANGUAGE plpgsql;

-- Triggers para mantener la vista actualizada
CREATE OR REPLACE FUNCTION trigger_refresh_task_status_derived()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar de forma asíncrona para no bloquear las operaciones
    PERFORM pg_notify('refresh_task_status_derived', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear triggers en las tablas relevantes
DROP TRIGGER IF EXISTS tr_tasks_refresh_status ON tasks;
CREATE TRIGGER tr_tasks_refresh_status
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_task_status_derived();

DROP TRIGGER IF EXISTS tr_runs_refresh_status ON runs;
CREATE TRIGGER tr_runs_refresh_status
    AFTER INSERT OR UPDATE OR DELETE ON runs
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_task_status_derived();

DROP TRIGGER IF EXISTS tr_gates_refresh_status ON gates;
CREATE TRIGGER tr_gates_refresh_status
    AFTER INSERT OR UPDATE OR DELETE ON gates
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_task_status_derived();

-- Política inicial
INSERT INTO policies (version, name, description, rules) VALUES 
('1.0.0', 'Initial Policy', 'Política inicial del TaskDB', '{
    "task_validation": {
        "required_fields": ["title", "description", "priority"],
        "max_title_length": 255,
        "allowed_priorities": ["critical", "high", "medium", "low"]
    },
    "run_validation": {
        "max_duration_ms": 3600000,
        "required_metrics": ["success_rate", "error_count"]
    },
    "gate_validation": {
        "required_types": ["lint", "policy", "security"],
        "max_checks_per_gate": 100
    }
}') ON CONFLICT (version) DO NOTHING;
