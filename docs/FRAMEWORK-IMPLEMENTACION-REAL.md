# Framework de Implementación Real (Toyota‑grade)

## Principios
- Prevenir > Detectar > Recuperar > Medir. Cambios pequeños, atómicos y verificables.

## Fases y PRs (resumen)
- PR7–PR9: Permisos/espacio (fail‑fast), fallbacks visibles, cleanup seguro.
- PR10–PR11: Validador de templates + 0 placeholders (templates off por defecto hasta Gate B).
- PR12: MCP resiliente (enabled|disabled con razón) + healthcheck informativo.
- PR14: Transaccionalidad (staging + mv atómico) + rollback.
- PR15: Healthcheck profundo por tipo (scripts 0755, `.env.example`, hooks/MCP/estructura).
- PR16–PR18: Logs estructurados (`init-report.json`), manifest de templates y grafo de deps.

## Gates (Stop/Go)
- A: Permisos/espacio OK; fallback/cleanup activos; sin residuos.
- B: Templates válidos (JSON/estructura/versión/deps) y 0 `{{…}}`.
- C: MCP/Hooks resilientes; ejecutables sin Node; healthcheck refleja estado.
- D: Transaccionalidad aplicada; healthcheck funcional por tipo.
- E: Logs/errores con contexto y compatibilidad de templates garantizada.

## Matriz de Pruebas (edge)
- Tipos × {templates off,on} × {npm sí/no} × {ruta con espacios sí/no} × {git/gh sí/no}.
- Timeout razonable, sin red ni instalaciones, determinista.

## Criterios de Aceptación
- 100% de suites (unit/flags/integración/edge) verdes.
- 0 placeholders, 0 secretos, scripts 0755, MCP state coherente.
- Healthcheck pasa en 6 tipos con diagnóstico útil si hay warnings.

## Rollback y Recuperación
- Staging + mv atómico; cleanup seguro en ERR/INT/TERM.
- Backups opt‑in (`--force-with-backup`) y `scripts/restore-backup.sh` (pendiente).

## Métricas y Reportes
- `reports/validation.json` y `logs/init-*.log` con pasos/estado/razón.
- CI publica summary y artifacts; gates marcan required checks.

