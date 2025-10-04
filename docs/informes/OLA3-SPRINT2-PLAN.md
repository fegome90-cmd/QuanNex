# 🚀 OLA 3 - Sprint 2: Promoción a PG-only

**Objetivo**: Pasar de canary a paridad estricta y dejar PG listo para producción con observabilidad mínima útil.

## 📋 Alcance y Tareas

### 1. Paridad Estricta (1h controlada)
```bash
# Activar modo estricto
npm run ola3:sprint2 strict

# O manualmente:
sed -i.bak 's/TASKDB_DUAL_STRICT=false/TASKDB_DUAL_STRICT=true/' .env
npm run smoke:test
npm run taskdb:delta  # Debería devolver exit 0
```

### 2. Promover a PG-only (ventana controlada)
```bash
# Promoción completa
npm run ola3:sprint2 promote

# O manualmente:
sed -i.bak 's/^TASKDB_DRIVER=.*/TASKDB_DRIVER=pg/' .env
npm run smoke:test
npm run taskdb:baseline
```

### 3. Observabilidad Mínima
```bash
# Configurar alertas y snapshot
npm run taskdb:alert

# Snapshot diario automático
curl -s http://localhost:9464/metrics > reports/metrics-$(date +%F).prom
```

### 4. Sello de Sprint 2 (DoD)
```bash
# Verificación completa
npm run ola3:sprint2 dod

# Criterios:
# - Delta PG vs SQLite ≤ 1%
# - /metrics estable 24-48h
# - Baseline con finish_rate ≥ 90%, TTFQ p95 ≤ 5s
# - PROGRESS.md actualizado + tag v0.3.0-ola3-s2
```

## ✅ Acceptance Checks (Rápidos)

- [ ] **Paridad estricta**: `npm run taskdb:delta` exit 0
- [ ] **Baseline OK**: finish_rate ≥ 90%, error_rate ≤ 5%, TTFQ p95 ≤ 5s
- [ ] **Promoción a PG**: `TASKDB_DRIVER=pg` y smoke pasan
- [ ] **Snapshot de métricas**: Guardado (día de promoción)
- [ ] **PROGRESS.md y tag**: Creados

## 🧭 Watchlist (Qué Vigilar)

### Desviación Creciente PG↔SQLite (>5%)
- **Síntoma**: Delta script sale con código 2
- **Acción**: Mantener dual no-estricto y revisar lotes/errores
- **Comando**: `npm run taskdb:delta`

### Cola Subiendo Sin Bajar
- **Síntoma**: `taskdb_queue_depth` > 50 persistente
- **Acción**: Revisar flush/DB lento (index, I/O, batch size)
- **Comando**: `npm run taskdb:alert`

### Run.error Inusual Tras Promoción
- **Síntoma**: Error rate > 5% en baseline
- **Acción**: Revisar circuit breakers/timeout LLM/tools
- **Comando**: `npm run taskdb:baseline`

## 🩺 Operación Diaria (Shadow-write)

### Health Quick-Check (60s)
```bash
# Verificación completa
npm run taskdb:health

# O comandos individuales:
curl -s http://localhost:9464/metrics | head
npm run taskdb:delta
```

### Delta Automático PG vs SQLite
```bash
# Un comando para verificar desviación
npm run taskdb:delta

# Si sale con código 2 → desviación alta
# Revisar logs del DualTaskDB (mismatches) y mantener canary
```

### Baseline Diario
```bash
npm run taskdb:baseline
sed -n '1,60p' reports/TASKDB-BASELINE.md
```

### Rollback Express
```bash
# Mantiene el sistema respirando con JSONL append-only
sed -i.bak 's/^TASKDB_DRIVER=.*/TASKDB_DRIVER=jsonl/' .env
# Reinyectas luego con migrador JSONL -> PG
```

## 📝 PR Template (Promoción PG)

```markdown
feat(taskdb): promote to PG-only after strict parity

- Dual strict parity: delta <= 1%
- Metrics stable: queue_depth low, flush_latency p95 < 1s
- Baseline updated: finish_rate >= 90%, TTFQ p95 within target
- Switch TASKDB_DRIVER=pg; rollback plan documented (jsonl)
- Tag: v0.3.0-ola3-s2
```

## 🔧 Scripts Disponibles

### Operación Diaria
- `npm run taskdb:health` - Health check completo (60s)
- `npm run taskdb:delta` - Verificación delta PG vs SQLite
- `npm run taskdb:alert` - Verificación umbrales + snapshot
- `npm run taskdb:baseline` - Generar baseline diario

### Sprint 2
- `npm run ola3:sprint2` - Ejecutar Sprint 2 completo
- `npm run ola3:sprint2 strict` - Solo paridad estricta
- `npm run ola3:sprint2 promote` - Solo promoción a PG
- `npm run ola3:sprint2 obs` - Solo observabilidad
- `npm run ola3:sprint2 dod` - Solo verificación DoD

## 🎯 Estado Actual

- **OLA 2**: ✅ Sellada (shadow-write + métricas + baseline)
- **OLA 3 Sprint 1**: ✅ Encendida (canary activo)
- **OLA 3 Sprint 2**: 🟡 Lista para ejecutar

## 🚀 Próximos Pasos

1. **Ejecutar Sprint 2**: `npm run ola3:sprint2`
2. **Verificar DoD**: Todos los acceptance checks
3. **Crear PR**: Con template de promoción PG
4. **Tag v0.3.0-ola3-s2**: Sellar Sprint 2
5. **Monitoreo continuo**: Operación diaria establecida

---

⚠️ **Nota Cultural**  
Estas métricas son diagnósticas, no se usan para evaluar personas.

*Plan generado automáticamente por TaskDB v2*
