# TaskDB Governance

## Principios

### 1. Complejidad Controlada
- **Budget de complejidad**: Máximo 200 LOC de churn en `core/taskdb/` por versión
- **Warning automático**: CI alerta cuando se excede el budget
- **Principio**: Mantener TaskDB simple y enfocado

### 2. Métricas Diagnósticas
- **No evaluativas**: Las métricas son para diagnóstico, no para evaluar personas
- **Cláusula cultural**: Automática en todos los reportes
- **Ciclo datos→insight→acción→reme**: Feedback loop continuo

### 3. Trazabilidad Sin Fricción
- **Ruta crítica protegida**: Ningún await I/O en flujos críticos
- **Cola asíncrona**: Batch processing con límites de memoria
- **Failover automático**: Postgres → JSONL → re-sync

## Mecanismos

### Budget de Complejidad
```bash
# Verificar budget actual
node scripts/taskdb-budget.mjs

# Configurar base tag
export BASE_TAG=v0.2.0
```

**Umbrales**:
- ✅ 0-200 LOC: Dentro de budget
- ⚠️ >200 LOC: Warning en CI (no bloquea)

### Cláusula Cultural Automática
Todos los reportes incluyen automáticamente:
```
⚠️ Nota Cultural
Estas métricas son diagnósticas, no se usan para evaluar personas.
```

### Ritual Semanal
- **Trigger**: Lunes 12:00 UTC (cron)
- **Acción**: Genera reporte + Issue asignado
- **Asignado**: felipe-gonzalez (rotación futura)
- **Labels**: taskdb, weekly, automated

### Checklist de PR
**Obligatorio**:
- [ ] PROGRESS.md actualizado
- [ ] Sección **Insight** con aprendizaje relevante
- [ ] Insight revisado por par

**Insight debe incluir**:
- Patrón técnico descubierto
- Lección operativa aprendida
- Impacto en arquitectura

## Auditoría Final

### Veredicto: ✅ APROBADO

**Fortalezas**:
- Trazabilidad completa sin impacto en performance
- Failover robusto con re-sync automático
- Gobernanza cultural instrumentada
- Budget de complejidad controlado

**Riesgos Menores**:
- Dependencia de Postgres en producción
- Rotación manual de asignados semanales
- Migración JSONL→PG requiere intervención manual

**Mitigaciones**:
- Failover automático a JSONL
- Script de migración automatizado
- Plan de rotación de asignados

## Runbook Operativo

### Fallas de Postgres
1. **Detección**: 3 fallos consecutivos → switch automático
2. **Alerta**: Log + monitoring system
3. **Fallback**: JSONL con rotación diaria
4. **Recovery**: Script `ops/migrate/jsonl-to-pg.ts`
5. **Return**: Auto-recovery cuando Postgres vuelve

### Límites de Cola
- **MAX_QUEUE**: 50,000 eventos
- **MAX_BATCH**: 100 eventos por flush
- **FLUSH_MS**: 250ms
- **Backpressure**: Remove oldest si cola llena

### Retención
- **Postgres**: 90 días (configurable)
- **JSONL**: 7 días (rotación automática)
- **SQLite**: Solo desarrollo (no producción)

## KPIs y Umbrales

| Métrica | Objetivo | Crítico |
|---------|----------|---------|
| Queue Lag P95 | <1s | <2s |
| Flush Success Rate | >99.5% | >99% |
| Orchestrator Share | >95% | >90% |
| Bypass Rate | <5% | <10% |
| TTFQ P95 | <5s | <10s |

## Comandos Útiles

```bash
# Generar reporte semanal
node cli/qnx-report.js --since=7d

# Verificar budget
node scripts/taskdb-budget.mjs

# Migrar fallback
npx ts-node ops/migrate/jsonl-to-pg.ts ./logs/taskdb-*.jsonl

# Test smoke e2e
npm run test:taskdb:smoke

# Verificar status failover
node -e "import('./core/taskdb/failover.js').then(m => console.log(m.getStatus()))"
```

## Plan de Rollout

### Fase A — Dev/Shadow (1-2 días)
- [x] Driver sqlite|jsonl activo
- [x] Smoke e2e en CI
- [x] KPIs locales configurados

### Fase B — Canary (2-5 días)
- [ ] 10-20% tráfico → pg
- [ ] Monitoreo Queue Lag y Flush Success
- [ ] Test failover y re-sync

### Fase C — Full Prod
- [ ] 100% pg + append-only
- [ ] Backup/retención configurados
- [ ] Checklist PR activo
- [ ] Ritual semanal generando Issues

---

*Documentación oficial de TaskDB Governance v2.0*
