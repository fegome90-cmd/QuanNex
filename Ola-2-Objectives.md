# Ola 2 — Objetivos y Gates

## 1. Guardrails de Entrada/Salida

- [ ] InputGuardrails (budget, length, schema opcional)
- [ ] OutputGuardrails (JSON schema + length + tipo)
- **Gates:** cobertura core ≥85%, fallos bien tipificados, tiempo integración <2s.

## 2. Router de Modelos (cost/lat/razonamiento)

- [ ] Tabla de ruteo por task.kind + constraints (costo, max_tokens)
- [ ] Métrica: % desvío vs "mejor ruta" teórica <10%
- **Gates:** A/B interno ≥95% compatibilidad, <10% degradación.

## 3. Memoria RAG (corto/largo plazo)

- [ ] TTL + compresión + metadatos {ts, sourceAgent, topicTags}
- [ ] Hook en orchestrator (retrieve → compact → inject)
- **Gates:** varianza de respuestas <5% con/ sin memoria; lat <500ms.

## 4. Performance/Telemetría

- [ ] Batch/Cache en tools "calientes"
- [ ] KPIs: Orchestrator Share ≥95%, Bypass ≤5%, Misfire ≤3%
- **Gates:** Alertas si se rompen umbrales; smoke ≥95%.
