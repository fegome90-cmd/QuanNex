# 🚀 OLA 3 - ESCALAMIENTO - Plan de Implementación

## 📋 Resumen Ejecutivo

**Objetivo**: Escalar TaskDB a nivel enterprise con Postgres, observabilidad avanzada y pruebas de carga
**Duración**: 2-3 sprints (semanas 7-9)
**Estado**: Pendiente de inicio

## 🎯 Criterios de Aceptación OLA 3

- ✅ P95 lecturas status_derived < 5 ms (Postgres)
- ✅ P95 verificación de proveniencia < 150 ms para N=10 claims/IDs
- ✅ Sin pérdidas tras caos (comparación hash export antes/después)

---

## 📦 Componentes a Implementar

### A. Postgres + MV/Triggers para status_derived

#### Migración a Postgres
```sql
-- Schema Postgres optimizado
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    policy_version VARCHAR(20) NOT NULL,
    feature VARCHAR(100),
    owner VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    dependencies JSONB,
    metadata JSONB,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'retracted')),
    CONSTRAINT valid_priority CHECK (priority IN ('critical', 'high', 'medium', 'low'))
);

-- Materialized View para status_derived
CREATE MATERIALIZED VIEW task_status_derived_mv AS
SELECT 
    t.id as task_id,
    t.status as stored_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM runs r WHERE r.task_id = t.id AND r.status = 'failed') THEN 'failed'
        WHEN NOT EXISTS(SELECT 1 FROM runs r WHERE r.task_id = t.id) THEN 'pending'
        WHEN EXISTS(SELECT 1 FROM runs r WHERE r.task_id = t.id AND r.status = 'running') THEN 'in_progress'
        WHEN EXISTS(SELECT 1 FROM runs r WHERE r.task_id = t.id AND r.status = 'completed') 
             AND NOT EXISTS(SELECT 1 FROM gates g JOIN runs r ON g.run_id = r.id WHERE r.task_id = t.id AND g.status = 'fail') THEN 'completed'
        ELSE 'blocked'
    END as status_derived,
    COALESCE(
        (SELECT COUNT(*) FROM runs r WHERE r.task_id = t.id AND r.status = 'completed')::FLOAT /
        NULLIF((SELECT COUNT(*) FROM runs r WHERE r.task_id = t.id), 0),
        0
    ) as health_score,
    NOW() as calculated_at
FROM tasks t;

-- Triggers para refresh automático
CREATE OR REPLACE FUNCTION refresh_task_status_derived()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh solo la fila afectada (concurrent refresh)
    REFRESH MATERIALIZED VIEW CONCURRENTLY task_status_derived_mv;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_status_after_run_change
    AFTER INSERT OR UPDATE OR DELETE ON runs
    FOR EACH ROW EXECUTE FUNCTION refresh_task_status_derived();

CREATE TRIGGER trigger_refresh_status_after_gate_change
    AFTER INSERT OR UPDATE OR DELETE ON gates
    FOR EACH ROW EXECUTE FUNCTION refresh_task_status_derived();
```

#### Implementación de Migración
- **Pinout idéntico**: API TaskDB mantiene compatibilidad total
- **Migración gradual**: SQLite → Postgres con validación
- **Rollback seguro**: Capacidad de revertir a SQLite

#### Archivos a Crear/Modificar
- `packages/taskdb-core/schema-postgres.sql` (nuevo)
- `packages/taskdb-core/migration-sqlite-to-postgres.mjs` (nuevo)
- `packages/taskdb-core/taskdb-core.mjs` (backend Postgres)
- `packages/taskdb-core/postgres-backend.mjs` (nuevo)

### B. Depurador de Procedencia (DX)

#### CLI Debug Avanzado
```bash
# Depurador de procedencia con modo verbose
qn report:debug-provenance prov.json --verbose

# Salida detallada:
[PASS] task_id: a1b2c3d4... - Task exists and status matches
[FAIL] task_id: e5f6g7h8... - Expected status 'completed', got 'failed'
        Expected: completed (from snapshot 2025-01-03T10:00:00Z)
        Actual:   failed (current)
        Mismatch: Status changed after snapshot
[PASS] artifact_hash: sha256:abc123... - File exists and hash matches
[FAIL] run_id: i9j0k1l2... - Run not found in database
        Expected: Run exists (from snapshot)
        Actual:   Not found
        Mismatch: Run deleted after snapshot
```

#### Implementación
```javascript
// Archivo: packages/taskdb-core/provenance-debugger.mjs
class ProvenanceDebugger {
  async debugProvenance(provenanceFile, options = {}) {
    const provenance = JSON.parse(readFileSync(provenanceFile, 'utf8'));
    const snapshot = provenance.verification_snapshot_ts;
    
    console.log(`🔍 Debugging provenance for snapshot: ${snapshot}`);
    
    for (const claim of provenance.claims_validated) {
      const result = await this.debugClaim(claim, snapshot, options);
      console.log(`[${result.status}] ${claim.claim}`);
      
      if (options.verbose && result.details) {
        console.log(`        Expected: ${result.details.expected}`);
        console.log(`        Actual:   ${result.details.actual}`);
        console.log(`        Mismatch: ${result.details.mismatch}`);
      }
    }
  }
  
  async debugClaim(claim, snapshot, options) {
    // Lógica de debug por tipo de claim
    // Compara estado actual vs snapshot
    // Identifica diferencias específicas
  }
}
```

#### Archivos a Crear
- `packages/taskdb-core/provenance-debugger.mjs` (nuevo)
- `packages/taskdb-core/cli.mjs` (comando debug-provenance)
- `tests/provenance-debugger.test.mjs` (nuevo)

### C. Observabilidad de Escala

#### Métricas Prometheus Avanzadas
```yaml
# Métricas de performance
taskdb_status_derived_read_latency_ms_bucket{le="1"} 1000
taskdb_status_derived_read_latency_ms_bucket{le="5"} 950
taskdb_status_derived_read_latency_ms_bucket{le="10"} 900
taskdb_status_derived_read_latency_ms_bucket{le="50"} 800

# Métricas de verificación
taskdb_provenance_verifications_total{status="pass"} 150
taskdb_provenance_verifications_total{status="fail"} 5
taskdb_provenance_verification_latency_ms_bucket{le="50"} 100
taskdb_provenance_verification_latency_ms_bucket{le="100"} 120
taskdb_provenance_verification_latency_ms_bucket{le="150"} 130

# Métricas de concurrencia
taskdb_concurrent_writers_total 25
taskdb_mv_refresh_latency_ms_bucket{le="100"} 50
taskdb_mv_refresh_latency_ms_bucket{le="500"} 80

# Métricas de salud
taskdb_doctor_checks_total{status="pass"} 30
taskdb_doctor_checks_total{status="fail"} 0
taskdb_orphans_detected_total 0
taskdb_events_archived_total 15000
```

#### Alertas Avanzadas
```yaml
# Alertas de performance
- alert: TaskDBStatusDerivedLatencyHigh
  expr: histogram_quantile(0.95, taskdb_status_derived_read_latency_ms_bucket) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "TaskDB status_derived read latency P95 > 5ms"

- alert: TaskDBProvenanceLatencyHigh
  expr: histogram_quantile(0.95, taskdb_provenance_verification_latency_ms_bucket) > 150
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "TaskDB provenance verification latency P95 > 150ms"

# Alertas de concurrencia
- alert: TaskDBConcurrentWritersHigh
  expr: taskdb_concurrent_writers_total > 100
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "TaskDB concurrent writers > 100"

- alert: TaskDBMVRefreshLatencyHigh
  expr: histogram_quantile(0.95, taskdb_mv_refresh_latency_ms_bucket) > 500
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "TaskDB materialized view refresh latency P95 > 500ms"
```

#### Archivos a Crear
- `packages/taskdb-core/metrics-collector.mjs` (nuevo)
- `config/prometheus-alerts-ola3.yml` (nuevo)
- `config/grafana-dashboard-ola3.json` (nuevo)

### D. Ensayos de Carga y Caos

#### Dataset Sintético
```javascript
// Archivo: packages/taskdb-core/load-generator.mjs
class TaskDBLoadGenerator {
  async generateSyntheticDataset() {
    const dataset = {
      tasks: 100000,
      runs: 1000000,
      gates: 3000000,
      artifacts: 500000,
      events: 10000000
    };
    
    console.log('🚀 Generando dataset sintético...');
    
    // Generar tasks
    for (let i = 0; i < dataset.tasks; i++) {
      await this.taskdb.createTask({
        title: `Synthetic Task ${i}`,
        description: `Generated task for load testing`,
        priority: ['critical', 'high', 'medium', 'low'][i % 4],
        policy_version: '1.1.0'
      });
    }
    
    // Generar runs (10 por task)
    for (let i = 0; i < dataset.runs; i++) {
      const taskId = this.getRandomTaskId();
      await this.taskdb.createRun({
        task_id: taskId,
        tool_calls: this.generateRandomToolCalls(),
        metrics: this.generateRandomMetrics()
      });
    }
    
    // Generar gates (3 por run)
    for (let i = 0; i < dataset.gates; i++) {
      const runId = this.getRandomRunId();
      await this.taskdb.createGate({
        name: `Synthetic Gate ${i}`,
        type: ['lint', 'policy', 'security', 'quality', 'truth'][i % 5],
        run_id: runId,
        checks: this.generateRandomChecks()
      });
    }
    
    console.log('✅ Dataset sintético generado');
    return dataset;
  }
}
```

#### Pruebas de Concurrencia
```javascript
// Archivo: tests/load-concurrency.test.mjs
describe('TaskDB Concurrencia', () => {
  test('Concurrencia de escrituras (N=100 writers)', async () => {
    const writers = 100;
    const operations = 1000;
    
    const promises = Array.from({ length: writers }, (_, i) => 
      this.runWriter(`writer-${i}`, operations)
    );
    
    const results = await Promise.all(promises);
    
    // Verificar que no hay pérdidas
    const finalStats = this.taskdb.getSystemStats();
    expect(finalStats.total_tasks).toBe(writers * operations);
  });
  
  test('Validación de publicación concurrente', async () => {
    const reports = 50;
    const promises = Array.from({ length: reports }, (_, i) =>
      this.publishReport(`report-${i}`)
    );
    
    const results = await Promise.all(promises);
    
    // Verificar que todas las publicaciones tienen snapshot_ts único
    const timestamps = results.map(r => r.verification_snapshot_ts);
    const uniqueTimestamps = new Set(timestamps);
    expect(uniqueTimestamps.size).toBe(timestamps.length);
  });
});
```

#### Pruebas de Caos
```javascript
// Archivo: tests/chaos-recovery.test.mjs
describe('TaskDB Recuperación de Caos', () => {
  test('Recuperación sin pérdida tras caída', async () => {
    // 1. Generar estado inicial
    const initialState = await this.generateInitialState();
    const initialStateHash = this.calculateSystemHash();
    
    // 2. Simular caída durante operaciones concurrentes
    await this.simulateCrash();
    
    // 3. Recuperar desde append-only log
    await this.recoverFromCrash();
    
    // 4. Verificar integridad
    const recoveredStateHash = this.calculateSystemHash();
    expect(recoveredStateHash).toBe(initialStateHash);
    
    // 5. Verificar que no hay pérdidas
    const doctorReport = await this.taskdb.doctor.runDiagnostics();
    expect(doctorReport.summary.system_health).toBe('excellent');
  });
});
```

#### Archivos a Crear
- `packages/taskdb-core/load-generator.mjs` (nuevo)
- `tests/load-concurrency.test.mjs` (nuevo)
- `tests/chaos-recovery.test.mjs` (nuevo)
- `scripts/run-load-tests.sh` (nuevo)

---

## 📊 Métricas y Observabilidad

### Dashboard Grafana
```json
{
  "dashboard": {
    "title": "TaskDB OLA3 - Escalamiento",
    "panels": [
      {
        "title": "Status Derived Read Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, taskdb_status_derived_read_latency_ms_bucket)"
          }
        ]
      },
      {
        "title": "Provenance Verification Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, taskdb_provenance_verification_latency_ms_bucket)"
          }
        ]
      },
      {
        "title": "Concurrent Writers",
        "type": "singlestat",
        "targets": [
          {
            "expr": "taskdb_concurrent_writers_total"
          }
        ]
      }
    ]
  }
}
```

### Alertas Críticas
- **P95 status_derived > 5ms** (sostenido 5min)
- **P95 provenance verification > 150ms** (sostenido 5min)
- **Concurrent writers > 100** (crítico)
- **MV refresh P95 > 500ms** (sostenido 10min)

---

## 🧪 Plan de Pruebas

### Pruebas de Performance
- [ ] P95 lecturas status_derived < 5ms
- [ ] P95 verificación proveniencia < 150ms
- [ ] Concurrencia 100 writers simultáneos
- [ ] Dataset 100k tasks / 1M runs / 3M gates

### Pruebas de Resiliencia
- [ ] Recuperación sin pérdida tras caída
- [ ] Validación de publicación concurrente
- [ ] Integridad con snapshot_ts en race conditions

### Pruebas de Regresión
- [ ] API TaskDB mantiene compatibilidad total
- [ ] Migración SQLite → Postgres reversible
- [ ] Métricas consistentes pre/post migración

---

## 📅 Cronograma de Implementación

### Sprint 1 (Semanas 7-8)
- **Semana 7**: Migración Postgres + Materialized Views
- **Semana 8**: Triggers + Optimizaciones de performance

### Sprint 2 (Semanas 8-9)
- **Semana 8**: Depurador de procedencia + Observabilidad
- **Semana 9**: Pruebas de carga + Pruebas de caos

### Sprint 3 (Semana 9)
- **Semana 9**: Validación final + Criterios de aceptación

---

## 🔧 Configuración de Infraestructura

### Docker Compose para Postgres
```yaml
# docker-compose.ola3.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: taskdb
      POSTGRES_USER: taskdb
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/taskdb-core/schema-postgres.sql:/docker-entrypoint-initdb.d/01-schema.sql
    command: >
      postgres
      -c shared_preload_libraries=pg_stat_statements
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus-ola3.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana-dashboard-ola3.json:/etc/grafana/provisioning/dashboards/dashboard.json

volumes:
  postgres_data:
  grafana_data:
```

### Variables de Entorno
```bash
# .env.ola3
TASKDB_BACKEND=postgres
TASKDB_POSTGRES_URL=postgresql://taskdb:${POSTGRES_PASSWORD}@localhost:5432/taskdb
TASKDB_ENABLE_METRICS=true
TASKDB_METRICS_PORT=9091
TASKDB_ENABLE_PROFILING=true
```

---

## 🎯 Entregables Finales

### Infraestructura
- [ ] Postgres con Materialized Views operativo
- [ ] Triggers automáticos para refresh concurrente
- [ ] Prometheus + Grafana con dashboards
- [ ] Sistema de alertas avanzado

### Herramientas de Desarrollo
- [ ] Depurador de procedencia con modo verbose
- [ ] Generador de datasets sintéticos
- [ ] Suite de pruebas de carga y caos
- [ ] Scripts de migración y rollback

### Validación
- [ ] P95 lecturas status_derived < 5ms
- [ ] P95 verificación proveniencia < 150ms
- [ ] Sin pérdidas tras caos (hash antes/después)
- [ ] Concurrencia 100 writers sin bloqueos

---

**Estado**: 🔄 Pendiente de inicio  
**Siguiente paso**: Iniciar Sprint 1 - Migración a Postgres con Materialized Views
