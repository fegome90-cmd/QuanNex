# TaskDB v2 - Piloto Automático

## 📡 Monitoreo Continuo

### 1. Cron de Baseline + Snapshot (Diario)

```bash
# Agregar a crontab
crontab -e

# Baseline diario a las 8 AM
0 8 * * * cd /ruta/al/repo && npm run taskdb:baseline && curl -s http://localhost:9464/metrics > reports/metrics-$(date +\%F).prom
```

### 2. Alerta Suave (CI/Cron) - Umbrales

```bash
# Verificar umbrales
npm run alert:thresholds || echo "⚠️ Umbral excedido — revisar dashboard"
```

**Criterios Mínimos:**
- finish_rate >= 90%
- error_rate <= 5%
- taskdb_queue_depth p95 < 50
- taskdb_flush_latency_seconds p95 < 1s

### 3. Dashboard "Listo para Usar"

**Paneles (4):**
- Eventos totales por kind/status
- flush_latency p95
- queue_depth
- finish_rate / error_rate (serie diaria del snapshot)

## 🛡️ TaskDB Always-On (Verificación en Cada Cambio)

### 4. CI Gate (Ya Creado, Úsalo)

```bash
# Verificar instrumentación
npm run ci:require-taskdb

# Test de aceptación
npm run test:instrumentation
```

### 5. Runtime Guard (Opcional "Modo Estricto")

```bash
# .env
TASKDB_ENFORCE_RUNTIME=true
```

Corta en ejecución si alguien llama funciones críticas sin contexto de TaskDB.

### 6. PR Template (Usar Siempre)

- Checklist "withTask aplicado"
- Referencia a PLAN-YYYY-MM-… como taskId
- Evidencia: salida de `npm run smoke:taskdb` + eventos en TaskDB

## 🎯 Gobernanza Operativa (Ligera y Efectiva)

### 7. Métrica de Adopción (Semanal)

- Instrumentación ≥ 100% de funciones en src/functions/
- Cumplimiento gates ≥ 95% (fallos justifican excepción en PR)
- Delta PG-only consistente (ya está) + baseline diario presente

### 8. Ritual Semanal (Sin Reunión)

1. CI genera TASKDB-WEEKLY.md (o TASKDB-BASELINE.md actualizado)
2. Se abre un issue automático: "Weekly Ops – TaskDB"
3. Dueño rotativo revisa: umbrales, colas, fallas, y deja 1–2 acciones
4. Cierra issue con links a PRs/planes si aplica

## ✅ Qué Revisar Ahora (Quick Health)

### 1. Endpoint
```bash
curl -s http://localhost:9464/metrics | head -n 5
```

### 2. Baseline
```bash
sed -n '1,60p' reports/TASKDB-BASELINE.md
```

### 3. Gate de Instrumentación
```bash
npm run ci:require-taskdb && npm run test:instrumentation
```

## 🗺️ Luego: Puente a RAG (Cuando Digas "Go")

- Mantener estas 3 cosas estables 3–5 días (cola/latencia/finish-rate)
- Ejecutar checklist Pre-RAG (el que te dejé)
- Iniciar Ola 4 (RAG): ingesta → índice → retriever → eventos memory.inject/store → policy 1.2.0 (citas)

## 📋 Scripts Disponibles

### Monitoreo Diario
```bash
./scripts/daily-monitoring.sh
```

### Health Check Rápido
```bash
./scripts/quick-health-check.sh
```

### Métricas de Gobernanza
```bash
npm run governance:metrics
```

### Issue Semanal
```bash
npm run weekly:ops
```

## 🎯 Estado Actual

- **OLA 2**: ✅ Sellada (shadow-write + métricas + baseline)
- **OLA 3 Sprint 1**: ✅ Completada (canary activo)
- **OLA 3 Sprint 2**: ✅ Completada (PG-only promovido)
- **OLA 3 Sprint 3**: ✅ Completada (observabilidad + enforcement)

**Sistema en piloto automático con observabilidad continua y enforcement automático.**
