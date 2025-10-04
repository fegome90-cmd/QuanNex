# Weekly Ops – TaskDB (2025-10-04)

## 📊 Baseline Semanal
```
# TaskDB Baseline Report (últimos 7 días)

**Generado**: 2025-10-04T00:07:03.622Z  
**Período**: 2025-09-27T00:07:03.622Z - 2025-10-04T00:07:03.623Z

## Resumen
- Eventos totales: **0**
- Runs: start=0, finish=0, error=0
- Tasa de finalización: **0.0%** | Error rate: **0.0%**
- TTFQ: p50=0ms, p95=0ms

## Eventos por tipo/estado


## Estado del Sistema
- **Shadow Write**: ❌ Inactivo
- **Driver**: sqlite
- **Archivos**: taskdb.json (0 eventos), taskdb-core.json (0 eventos)

## Próximos Pasos
```

## 🎯 Checklist de Revisión

### Métricas Críticas
- [ ] **Finish Rate**: ≥ 90%
- [ ] **Error Rate**: ≤ 5%
- [ ] **Queue Depth**: p95 < 50
- [ ] **Flush Latency**: p95 < 1s

### Operación
- [ ] **Baseline diario**: Generado automáticamente
- [ ] **Snapshots**: Guardados en reports/metrics-*.prom
- [ ] **Dashboard**: Accesible y actualizado
- [ ] **Alertas**: Umbrales funcionando

### Gobernanza
- [ ] **Instrumentación**: 100% de funciones en src/functions/
- [ ] **CI Gates**: ≥ 95% cumplimiento
- [ ] **Delta PG**: Consistente y estable

## 🔍 Acciones Requeridas

<!-- Dueño rotativo: revisar métricas y dejar 1-2 acciones específicas -->

### Revisión de Umbrales
- [ ] Verificar finish_rate
- [ ] Verificar error_rate
- [ ] Verificar queue_depth
- [ ] Verificar flush_latency

### Revisión de Colas
- [ ] Verificar estabilidad de colas
- [ ] Revisar logs de errores
- [ ] Verificar performance

### Revisión de Fallas
- [ ] Analizar run.error events
- [ ] Revisar gate.fail events
- [ ] Identificar patrones

## 📝 Notas de la Semana

<!-- Documentar observaciones importantes -->

## 🎯 Próximas Acciones

<!-- Listar acciones específicas para la próxima semana -->

---

**Dueño Rotativo**: @[asignar]
**Fecha**: 2025-10-04
**Baseline**: [TASKDB-BASELINE.md](./reports/TASKDB-BASELINE.md)
**Dashboard**: [Grafana](./config/grafana-dashboard-taskdb.json)

⚠️ **Nota Cultural**: Estas métricas son diagnósticas, no se usan para evaluar personas.

*Generado automáticamente por TaskDB v2*
