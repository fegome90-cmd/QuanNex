# Pull Request

## 📋 Checklist TaskDB

### Instrumentación Obligatoria
- [ ] Las funciones nuevas usan **withTask(...)**
- [ ] Se registran `run.start → … → run.finish` (ver smoke)
- [ ] Funciones críticas usan `requireTaskContext()`
- [ ] Eventos adicionales registrados con `insertEvent()`

### Plan y Trazabilidad
- [ ] Este PR referencia un **PLAN-YYYY-MM-…** (taskId) y se usa como `runId` base
- [ ] Cambios documentados en PROGRESS.md
- [ ] Tag de versión creado si corresponde

### Verificación
- [ ] `npm run smoke:test` pasa y aparecen eventos del nuevo código
- [ ] `npm run taskdb:health` reporta estado saludable
- [ ] `npm run ci:require-taskdb` pasa (instrumentación verificada)

## 🎯 Descripción

### Cambios Realizados
<!-- Describe los cambios principales -->

### Funciones Nuevas/Modificadas
<!-- Lista las funciones que requieren instrumentación TaskDB -->

### Impacto en TaskDB
<!-- Describe cómo afecta a las métricas y observabilidad -->

## 🧪 Testing

### Smoke Tests
- [ ] `npm run smoke:test` - ✅ PASS
- [ ] `npm run taskdb:health` - ✅ PASS
- [ ] `npm run taskdb:delta` - ✅ PASS

### Instrumentación
- [ ] Eventos `run.start` y `run.finish` registrados
- [ ] Eventos adicionales (`guardrail.*`, `llm.*`, etc.) según corresponda
- [ ] No hay funciones sin contexto TaskDB

## 📊 Métricas

### Baseline Actualizado
- [ ] `npm run taskdb:baseline` ejecutado
- [ ] KPIs dentro de umbrales aceptables
- [ ] Snapshot de métricas guardado

### Observabilidad
- [ ] Dashboard Grafana actualizado (si aplica)
- [ ] Alertas configuradas (si aplica)
- [ ] Logs estructurados implementados

## 🔄 Rollback Plan

### Si algo falla:
1. Revertir commit: `git revert <commit-hash>`
2. Cambiar driver: `TASKDB_DRIVER=jsonl`
3. Verificar estabilidad: `npm run taskdb:health`

---

⚠️ **Nota Cultural**  
Estas métricas son diagnósticas, no se usan para evaluar personas.

*Template generado automáticamente por TaskDB v2*