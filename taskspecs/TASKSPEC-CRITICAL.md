title: "[CRITICAL] <breve>"
goal: "Lograr <métrica/estado> sin romper Gate 1."
inputs:
  codepaths:
    - orchestration/task-runner.js
    - orchestration/build-policy-context.js
    - orchestration/router.yaml
  contracts:
    - contracts/handshake.js
    - contracts/schema.js
constraints:
  - No crear archivos fuera de paths canónicos (ver Guardrails).
  - Mantener compatibilidad con Gate 1 (scripts, tests).
deliverables:
  - Diffs concretos (no descripciones).
  - Pruebas nuevas o actualizadas (unit/smoke).
  - Notas de migración si cambian claves (e.g., ctx.meta.*).
acceptance_criteria:
  - `npm run ci:gate1` => exit 0
  - Contracts => 100% pass
  - p95 ≤ 7.5s; error fatal ≤ 1% (smoke suite)
  - Sin archivos nuevos en /agents/** (scaffold guard)
rollback_plan:
  - Revert commit y `npm run mcp:rollback` (v0-baseline)
notes:
  - Adjuntar métricas antes/después si aplica.
  - Registrar features flags usados.
