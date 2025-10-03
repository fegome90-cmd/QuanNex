# 🚀 OLA 2 - ANTIFRÁGIL - Plan de Implementación

## 📋 Resumen Ejecutivo

**Objetivo**: Implementar capacidades antifrágiles avanzadas del Plan Maestro TaskDB
**Duración**: 2-3 sprints (semanas 4-6)
**Estado**: Pendiente de inicio

## 🎯 Criterios de Aceptación OLA 2

- ✅ ≥ 1 publicación con snapshot_ts y status=pass
- ✅ ≥ 1 retractación que genere task(correction) con depends_on
- ✅ doctor --check verde 7 días consecutivos
- ✅ reports_without_provenance_total == 0 sostenido

---

## 📦 Componentes a Implementar

### A. Provenance con Snapshot Temporal

#### Contrato Extendido
```json
{
  "report_provenance": {
    "task_ids": ["uuid4"],
    "run_ids": ["uuid4"],
    "artifact_hashes": ["sha256"],
    "verification_snapshot_ts": "ISO8601",
    "claims_validated": [...],
    "verified_at": "ISO8601",
    "policy_version_used": "semver",
    "row_counts": {
      "tasks": 123,
      "runs": 456,
      "gates": 789
    }
  }
}
```

#### Implementación Verifier
- **SQLite**: Reconstruye estado de IDs citados consultando appendlog ≤ snapshot_ts
- **Salida extendida**: verified_at, policy_version_used, row_counts
- **Gate estricto**: Si falta snapshot_ts → fail automático

#### Archivos a Modificar
- `packages/taskdb-core/provenance-verifier.mjs`
- `packages/taskdb-core/taskdb-core.mjs` (validaciones)
- `tests/provenance-snapshot.test.mjs` (nuevo)

### B. Políticas Versionadas "en Caliente"

#### Estructura taskdb.yaml
```yaml
version: "1.1.0"
ola: "ola2-antifragil"
policies:
  "1.0.0":
    task_validation:
      required_fields: ["title", "description", "priority"]
      max_title_length: 255
      allowed_priorities: ["critical", "high", "medium", "low"]
    run_validation:
      max_duration_ms: 3600000
      required_metrics: ["success_rate", "error_count"]
    gate_validation:
      required_types: ["lint", "policy", "security", "quality", "truth"]
      max_checks_per_gate: 100
  "1.1.0":
    task_validation:
      required_fields: ["title", "description", "priority", "owner"]
      max_title_length: 255
      allowed_priorities: ["critical", "high", "medium", "low"]
      required_owner: true
    run_validation:
      max_duration_ms: 7200000
      required_metrics: ["success_rate", "error_count", "latency_p95"]
    gate_validation:
      required_types: ["lint", "policy", "security", "quality", "truth", "performance"]
      max_checks_per_gate: 150
      required_gates_for_completion: ["security", "quality"]
```

#### Implementación
- **Al crear task**: Estampa policy_version vigente
- **Hook task:done**: Usa la versión de la task, no la actual
- **Migración automática**: Tareas existentes mantienen su policy_version

#### Archivos a Crear/Modificar
- `config/taskdb.yaml` (nuevo)
- `packages/taskdb-core/policy-manager.mjs` (nuevo)
- `packages/taskdb-core/taskdb-core.mjs` (hooks)

### C. Archivado/Retención Operativa

#### Job Nocturno taskdb-archive
```javascript
// Archivo: packages/taskdb-core/archive-job.mjs
class TaskDBArchiver {
  async archiveOldEvents(maxAgeDays = 180) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    const oldEvents = this.taskdb.data.events.filter(
      event => new Date(event.timestamp) < cutoffDate
    );
    
    if (oldEvents.length > 0) {
      // Crear artifact de dataset archivado
      const archiveArtifact = this.taskdb.createArtifact({
        name: `archive-${Date.now()}.json`,
        type: 'dataset',
        uri: `archives/events-${Date.now()}.json`,
        hash: this.calculateHash(oldEvents),
        size_bytes: JSON.stringify(oldEvents).length,
        metadata: {
          archive_type: 'events',
          original_count: oldEvents.length,
          archived_at: new Date().toISOString()
        }
      });
      
      // Mover a storage frío
      await this.moveToColdStorage(oldEvents);
      
      // Emitir métrica
      this.emitMetric('taskdb_events_archived_total', oldEvents.length);
      
      return archiveArtifact;
    }
  }
}
```

#### Métricas y Alertas
- `taskdb_events_archived_total` (contador)
- Alerta por backlog alto (>1000 eventos pendientes de archivado)

#### Archivos a Crear
- `packages/taskdb-core/archive-job.mjs` (nuevo)
- `scripts/taskdb-archive.sh` (nuevo)
- `config/archive-policy.yaml` (nuevo)

### D. CLI de Informes

#### Comandos a Implementar
```bash
# Validar reporte
qn report:validate report.json
# → Llama al verifier con snapshot_ts
# → Salida: status, checks, errors, warnings

# Publicar reporte
qn report:publish report.json --provenance prov.json
# → Exige verificación pass
# → Rechaza si falta report_provenance
# → Crea artifact de publicación

# Retractar reporte
qn report:retract --id RPT-xxx --reason "provenance_fail"
# → Crea task tipo correction con depends_on
# → Genera event(retracted)
# → Notifica stakeholders
```

#### Archivos a Crear/Modificar
- `packages/taskdb-core/cli.mjs` (comandos report:*)
- `packages/taskdb-core/report-manager.mjs` (nuevo)
- `tests/cli-reports.test.mjs` (nuevo)

### E. TaskDB Doctor (Modo Fix Endurecido)

#### Mejoras en Doctor
- **--check obligatorio en CI**: Bloquea merges si falla
- **--fix endurecido**: Solo permite operaciones seguras
  - Archivar huérfanos con event(orphan_archived)
  - Normalizar policy_version nula a la vigente
  - **NO toca** score inválido (fail-fast con reporte)

#### Archivos a Modificar
- `packages/taskdb-core/taskdb-doctor.mjs`
- `.github/workflows/ci.yml` (integración)

---

## 📊 Métricas y Observabilidad

### Métricas Prometheus
```
taskdb_provenance_verifications_total{status="pass|fail"}
taskdb_doctor_checks_total{status="pass|fail"}
taskdb_events_archived_total
taskdb_reports_without_provenance_total
```

### Alertas Críticas
- **fail rate provenance > 5%** (24h)
- **doctor fail > 0** (24h)
- **reports_without_provenance_total > 0** (hard alert)
- **done_without_gates > 0** (query de control)

---

## 🧪 Plan de Pruebas

### Pruebas Unitarias
- [ ] Provenance Verifier con snapshot_ts
- [ ] Políticas versionadas "en caliente"
- [ ] Job de archivado
- [ ] CLI de informes
- [ ] TaskDB Doctor endurecido

### Pruebas de Integración
- [ ] Publicación con snapshot_ts → status=pass
- [ ] Retractación → task(correction) automática
- [ ] Archivado nocturno automático
- [ ] CI/CD con doctor --check obligatorio

### Pruebas de Regresión
- [ ] Tareas existentes mantienen policy_version
- [ ] Verificaciones sin snapshot_ts siguen funcionando
- [ ] Sistema funciona con políticas mixtas (1.0.0 y 1.1.0)

---

## 📅 Cronograma de Implementación

### Sprint 1 (Semanas 4-5)
- **Semana 4**: Provenance con snapshot_ts + Políticas versionadas
- **Semana 5**: Archivado operativo + CLI básico

### Sprint 2 (Semanas 5-6)
- **Semana 5**: CLI completo + TaskDB Doctor endurecido
- **Semana 6**: Integración CI/CD + Pruebas + Documentación

### Sprint 3 (Semana 6)
- **Semana 6**: Validación final + Criterios de aceptación

---

## 🔧 Archivos de Configuración

### .github/workflows/ci.yml (Extensión)
```yaml
- name: TaskDB Doctor Check
  run: |
    cd packages/taskdb-core
    npm run doctor -- --check --strict
    if [ $? -ne 0 ]; then
      echo "TaskDB Doctor check failed"
      exit 1
    fi

- name: TaskDB Archive (Nightly)
  if: github.event_name == 'schedule'
  run: |
    cd packages/taskdb-core
    npm run archive
```

### config/taskdb.yaml
```yaml
version: "1.1.0"
ola: "ola2-antifragil"
archive_policy:
  events_retention_days: 180
  artifacts_retention_days: 365
  cold_storage_bucket: "taskdb-archives"
alerts:
  reports_without_provenance_total:
    threshold: 0
    operator: "eq"
    severity: "critical"
  doctor_check_fail:
    threshold: 0
    operator: "eq"
    severity: "critical"
```

---

## 🎯 Entregables Finales

### Artefactos Técnicos
- [ ] Provenance Verifier con snapshot_ts operativo
- [ ] Sistema de políticas versionadas "en caliente"
- [ ] Job de archivado automático nocturno
- [ ] CLI completo de informes (validate, publish, retract)
- [ ] TaskDB Doctor endurecido con CI integrado

### Documentación
- [ ] Manual de usuario CLI reports
- [ ] Guía de políticas versionadas
- [ ] Runbook de archivado y retención
- [ ] Documentación de métricas y alertas

### Validación
- [ ] ≥ 1 publicación con snapshot_ts y status=pass
- [ ] ≥ 1 retractación que genere task(correction)
- [ ] doctor --check verde 7 días consecutivos
- [ ] reports_without_provenance_total == 0 sostenido

---

**Estado**: 🔄 Pendiente de inicio  
**Siguiente paso**: Iniciar Sprint 1 - Implementación de Provenance con snapshot_ts
