# Proyecto: Claude Project Init Kit — Charter

## Objetivos
- Estandarizar la creación de proyectos con Claude Code (determinismo, seguridad, DX).
- Proveer plantillas por tipo (frontend/backend/fullstack/medical/design) con calidad mínima operativa.
- Automatizar gates de calidad: lint, tests, escaneo de secretos y healthcheck.

## KPI
- ≥ 95% PRs con CI verde a la primera.
- Tiempo init→healthcheck OK: < 30 s por tipo base.
- 0 secretos detectados en CI por release.

## Entregables
- `claude-project-init.sh` con flags deterministas, logging e idempotencia.
- Plantillas `.claude/` por tipo con comandos/agentes y `healthcheck.sh`.
- CI con lint, tests de init/flags y escaneo de secretos.
- Documentación operativa (README, AGENTS, SECURITY, ADRs, research index).

## Milestones
- M1 Fundamentos (Gate A): Charter, roles, inventario research.
- M2 Investigación (Gate B): Index curado + trazabilidad simple.
- M3 Arquitectura (Gate C): ADR-0001, SECURITY, plan de CI.
- M4 Calidad (Gate D/E): tests+lint+healthcheck verdes por tipo.

## Roles y Responsabilidades
- PM: Alineación de objetivos/KPIs, priorización y gates (A–F).
- Tech Lead: Arquitectura del kit, seguridad (min privileges), CI y entrega técnica.

