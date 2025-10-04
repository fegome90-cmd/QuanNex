# 📐 Patrón de Servicios Observables QuanNex

**Objetivo:** Garantizar que cada nuevo servicio o componente se integre al ecosistema de gates con visibilidad, métricas y controles compatibles.

---

## 1. Requisitos de Logging
- Los servicios deben emitir logs estructurados en JSON con campos mínimos: `timestamp`, `service`, `env`, `severity`, `requestId`, `operation`, `durationMs`.
- Los hooks y pipelines deben poder correlacionar eventos mediante `requestId`; si no existe, generar uno (UUID v4).
- Prohibido registrar datos sensibles; seguir política `docs/policies/data-handling.md`.

## 2. Métricas y Endpoints
- Exponer endpoint `/healthz` con chequeos rápidos (liveness) y `/readyz` con dependencias críticas (readiness).
- Proveer endpoint `/metrics` (format Prometheus) con al menos:
  - `service_request_total{status=...}`
  - `service_request_duration_seconds_bucket`
  - `service_error_total`
- Registrar la URL en el inventario de gates (`TaskDB.gate_services`).

## 3. Integración con Gates
- Cada servicio nuevo debe tener entry en `gate_events` con campos: `service`, `owner`, `deployment_path`, `gating_strategy`.
- Configurar reglas en `workflow-enforcement.mjs` para validar:
  - Que el servicio declare el presupuesto de errores (warnings aceptables por sprint).
  - Que exista el documento de ownership (`docs/policies/ownership.md`).

## 4. Criterios de Revisión de Diseño
- Las revisiones técnicas deben incluir un checklist “Observable Services”. Ningún ADR nuevo se aprueba sin demostrar:
  1. Plan de logging estructurado.
  2. Métricas clave definidas y plan de scraping.
  3. Estrategia de alertas (umbral, canal).
  4. Vinculación con Gate Steward o owner equivalente.

## 5. Ciclo de Vida
- El equipo owner es responsable de:
  - Mantener dependencias de observabilidad actualizadas.
  - Revisar métricas de drift al menos una vez por sprint.
  - Registrar retroalimentación en el Comité de Gates cuando se requiera ajuste.
- Servicios que no cumplan el patrón no podrán promocionarse a `staging`/`prod`.

---

**Nota:** Este patrón complementa `PLAN-REACTIVACION-ROADMAP.md` y debe revisarse anualmente para incorporar nuevas mejores prácticas.
