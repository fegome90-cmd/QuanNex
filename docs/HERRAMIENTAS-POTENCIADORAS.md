# Herramientas Potenciadoras — Plan de Aplicación Inmediata

## Objetivo
- Acelerar calidad y estabilidad sin introducir riesgos. Foco: validar antes, fallar explícito, medir siempre.

## Conjunto de Herramientas
- jq/yq: Validar JSON/YAML (templates, manifest, mcp.state). Fallback seguro si no están.
- ripgrep (rg): Búsqueda rápida (placeholders, patrones). Sustituye grep recursivo.
- shellcheck/shfmt: Lint + formato determinista de Bash en CI.
- bats-core: Tests unitarios Bash (parser/validadores/render/edge).
- pre-commit (opt‑in): Lint + secretos + EOL/UTF‑8 localmente.
- .editorconfig/.gitattributes: UTF‑8 + LF normalizados (evita CRLF/encoding corrupto).
- Dependabot: Actualiza github-actions semanal; evita drift de CI.
- gh CLI (con red): Pin de acciones por SHA (scripts/pin-actions.sh).

## Integración en CI (mínimos)
- Required checks: `lint-shell`, `test-claude-init`, `test-flags`, `test-unit`, `scan-secrets`.
- Job edge (propuesto): matriz tipos × templates(on/off) × npm(sí/no) × rutas con espacios.
- Artifacts: `reports/validation.json` e `init-report.json` (diagnóstico).

## Uso Rápido
- Lint: `./scripts/lint-shell.sh`
- Unit: `./scripts/test-unit.sh`
- Integración: `./scripts/test-claude-init.sh && ./scripts/test-flags.sh`
- Secretos: `./scripts/scan-secrets.sh`
- Pin de acciones (con red): `bash scripts/pin-actions.sh`

## Métricas y Gates
- KPI: init→healthcheck OK ≥95%, 0 secretos, tiempo <30s.
- Gates A–E (ver docs/STABILITY-POLICY.md) bloquean merge si fallan.

