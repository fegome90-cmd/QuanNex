title: "[CRITICAL] Router declarativo V2 + FSM corto"
goal: "Planificar y ejecutar PLAN→EXEC→CRITIC→POLICY→DONE con router.yaml V2 sin romper Gate 1."
inputs:
  codepaths:
    - orchestration/router.js
    - orchestration/router.yaml
    - orchestration/orchestrator.js
    - orchestration/orchestrator_fsm.py
  contracts:
    - contracts/handshake.js
    - contracts/schema.js
constraints:
  - No crear archivos fuera de paths canónicos (ver Guardrails).
  - Mantener compatibilidad con Gate 1 (scripts, tests).
  - Respetar budget/hops y telemetría actuales.
deliverables:
  - Diffs concretos con router V2 y FSM corto.
  - Pruebas actualizadas (`tests/router.spec.mjs`, `tests/fsm.spec.mjs`).
  - Notas de migración si cambian claves de telemetría.
acceptance_criteria:
  - `npm run ci:gate1` => exit 0
  - Contracts => 100% pass
  - p95 ≤ 7.5s; error fatal ≤ 1% (smoke suite)
  - Sin archivos nuevos en /agents/** (scaffold guard)
rollback_plan:
  - Revert commit y `npm run mcp:rollback`
notes:
  - Adjuntar métricas antes/después.
  - Documentar cambios en `docs/CODEX-CRITICAL-QUEUE.md` tras el merge.
