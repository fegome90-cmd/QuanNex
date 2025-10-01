# Guardrails Codex (Critical Lane)

## Acciones prohibidas
- Crear archivos o directorios nuevos dentro de `agents/**`.
- Usar `eval`, `new Function` u otras ejecuciones dinámicas.
- Importar con rutas arbitrarias fuera de alias/export canónicos.
- Modificar `ctx.plan` (es inmutable); metadata solo via `ctx.meta`.
- Cambiar contratos sin actualizar las suites correspondientes.

## Obligaciones
- Ejecutar `scripts/audit.sh` antes de solicitar revisión.
- Revisar el reporte GO/NO-GO (`node ops/readiness-check.mjs`).
- Mantener TaskSpec adjunto a cada issue crítico.
- Documentar feature flags o toggles usados.
- Registrar resultados de `npm run ci:gate1`.

## Paths permitidos para nuevos archivos
- `docs/**` (documentación).
- `taskspecs/**` (TaskSpecs).
- `scripts/**` y `ops/**` (utilidades aprobadas).
- `tests/**` (solo suites Gate 1/2 existentes o nuevas documentadas).
- Otros paths requieren aprobación previa.

## Checkpoints
1. TaskSpec validado y enlazado.
2. Guardrails confirmados (manual + `ops/scaffold-guard.mjs`).
3. Audit script (`scripts/audit.sh`) verde.
4. Métricas clave reportadas (p95, errores fatales).

Mantén este documento alineado con CI y contract suites.
