# Codex Critical Lane Playbook

1. **Seleccionar tarea crítica**
   - Revisa `docs/CODEX-CRITICAL-QUEUE.md`.
   - Asegura que la entrada tenga TaskSpec asignado en `taskspecs/`.

2. **Preparar TaskSpec**
   - Copia `taskspecs/TASKSPEC-CRITICAL.md` y completa los campos.
   - Adjunta enlace en el issue/PR.

3. **Aplicar Guardrails**
   - Repasa `docs/CODEX-GUARDRAILS.md`.
   - Configura flags necesarios (`TASK_META_OVER_PLAN`, `DEBUG_POLICY_CONTEXT`).

4. **Desarrollo**
   - Mantén cambios en paths permitidos.
   - Usa imports canónicos y evita `agents/**` para archivos nuevos.

5. **Validaciones obligatorias**
   - Ejecuta `scripts/audit.sh` (contracts, init, smoke, ci:gate1, scaffold guard, readiness).
   - Revisa la salida GO/NO-GO de `ops/readiness-check.mjs`.
   - Añade pruebas específicas según TaskSpec.

6. **PR Checklist**
   - Usa la plantilla `.github/PULL_REQUEST_TEMPLATE/CODEX.md`.
   - Reporta resultados de pruebas, riesgos y mitigaciones.

7. **Post-merge**
   - Actualiza la cola crítica y notas de RUNBOOK si aplica.
   - Monitorea métricas (p95, errores fatales) durante el canary.

Mantén este playbook sincronizado con CI y guardrails. Cualquier desviación debe documentarse aquí.
