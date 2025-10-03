# 🔧 QuanNex Metrics Integrity Gate - Runbook Operacional

## 📋 Índice
1. [Síntomas](#síntomas)
2. [Diagnóstico Rápido](#diagnóstico-rápido)
3. [Mitigación](#mitigación)
4. [Verificación](#verificación)

---

## 🚨 Síntomas

### Alertas Críticas
- **QuanNexMetricsMissing**: Sin métrica de negocio por >5min
- **QuanNexMetricsDegraded**: Fallback a snapshot detectado
- **QuanNexCircuitBreakerActive**: Circuit breaker activo >2min
- **QuanNexSnapshotRatioHigh**: >5% snapshot en 1h

### Síntomas Observables
- **Endpoint /metrics devuelve 500**: ❌ CRÍTICO
- **Ratio live vs snapshot < 95%**: ⚠️ DEGRADADO
- **Latencia p95 > 200ms**: ⚠️ PERFORMANCE
- **E2E sin PASS > 90min**: ⚠️ FRESCURA

### Impacto
- **Sin métricas**: Dashboards vacíos, alertas silenciosas
- **Solo snapshot**: Métricas obsoletas, decisiones incorrectas
- **Circuit breaker**: Degradación completa del sistema

---

## 🔍 Diagnóstico Rápido

### 3 Comandos Exactos

```bash
# 1. Estado del endpoint y headers
curl -fsS -D- http://localhost:3000/metrics | sed -n '1,20p'

# 2. Autodiagnóstico completo
curl -fsS http://localhost:3000/metrics/selftest | jq

# 3. Logs de métricas y circuit breaker
grep -E "metrics|fallback|breaker" -n server.log | tail -n 50
```

### Interpretación de Resultados

#### Comando 1 - Headers Esperados:
```bash
# ✅ NORMAL
Content-Type: text/plain; version=0.0.4; charset=utf-8
X-Metrics-Source: live
Cache-Control: no-store

# ⚠️ DEGRADADO
X-Metrics-Source: snapshot
Warning: 199 QuanNex "metrics_fallback"

# ❌ CRÍTICO
X-Metrics-Source: minimal
Warning: 199 QuanNex "minimal_fallback"
```

#### Comando 2 - Autodiagnóstico:
```json
{
  "circuit_breaker": {
    "active": false,  // ✅ Normal
    "failure_count": 0,
    "last_failure": 0
  },
  "snapshot": {
    "exists": true,   // ✅ Disponible
    "valid": true,
    "age": 1234
  },
  "validation": {
    "live_metrics_available": true,  // ✅ Funcionando
    "snapshot_valid": true
  }
}
```

#### Comando 3 - Logs Críticos:
```bash
# ✅ NORMAL
✅ Métricas en vivo generadas exitosamente
✅ Snapshot guardado exitosamente

# ⚠️ DEGRADADO
🔄 Usando snapshot de fallback
⚠️ Fallo en generación de métricas en vivo

# ❌ CRÍTICO
🔴 Circuit breaker activo - usando snapshot
❌ Error generando métricas: invalid_openmetrics_format
```

---

## 🛠️ Mitigación

### Escalación por Severidad

#### 🟢 VERDE (Normal)
- **Acción**: Monitoreo continuo
- **Comando**: `./scripts/test-resilience.sh`

#### 🟡 AMARILLO (Degradado)
- **Acción**: Investigación y mitigación suave
- **Comandos**:
```bash
# Reiniciar servidor suavemente
pkill -f "node src/server.mjs" && sleep 2 && node src/server.mjs &

# Verificar recuperación
sleep 5 && curl -fsS http://localhost:3000/health
```

#### 🔴 ROJO (Crítico)
- **Acción**: Mitigación inmediata
- **Comandos**:
```bash
# 1. Reset manual del circuit breaker
curl -X POST http://localhost:3000/metrics/reset-breaker

# 2. Si no funciona, reinicio completo
pkill -f "node src/server.mjs"
sleep 5
node src/server.mjs &

# 3. Verificar estado crítico
./scripts/test-resilience.sh
```

### Procedimientos Específicos

#### Circuit Breaker Activo
```bash
# Verificar estado
curl -fsS http://localhost:3000/metrics/selftest | jq '.circuit_breaker'

# Reset manual (si disponible)
curl -X POST http://localhost:3000/metrics/reset-breaker

# Reinicio si es necesario
pkill -f "node src/server.mjs" && sleep 2 && node src/server.mjs &
```

#### Snapshot Ratio Alto
```bash
# Verificar ratio actual
curl -fsS http://localhost:3000/metrics | grep 'quannex_metrics_snapshot_total'

# Forzar regeneración de snapshot
rm -f .cache/metrics.last.ok
curl -fsS http://localhost:3000/metrics >/dev/null

# Verificar recuperación
sleep 10 && curl -fsS -D- http://localhost:3000/metrics | grep 'X-Metrics-Source'
```

#### Latencia Alta
```bash
# Medir latencia actual
curl -fsS -w "%{time_total}" -o /dev/null http://localhost:3000/metrics

# Verificar recursos del sistema
top -n 1 | grep node

# Reinicio si es necesario
pkill -f "node src/server.mjs" && sleep 2 && node src/server.mjs &
```

---

## ✅ Verificación

### Métricas de "Vuelta a Verde"

#### Disponibilidad
- **Métrica**: `quannex_gate_status{gate="metrics_integrity"}`
- **Umbral**: `1` (pass)
- **Comando**: `curl -fsS http://localhost:3000/metrics | grep 'quannex_gate_status.*metrics_integrity'`

#### Ratio Live vs Snapshot
- **Métrica**: `X-Metrics-Source: live`
- **Umbral**: `≥ 95%` en 5 minutos
- **Comando**: `for i in {1..10}; do curl -fsS -D- http://localhost:3000/metrics | grep 'X-Metrics-Source'; sleep 30; done`

#### Circuit Breaker
- **Métrica**: `quannex_circuit_breaker_active`
- **Umbral**: `0` (inactivo)
- **Comando**: `curl -fsS http://localhost:3000/metrics | grep 'quannex_circuit_breaker_active'`

#### Latencia
- **Métrica**: `histogram_quantile(0.95, rate(qn_http_request_duration_seconds_bucket[5m]))`
- **Umbral**: `≤ 200ms`
- **Comando**: `curl -fsS -w "%{time_total}" -o /dev/null http://localhost:3000/metrics`

### Checklist de Recuperación

```bash
# ✅ Checklist completo de verificación
echo "🔍 Verificando recuperación completa..."

# 1. Endpoint responde 200
curl -fsS -w "%{http_code}" -o /dev/null http://localhost:3000/metrics | grep -q "200" && echo "✅ HTTP 200" || echo "❌ HTTP Error"

# 2. Headers correctos
curl -fsS -D- http://localhost:3000/metrics | grep -q "X-Metrics-Source: live" && echo "✅ Live metrics" || echo "❌ Snapshot mode"

# 3. Circuit breaker inactivo
curl -fsS http://localhost:3000/metrics | grep -q "quannex_circuit_breaker_active.*0" && echo "✅ Circuit breaker OK" || echo "❌ Circuit breaker active"

# 4. Latencia normal
LATENCY=$(curl -fsS -w "%{time_total}" -o /dev/null http://localhost:3000/metrics)
if (( $(echo "$LATENCY <= 0.2" | bc -l) )); then
    echo "✅ Latencia normal: ${LATENCY}s"
else
    echo "❌ Latencia alta: ${LATENCY}s"
fi

# 5. Autodiagnóstico verde
curl -fsS http://localhost:3000/metrics/selftest | jq -e '.validation.live_metrics_available == true' && echo "✅ Autodiagnóstico verde" || echo "❌ Autodiagnóstico rojo"

echo "🎉 Verificación completada"
```

### Post-Incidente

#### Documentación Requerida
- **Tiempo de detección**: ¿Cuándo se detectó el problema?
- **Tiempo de mitigación**: ¿Cuánto tardó en resolverse?
- **Causa raíz**: ¿Qué causó el incidente?
- **Acciones tomadas**: ¿Qué se hizo para resolverlo?
- **Prevención**: ¿Cómo evitar que vuelva a ocurrir?

#### Métricas de Post-Incidente
- **MTTR (Mean Time To Recovery)**: Tiempo promedio de recuperación
- **MTBF (Mean Time Between Failures)**: Tiempo promedio entre fallos
- **Error Budget Burn**: Consumo del presupuesto de error

---

## 📞 Contactos de Emergencia

- **On-call Primary**: [Configurar en tu organización]
- **On-call Secondary**: [Configurar en tu organización]
- **Escalation**: [Configurar en tu organización]

## 🔗 Enlaces Útiles

- **Dashboard**: [URL del dashboard de Grafana]
- **Alertas**: [URL de Prometheus alerts]
- **Logs**: [URL del sistema de logs]
- **Documentación**: [URL de la documentación técnica]

---

**🔒 QuanNex Metrics Integrity Gate v1.0.0**  
*Runbook operacional para incidentes y recuperación*
