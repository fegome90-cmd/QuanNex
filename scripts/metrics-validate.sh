#!/usr/bin/env bash
set -euo pipefail

# Script de validación de métricas QuanNex
# Valida que el endpoint /metrics devuelva métricas válidas

URL="${1:-http://localhost:3000/metrics}"
TIMEOUT="${2:-5}"

echo "🔍 [METRICS-VALIDATE] Validando endpoint: $URL"

# Función de error con código de salida
fail() {
    echo "❌ [METRICS-VALIDATE] $1"
    exit $2
}

# Función de éxito
ok() {
    echo "✅ [METRICS-VALIDATE] $1"
}

# 1. Fetch básico con timeout
echo "📡 Obteniendo métricas..."
PAYLOAD="$(curl -fsS --max-time $TIMEOUT "$URL" 2>/dev/null)" || fail "No se pudo obtener métricas del endpoint" 1

# 2. Validaciones básicas de formato OpenMetrics
echo "🔍 Validando formato OpenMetrics..."

# Debe tener HELP
echo "$PAYLOAD" | grep -q '# HELP' || fail "Falta # HELP en métricas" 2

# Debe tener TYPE  
echo "$PAYLOAD" | grep -q '# TYPE' || fail "Falta # TYPE en métricas" 3

# No debe tener NaN/Infinity (+Inf es válido en Prometheus)
echo "$PAYLOAD" | grep -E -i 'nan|infinity' && fail "Métricas contienen NaN/Infinity" 4

# 3. Validaciones específicas de QuanNex
echo "🎯 Validando métricas de negocio QuanNex..."

# Debe tener métrica de negocio quannex_gate_status
echo "$PAYLOAD" | grep -q '^quannex_gate_status' || fail "Falta métrica de negocio quannex_gate_status" 5

# Debe tener métricas del sistema
echo "$PAYLOAD" | grep -q 'qn_system_uptime_seconds' || fail "Falta métrica del sistema qn_system_uptime_seconds" 6

# 4. Validaciones de estructura
echo "📊 Validando estructura de métricas..."

# Contar métricas
HELP_COUNT=$(echo "$PAYLOAD" | grep -c '# HELP' || echo "0")
TYPE_COUNT=$(echo "$PAYLOAD" | grep -c '# TYPE' || echo "0")

if [ "$HELP_COUNT" -lt 3 ]; then
    fail "Muy pocas métricas HELP encontradas: $HELP_COUNT" 7
fi

if [ "$TYPE_COUNT" -lt 3 ]; then
    fail "Muy pocas métricas TYPE encontradas: $TYPE_COUNT" 8
fi

# 5. Validar que no esté vacío
PAYLOAD_SIZE=${#PAYLOAD}
if [ "$PAYLOAD_SIZE" -lt 100 ]; then
    fail "Payload muy pequeño: $PAYLOAD_SIZE bytes" 9
fi

# 6. Verificar headers de respuesta
echo "📋 Verificando headers de respuesta..."
HEADERS="$(curl -fsS --max-time $TIMEOUT -I "$URL" 2>/dev/null)"

# Debe tener Content-Type correcto
echo "$HEADERS" | grep -q "Content-Type.*text/plain" || fail "Content-Type incorrecto" 10

# Debe tener Cache-Control
echo "$HEADERS" | grep -q "Cache-Control.*no-store" || fail "Cache-Control incorrecto" 11

# 7. Verificar fuente de métricas
echo "🔍 Verificando fuente de métricas..."
SOURCE="$(echo "$HEADERS" | grep -i "X-Metrics-Source" | cut -d: -f2 | tr -d ' \r\n' || echo "unknown")"

case "$SOURCE" in
    "live")
        ok "Métricas en vivo funcionando correctamente"
        ;;
    "snapshot")
        echo "⚠️ [METRICS-VALIDATE] Usando snapshot de fallback"
        ;;
    "minimal")
        echo "⚠️ [METRICS-VALIDATE] Usando fallback mínimo"
        ;;
    *)
        echo "⚠️ [METRICS-VALIDATE] Fuente desconocida: $SOURCE"
        ;;
esac

# 8. Resumen final
echo "📊 Resumen de validación:"
echo "   - Métricas HELP: $HELP_COUNT"
echo "   - Métricas TYPE: $TYPE_COUNT" 
echo "   - Tamaño payload: $PAYLOAD_SIZE bytes"
echo "   - Fuente: $SOURCE"

# 9. Validación de integridad (opcional)
if echo "$PAYLOAD" | grep -q "# SNAPSHA:"; then
    ok "Snapshot firmado detectado"
else
    echo "ℹ️ [METRICS-VALIDATE] No hay snapshot firmado"
fi

ok "Validación completada exitosamente"
echo "🎉 [METRICS-VALIDATE] Todas las validaciones pasaron"
