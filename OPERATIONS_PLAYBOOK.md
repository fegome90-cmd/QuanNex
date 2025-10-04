# OPERATIONS_PLAYBOOK.md

## 0) Alcance

Operación segura del **Pipeline RAG** en QuanNex/TaskDB: despliegue, monitoreo, rollback (código+datos), gobernanza de conocimiento y respuesta a incidentes.

## 1) Roles y Responsabilidades

- **On-Call (OC):** Ing. de guardia con pager. Ejecuta runbook, decide rollback automático según criterios numéricos.
- **Release Manager (RM):** Autoriza canary, coordina comunicación, aprueba "resume" post-rollback.
- **SRE de Apoyo (SRE):** Asiste en restauración de snapshots y verificación post-rollback.
- **Owner de Conocimiento (DOC-OWN):** Mantiene fuentes críticas (`owner`, `review_date`, `ttl_days`), responde a cuarentenas.

> **Horario de guardia:** rotación semanal, calendario compartido `ops/oncall.md`.

## 2) Ambientes

- **staging/QA:** pruebas end-to-end, datos sintéticos/anonimizados.
- **canary:** 10–25–50–100% tráfico real con _feature flag_.
- **prod:** 100% tráfico; cambios solo tras canary estable.

## 3) Tipos de Cambio

- **C0 (config):** flags, k, umbrales (reversible inmediato).
- **C1 (modelo/embedding):** cambio de `model_id`/`embedding_dim` (requiere snapshot).
- **C2 (esquema/ingesta):** migraciones SQL, cambios de colección (snapshot + down.sql).
- **C3 (infra):** DB/Vector store upgrades (ventana de mantenimiento + backout plan).

## 4) Checklist Pre-Despliegue (staging)

- [ ] `make up && make smoke`
- [ ] **RAGAS**: `faithfulness ≥ 0.85`, `answer_relevancy ≥ 0.78`, `context_recall ≥ 0.70`
- [ ] **Perf**: `p95 ≤ 2500ms`, `p99 ≤ 4000ms` (con desglose **interno vs proveedor**)
- [ ] **Gobernanza**: `make governance.check` (0 docs críticos vencidos) → si >0, **FAIL**
- [ ] **Snapshots listos**: `make snapshot.create` (Postgres + Qdrant)
- [ ] **Migraciones reversibles** (`up.sql`/`down.sql`) validadas en staging

## 5) Promoción a Canary (con automatismos)

1. **Habilitar canary 10%**: `make traffic:10`
2. **Auto-monitoreo 15 min** con reglas:
   - `gate.fail_rate > 7%` sostenido **3 min** → `make rollback.auto`
   - `faithfulness_rolling_mean < 0.75` en **50 queries** → `make rollback.auto`
   - `p95_end_to_end > 3× baseline 5 min` → `make rollback.auto`
   - `topk_score_mean_drop > 25%` vs baseline **10 min** → `make rollback.auto`

3. Si estable → **25% → 50% → 100%** (repetir reglas).

> **Nota**: Métricas separadas por **latencia interna** (retriever/reranker/DB) vs **proveedor** (LLM/Embeddings). La causa raíz determina a quién "culpar" y la acción.

## 6) Reglas de Rollback (automatizadas)

- **Disparos automáticos** (sin aprobación humana):
  - `gate.fail_rate > 7%` (3 min)
  - `faithfulness_rolling_mean < 0.75` (50 queries)
  - `p95 > 3× baseline` (5 min)
  - Spike de **HTTP 5xx** > 2% (5 min)

- **Acción**: `make traffic:0 && make rollback.auto`
- **RM** notifica por Slack #ops-alerts (plantilla en `ops/templates/incident.md`).

## 7) Rollback **de Datos + Código**

- **Siempre snapshot BEFORE** C1/C2:
  - **Postgres**: `pg_dump -Fc` de `rag_*` (incl. `rag_chunks`)
  - **Qdrant**: snapshots de colección (o filesystem snapshot)

- **Rollback**:
  1. `make traffic:0`
  2. Restaurar **Qdrant** colección (snapshot), luego **Postgres** (pg_restore)
  3. `make revert:last-green` (artefactos y config)
  4. `make smoke && make eval.quick`

- **Verificación post-rollback**:
  - Conteos de docs/chunks por `model_id`
  - Prueba de similitud top-k (umbral ≥ baseline − 5%)
  - RAGAS quick (20 queries)

## 8) Gobernanza Ejecutable (no "sugerida")

- **Gate CI/CD**: PR **falla** si:
  - Hay **docs críticos** con `review_date < now()`
  - `owner` ausente en documento crítico

- **Cuarentena automática**:
  - Fuentes vencidas **no se sirven** aunque existan en `rag_chunks`
  - Métrica: `rag_docs_expired_total`, alerta si `>0`

- **PRP.lock** **obligatorio**:
  - `tools`, `policies`, `chunks_pinned` (`id/hash/model_id`)
  - Gate `context-validate` compara hash/exists antes de ejecutar PRP

## 9) Validación Continua vs Corpus Real (Reality Check)

- **Muestreo diario**: 1% de documentos nuevos/actualizados → RAGAS programado
- **Reporte drift** (Prometheus/Grafana): histograma `taskdb_rag_retrieval_score_distribution` y variación de `topk_score_mean`
- **Alertas diferenciales** por caída de calidad o cambio de distribución

## 10) Severidad y Escalamiento

- **SEV-1:** indisponibilidad o alucinación con impacto legal/seguridad → rollback auto + RM + SRE + DOC-OWN, RCA < 24 h
- **SEV-2:** latencia alta o caída parcial → throttling + posible rollback
- **SEV-3:** degradación leve → seguimiento, no es necesaria acción inmediata

## 11) Comunicación

- **Canales**: `#ops-alerts`, `#quannex-deploys`
- **Plantillas**: `ops/templates/deploy.md`, `ops/templates/incident.md`, `ops/templates/postmortem.md`
- **Registro**: TaskDB (eventos `deploy_start`, `deploy_phase`, `rollback`, `drift_alert`)

---

# Anexo: Métricas Base y Origen de Umbrales

- **Calidad (RAGAS):**
  - `faithfulness ≥ 0.85`: riesgo de alucinación baja en tu dominio (baseline staging).
  - `answer_relevancy ≥ 0.78`: minimiza respuestas divagadas.
  - `context_recall ≥ 0.70`: equilibrio costo/beneficio para top-k moderado.

- **Latencia:**
  - `p95 ≤ 2500ms / p99 ≤ 4000ms`: interacción humana aceptable (UI conversacional).
  - **Separación**: `*_internal` (DB, retriever, reranker) vs `*_provider` (LLM/embeddings) para atribución correcta.

- **Operación:**
  - `gate.fail_rate > 7% (3m)` → rollback: umbral suficientemente sensible para detectar regresiones reales sin "flapping".

> Estos umbrales **se recalibran** tras 7–14 días de operación canary estable (se guardan como baseline en Prometheus).

---

## Cómo usar esto ahora mismo (mini-guía)

1. **Copia** estos archivos:
   - `OPERATIONS_PLAYBOOK.md`
   - `ops/runbooks/RAG_ROLLBACK.md`
   - `ops/gates/governance_check.mjs`
   - `scripts/gates/context-validate.mjs`
   - `ops/alerts/rag.rules.yml`
   - `dashboards/grafana/rag-overview.json`
   - `Makefile` (targets añadidos)

2. **Activa gates en CI/CD**:
   - `governance.check` y `context.validate` como **required checks**.

3. **Ensaya** rollback en **staging** con snapshots reales.
4. **Luego** pide tu "GO/NO-GO" con evidencia (capturas de dashboard y logs de TaskDB).
