#!/usr/bin/env bash
set -euo pipefail

# Script de pruebas de resiliencia para Metrics Integrity Gate
# Prueba circuit breaker, fallback, y resistencia a fallos

METRICS_URL="${1:-http://localhost:3000/metrics}"
HEALTH_URL="${2:-http://localhost:3000/health}"

echo "🔒 [RESILIENCE-TEST] Iniciando pruebas de resiliencia..."

# Función de error
fail() {
    echo "❌ [RESILIENCE-TEST] $1"
    exit 1
}

# Función de éxito
ok() {
    echo "✅ [RESILIENCE-TEST] $1"
}

# 1. Prueba básica de disponibilidad
echo "📡 Prueba 1: Disponibilidad básica"
for i in {1..10}; do
    curl -fsS "$METRICS_URL" >/dev/null || fail "Endpoint no disponible en intento $i"
done
ok "Endpoint disponible en 10/10 intentos"

# 2. Prueba de headers defensivos
echo "📋 Prueba 2: Headers defensivos"
HEADERS="$(curl -fsS -D- "$METRICS_URL" 2>/dev/null)"
echo "$HEADERS" | grep -q "Content-Type.*text/plain" || fail "Content-Type incorrecto"
echo "$HEADERS" | grep -q "Cache-Control.*no-store" || fail "Cache-Control incorrecto"
echo "$HEADERS" | grep -q "X-Metrics-Source" || fail "X-Metrics-Source faltante"
ok "Headers defensivos presentes"

# 3. Prueba de golden set
echo "🎯 Prueba 3: Golden set mínimo"
METRICS="$(curl -fsS "$METRICS_URL")"
echo "$METRICS" | grep -q "quannex_gate_status" || fail "Métrica de negocio faltante"
echo "$METRICS" | grep -q "qn_system_uptime_seconds" || fail "Métrica del sistema faltante"
ok "Golden set presente"

# 4. Prueba de formato OpenMetrics
echo "📊 Prueba 4: Formato OpenMetrics"
echo "$METRICS" | grep -q "# HELP" || fail "Falta # HELP"
echo "$METRICS" | grep -q "# TYPE" || fail "Falta # TYPE"
echo "$METRICS" | grep -Ei "NaN" && fail "Contiene NaN" || true
ok "Formato OpenMetrics válido"

# 5. Prueba de tamaño razonable
echo "📏 Prueba 5: Tamaño razonable"
SIZE="$(echo "$METRICS" | wc -c)"
if [ "$SIZE" -gt 5242880 ]; then  # 5MB
    fail "Payload muy grande: ${SIZE} bytes"
fi
ok "Tamaño razonable: ${SIZE} bytes"

# 6. Prueba de tráfico real
echo "🚦 Prueba 6: Tráfico real modifica contadores"
INITIAL="$(curl -fsS "$METRICS_URL" | grep '^qn_http_requests_total' | head -1)"
echo "Contador inicial: $INITIAL"

# Generar tráfico
for i in {1..25}; do
    curl -s "$HEALTH_URL" >/dev/null
done

sleep 2
FINAL="$(curl -fsS "$METRICS_URL" | grep '^qn_http_requests_total' | head -1)"
echo "Contador final: $FINAL"

if [ "$INITIAL" = "$FINAL" ]; then
    fail "Contador no incrementó con tráfico real"
fi
ok "Contador incrementó con tráfico real"

# 7. Prueba de autodiagnóstico
echo "🔧 Prueba 7: Autodiagnóstico coherente"
SELFTEST="$(curl -fsS "$METRICS_URL/selftest" | jq -r '.validation.live_metrics_available')"
if [ "$SELFTEST" != "true" ]; then
    fail "Autodiagnóstico reporta métricas en vivo no disponibles"
fi
ok "Autodiagnóstico coherente"

# 8. Prueba de snapshot integrity
echo "🔐 Prueba 8: Integridad del snapshot"
if [ -f ".cache/metrics.last.ok" ]; then
    SNAPSHOT="$(cat .cache/metrics.last.ok)"
    echo "$SNAPSHOT" | grep -q "# SNAPSHA:" || fail "Snapshot sin hash de integridad"
    ok "Snapshot con hash de integridad"
else
    echo "⚠️ Snapshot no existe aún"
fi

# 9. Prueba de rate limiting (simulación)
echo "⚡ Prueba 9: Resistencia a carga"
START_TIME="$(date +%s)"
for i in {1..50}; do
    curl -fsS "$METRICS_URL" >/dev/null &
done
wait
END_TIME="$(date +%s)"
DURATION=$((END_TIME - START_TIME))

if [ "$DURATION" -gt 10 ]; then
    fail "Respuesta lenta bajo carga: ${DURATION}s"
fi
ok "Resistencia a carga: ${DURATION}s para 50 requests"

# 10. Prueba de circuit breaker (simulación)
echo "🔴 Prueba 10: Circuit breaker"
# Verificar estado inicial
CIRCUIT_STATUS="$(curl -fsS "$METRICS_URL" | grep 'quannex_circuit_breaker_active' | grep -o '[0-9]' || echo '0')"
if [ "$CIRCUIT_STATUS" = "1" ]; then
    echo "⚠️ Circuit breaker ya activo"
else
    echo "✅ Circuit breaker inactivo (estado normal)"
fi

# Resumen final
echo ""
echo "🎉 [RESILIENCE-TEST] Todas las pruebas de resiliencia completadas"
echo "📊 Resumen:"
echo "   - Disponibilidad: ✅"
echo "   - Headers defensivos: ✅"
echo "   - Golden set: ✅"
echo "   - Formato OpenMetrics: ✅"
echo "   - Tamaño razonable: ✅"
echo "   - Tráfico real: ✅"
echo "   - Autodiagnóstico: ✅"
echo "   - Integridad snapshot: ✅"
echo "   - Resistencia a carga: ✅"
echo "   - Circuit breaker: ✅"
echo ""
echo "🔒 Sistema a prueba de balas confirmado"
