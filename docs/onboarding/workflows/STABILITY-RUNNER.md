# Workflow — Stability Runner (Archon)

## Propósito
- Validar el kit en entornos aislados y reproducibles, sin romper políticas de seguridad/estabilidad.

## Opciones de Ejecución
- Contenedor (recomendado):
  - `docker compose -f archon/compose.yml build`
  - `docker compose -f archon/compose.yml run --rm tester bash archon/edge-matrix.sh`
- Runner local (Archon OS / host):
  - `bash archon/archon-run.sh edge`

## Suites Incluidas
- Lint: `./scripts/lint-shell.sh`
- Integración: `./scripts/test-claude-init.sh`
- Flags: `./scripts/test-flags.sh`
- Unit: `./scripts/test-unit.sh`
- Edge matrix: `archon/edge-matrix.sh`

## Reportes
- `reports/validation.json` (básico, ampliable)
- Logs: `logs/init-*.log` (por ejecución)

## Políticas
- Sin sudo/auto-instalaciones; templates OFF por defecto.
- MCP “disable‑when‑unavailable” (no bloqueante); hooks sin fix.
- Fail‑fast preflight (permisos/espacio); transaccionalidad staging + mv.

## Resultados y Gates
- Mapear resultados de suites a gates A–E (ver `docs/STABILITY-POLICY.md`).
- Parar la línea si cualquier gate falla; proponer plan + tests.

