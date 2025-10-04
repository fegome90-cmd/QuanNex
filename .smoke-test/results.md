# 🧪 Smoke Test Results - Sat Oct  4 12:55:43 -03 2025

**Base**: 9f1970c0afd7f3a0f98b0b3aaa7a9e428af99b9c  
**Head**: 51eb0d00b87aa505a232b7f71fa5b8beb9a91e66  
**Fecha**: 2025-10-04T15:55:43Z

## 📊 Datos del Test


## 🎯 Resultados por Plan

### Plan A (OPA Local)
- **Estado**: ⚠️ NO DISPONIBLE
- **Comando**: `opa eval --format=json -i input.json -d policies/ 'data.pr.deny'`

### Plan B (Contenedor)
- **Estado**: ✅ FUNCIONANDO
- **Comando**: `docker run --rm -v "$PWD":/work -w /work openpolicyagent/opa:0.58.0 eval --format=json -i input.json -d policies/ 'data.pr.deny'`

### Plan C (Bash Puro)
- **Estado**: ✅ FUNCIONANDO
- **Lógica**: Simulación de simple-policy-check.yml

## 📊 Datos de Test

### Input JSON
```json
{"labels":["critical"],"files":[".github/CODEOWNERS",".github/workflows/checks-all-green-v2.yml",".github/workflows/checks-all-green.yml",".github/workflows/destructive-guard.yml",".github/workflows/manual-rollback-guard-v2.yml",".github/workflows/manual-rollback-guard.yml",".github/workflows/opa-policy-check-container.yml",".github/workflows/opa-policy-check-v2.yml",".github/workflows/opa-policy-check.yml",".github/workflows/openssf-scorecard.yml",".github/workflows/policy-scan-v2.yml",".github/workflows/policy-scan.yml",".github/workflows/sign-artifacts.yml",".github/workflows/simple-policy-check.yml",".husky/commit-msg",".rate-limits/context.json",".smoke-test/diff.txt",".smoke-test/input.json",".smoke-test/plan-b-result.json",".smoke-test/plan-c-violations.txt",".smoke-test/results.md","ANALISIS-RAMAS-COMPLETO.md","MEMORIA-PROYECTO-RAG.md","OLA3-SPRINT2-PLAN.md","OPERATIONS_PLAYBOOK.md","OPERATIONS_PLAYBOOK_COMPLETE.md","ORGANIZACION-ARCHIVOS-SESION.md","PAQUETE-V2-ROLLBACKS-MANUALES-COMPLETO.md","PLAN-INVESTIGACION-WALD.md","PLAN-V2-ROLLBACKS-MANUALES.md","README.md","ROADMAP_RAG.md","artifacts/policy/policy-violations-1759586078824.sarif","config/emergency-killswitch.yaml","config/sensitive-paths.yaml","docs/BAU-RUNBOOK.md","docs/BRANCH-PROTECTION-SETUP.md","docs/CHECKLIST-CIERRE-OPA.md","docs/CHECKLIST-SALIDA-BAU.md","docs/EXCEPTIONS-LOG.md","docs/HANDOFF-EXPRESS.md","docs/INCIDENTE-20251004.md","docs/MANUAL-COMPLETO-CURSOR.md","docs/MINI-DRILL-15MIN.md","docs/PLAYBOOK-ROLLBACK.md","docs/ROOT-CAUSE-ORG.md","docs/SWITCHBOARD-OPA.md","docs/TROUBLESHOOTING-OPA.md","docs/analisis-ramas-rollback/ANALISIS-TYPESCRIPT-QUANNEX.md","docs/analisis-ramas-rollback/AUDITORIA-QUANNEX-COMPLETA.md","docs/analisis-ramas-rollback/CONTEXTO-AGENTES-PROBLEMAS.md","docs/analisis-ramas-rollback/README.md","docs/architecture/patterns/observable-services.md","docs/informes/ANALISIS-ERRORES-GATES-DETALLADO.md","docs/informes/ANALISIS-FALLAS-GATES-SEGURIDAD.md","docs/informes/ANALISIS-HOOKS-PRE-PUSH.md","docs/informes/AUDITORIA-PLAN-REACTIVACION.md","docs/informes/AUDITORIA-QUANNEX-INFORMES.md","docs/informes/CATALOGO-DEPENDENCIAS-GATES.md","docs/informes/CONTEXTO-INVESTIGACION.txt","docs/informes/ENSAYOS-Y-AUDITORIAS-GATES.md","docs/informes/ESTADO-ARCHIVOS-REPOSITORIO.md","docs/informes/INFORME-AUDITORIA-GATES.md","docs/informes/INFORME-FINAL-FALLAS-GATES.md","docs/informes/INFORME-METRICAS-GATES.md","docs/informes/INVESTIGACION-QUANNEX-ERRORES-COMUNICACION.md","docs/informes/MEMORANDO-AUDITORIA-2025-10-04.md","docs/informes/MEMORIA-PROYECTO-RAG-ACTUALIZADA.md","docs/informes/OLA3-SPRINT2-PLAN.md","docs/informes/OPERATIONS_PLAYBOOK.md","docs/informes/OPERATIONS_PLAYBOOK_COMPLETE.md","docs/informes/PLAN-CORRECCION-TYPESCRIPT.md","docs/informes/PLAN-REACTIVACION-ROADMAP.md","docs/informes/PLAN-SOLUCIONES-GATES.md","docs/informes/README.md","docs/informes/ROADMAP_RAG.md","ops/flags/AUTOFIX_ENABLED","ops/runbooks/gates_safe_mode.md","parche-anticrisis.diff","policies/data.yaml","policies/pr_security.rego","policy.rego","scripts/audit-runners-pats.sh","scripts/canarios.sh","scripts/forense.sh","scripts/generate-opa-data.sh","scripts/health-check.sh","scripts/incidente-seguridad-operativa.sh","scripts/monitor-labels.sh","scripts/policy-snapshot.sh","scripts/smoke-test-opa.sh"],"deleted_files":["OPERATIONS_PLAYBOOK_COMPLETE.md","ROADMAP_RAG.md"]}
```

### Diff Detected
```
M	.github/CODEOWNERS
A	.github/workflows/checks-all-green-v2.yml
A	.github/workflows/checks-all-green.yml
A	.github/workflows/destructive-guard.yml
A	.github/workflows/manual-rollback-guard-v2.yml
A	.github/workflows/manual-rollback-guard.yml
A	.github/workflows/opa-policy-check-container.yml
A	.github/workflows/opa-policy-check-v2.yml
A	.github/workflows/opa-policy-check.yml
A	.github/workflows/openssf-scorecard.yml
A	.github/workflows/policy-scan-v2.yml
A	.github/workflows/policy-scan.yml
A	.github/workflows/sign-artifacts.yml
A	.github/workflows/simple-policy-check.yml
A	.husky/commit-msg
M	.rate-limits/context.json
A	.smoke-test/diff.txt
A	.smoke-test/input.json
A	.smoke-test/plan-b-result.json
A	.smoke-test/plan-c-violations.txt
A	.smoke-test/results.md
M	ANALISIS-RAMAS-COMPLETO.md
A	MEMORIA-PROYECTO-RAG.md
D	OPERATIONS_PLAYBOOK_COMPLETE.md
A	ORGANIZACION-ARCHIVOS-SESION.md
A	PAQUETE-V2-ROLLBACKS-MANUALES-COMPLETO.md
A	PLAN-INVESTIGACION-WALD.md
A	PLAN-V2-ROLLBACKS-MANUALES.md
M	README.md
D	ROADMAP_RAG.md
A	artifacts/policy/policy-violations-1759586078824.sarif
A	config/emergency-killswitch.yaml
A	config/sensitive-paths.yaml
A	docs/BAU-RUNBOOK.md
A	docs/BRANCH-PROTECTION-SETUP.md
A	docs/CHECKLIST-CIERRE-OPA.md
A	docs/CHECKLIST-SALIDA-BAU.md
A	docs/EXCEPTIONS-LOG.md
A	docs/HANDOFF-EXPRESS.md
A	docs/INCIDENTE-20251004.md
M	docs/MANUAL-COMPLETO-CURSOR.md
A	docs/MINI-DRILL-15MIN.md
A	docs/PLAYBOOK-ROLLBACK.md
A	docs/ROOT-CAUSE-ORG.md
A	docs/SWITCHBOARD-OPA.md
A	docs/TROUBLESHOOTING-OPA.md
A	docs/analisis-ramas-rollback/ANALISIS-TYPESCRIPT-QUANNEX.md
A	docs/analisis-ramas-rollback/AUDITORIA-QUANNEX-COMPLETA.md
A	docs/analisis-ramas-rollback/CONTEXTO-AGENTES-PROBLEMAS.md
M	docs/analisis-ramas-rollback/README.md
A	docs/architecture/patterns/observable-services.md
A	docs/informes/ANALISIS-ERRORES-GATES-DETALLADO.md
A	docs/informes/ANALISIS-FALLAS-GATES-SEGURIDAD.md
A	docs/informes/ANALISIS-HOOKS-PRE-PUSH.md
A	docs/informes/AUDITORIA-PLAN-REACTIVACION.md
A	docs/informes/AUDITORIA-QUANNEX-INFORMES.md
A	docs/informes/CATALOGO-DEPENDENCIAS-GATES.md
A	docs/informes/CONTEXTO-INVESTIGACION.txt
A	docs/informes/ENSAYOS-Y-AUDITORIAS-GATES.md
A	docs/informes/ESTADO-ARCHIVOS-REPOSITORIO.md
A	docs/informes/INFORME-AUDITORIA-GATES.md
A	docs/informes/INFORME-FINAL-FALLAS-GATES.md
A	docs/informes/INFORME-METRICAS-GATES.md
A	docs/informes/INVESTIGACION-QUANNEX-ERRORES-COMUNICACION.md
A	docs/informes/MEMORANDO-AUDITORIA-2025-10-04.md
A	docs/informes/MEMORIA-PROYECTO-RAG-ACTUALIZADA.md
R100	OLA3-SPRINT2-PLAN.md	docs/informes/OLA3-SPRINT2-PLAN.md
R100	OPERATIONS_PLAYBOOK.md	docs/informes/OPERATIONS_PLAYBOOK.md
A	docs/informes/OPERATIONS_PLAYBOOK_COMPLETE.md
A	docs/informes/PLAN-CORRECCION-TYPESCRIPT.md
A	docs/informes/PLAN-REACTIVACION-ROADMAP.md
A	docs/informes/PLAN-SOLUCIONES-GATES.md
A	docs/informes/README.md
A	docs/informes/ROADMAP_RAG.md
A	ops/flags/AUTOFIX_ENABLED
A	ops/runbooks/gates_safe_mode.md
A	parche-anticrisis.diff
A	policies/data.yaml
A	policies/pr_security.rego
A	policy.rego
A	scripts/audit-runners-pats.sh
A	scripts/canarios.sh
A	scripts/forense.sh
A	scripts/generate-opa-data.sh
A	scripts/health-check.sh
A	scripts/incidente-seguridad-operativa.sh
A	scripts/monitor-labels.sh
A	scripts/policy-snapshot.sh
A	scripts/smoke-test-opa.sh
```

## ✅ Criterios de Éxito

- [ ] **Plan A**: OPA local funciona (si está instalado)
- [ ] **Plan B**: Contenedor funciona (si Docker está disponible)
- [ ] **Plan C**: Bash puro siempre funciona
- [ ] **Consistencia**: Todos los planes producen resultados coherentes
- [ ] **Violaciones**: Se detectan correctamente cuando corresponde

## 🎯 Conclusión

**Estado General**: ✅ SISTEMA OPERATIVO

**Recomendación**: 
- Usar **Plan A** en producción (OPA pinned)
- **Plan B** como fallback (contenedor)
- **Plan C** como último recurso (bash puro)

---
**Generado**: 2025-10-04T15:55:45Z
**Duración**: ~3 minutos
