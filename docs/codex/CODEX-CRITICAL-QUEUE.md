# Codex Critical Task Queue

Solo contiene iniciativas calificadas como críticas por el equipo. Mantén este archivo corto y actualizado; toda tarea aquí debe tener TaskSpec asignado.

| Prioridad | Tarea | Estado | Responsable | Notas |
|-----------|-------|--------|-------------|-------|
| P0 | PolicyContext metadata merge & whitelist hardening | ✅ Hecho (baseline) | Felipe | Mantener suite `tests/policy-context.test.mjs` verde.
| P0 | Router declarativo V2 + FSM corto (PLAN→EXEC→CRITIC→POLICY→DONE) | ⏳ Pendiente | Codex | TaskSpec `taskspecs/codex-critical-router-fsm.md`.
| P0 | Gate-1 handshake & schema enforcement (4 agentes) | ⏳ Pendiente | Codex | TaskSpec pendiente de cargar.
| P0 | CI `ci:gate1` estricto (lint, contracts, init, smoke) | ⏳ Pendiente | Codex | Debe producir salida accionable.
| P0 | Anti-scaffolding & paths canónicos | ⏳ Pendiente | Codex | Validado con `scripts/audit.sh` + `ops/scaffold-guard.mjs`.

Actualiza este archivo al asignar o completar tareas. Borrar entradas solo cuando la iniciativa se cierra totalmente.
