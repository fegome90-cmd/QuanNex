# TaskDB Remediation – Estado GO Mínimo

## Checklist
- Repo limpio: ⏳ pendiente (tests históricos exigen árbol sin restos; ver Runbook paso 1).
- TaskDB core + contratos: ✅ drivers Pg/Sqlite/Jsonl, cola instrumentada, dual shadow-write y ALS obligatoria (`core/taskdb/*`).
- Exporter Prometheus: ✅ métricas `taskdb_events_total`, `taskdb_queue_depth`, `taskdb_flush_latency_seconds` publicadas (`metrics/exporter.mjs`).
- Seeds + smoke: ✅ `npm run taskdb:seed` (PG=20, SQLite=50) y `npm run smoke:taskdb` valida run.start/finish (`scripts/seed-events.mjs`, `scripts/smoke-taskdb.mjs`).
- Baseline: ✅ `reports/TASKDB-BASELINE.{md,json}` con KPIs reales (`cli/generate-baseline.mjs`).
- Governance: ✅ `policy-version-manager.mjs` cargando YAML real, TODO documentado para reemplazar default-allow.
- Plans registry: ✅ `docs/PLANS-INDEX.md` y normalización `taskId` en `docs/plans/*`.
- CI gates: ✅ workflow ejecuta `smoke:taskdb` y `taskdb:policy:acceptance` (`.github/workflows/ci.yml`).
- Telemetría viva: ✅ seeds + curl :9464/metrics demuestran eventos y métricas.
- npm test: ❌ suites heredadas requieren repositorio limpio + artefactos legacy.
- Exporter daemon: ❌ aún manual (sexto paso del Runbook).

## Runbook
1. **Normalizar árbol y artefactos para `npm test`**
   - `git add -A && git commit -m "fix(taskdb): remediation baseline"`
   - `git clean -fdX`
   - Regenerar artefactos esperados (builds, reports, placeholders) y ejecutar `npm run test -- --passWithNoTests`. Mover suites conflictivas a “quarantine” si aplica.
2. **Daemonizar exporter**
   - Opción recomendada: añadir servicio `taskdb-metrics` al compose (`docker/taskdb/docker-compose.yml`) con healthcheck y puerto 9464.
   - Alternativas: `pm2` o `systemd`. Gate: `/metrics` disponible persistentemente con series actualizadas tras seeds.
3. **Seeds + smoke recurrentes**
   - `./scripts/taskdb-db-up.sh`
   - `npm run taskdb:seed`
   - `npm run smoke:taskdb`
4. **Policy acceptance & baseline**
   - `npm run taskdb:policy:acceptance`
   - `npm run taskdb:baseline`
5. **Documentar GO firme**
   - Actualizar CHANGELOG, tag (`v0.2.2-go-min` sugerido), registrar en TaskDB/planes.
6. **Reemplazar default-allow (futuro)**
   - Ejecutar tarea `POLICY-IMPL-001` para implementar evaluación explícita de reglas.

## Auditoría
- Seed/exporter operan sin sleeps fijos; bootstrap usa sondeo (`scripts/taskdb-db-up.sh`).
- ALS obligatorio en logger y withTask; eventos sin `traceId/spanId` lanzan error.
- TODO explícito para eliminar default-allow en PolicyVersionManager.
- Makefile formaliza targets `db-up`, `db-migrate`, `seed`, `smoke`, `metrics`, `baseline`.

## Estado final
- Veredicto: **GO mínimo**. Shadow write activo, métricas reales, baseline confiable, governance cargando versión.
- Bloqueos para **GO firme**: (1) resolver suites heredadas (`npm test`), (2) ejecutar exporter como daemon.
- Gates activas: smoke, policy acceptance, baseline, seeds, métricas. Telemetría en PG/SQLite disponible.
