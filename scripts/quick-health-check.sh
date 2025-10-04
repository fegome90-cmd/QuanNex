#!/usr/bin/env bash
set -e

# Quick Health Check para TaskDB
# Uso: ./scripts/quick-health-check.sh

echo "🩺 TaskDB Quick Health Check - $(date)"
echo "====================================="

# 1. Endpoint de métricas
echo "📡 Verificando endpoint de métricas..."
if curl -s http://localhost:9464/metrics | head -n 5; then
    echo "✅ Endpoint de métricas OK"
else
    echo "❌ Endpoint de métricas no disponible"
fi

echo ""

# 2. Baseline
echo "📋 Verificando baseline..."
if [ -f "reports/TASKDB-BASELINE.md" ]; then
    echo "✅ Baseline encontrado:"
    sed -n '1,60p' reports/TASKDB-BASELINE.md
else
    echo "❌ Baseline no encontrado"
fi

echo ""

# 3. Gate de instrumentación
echo "🔍 Verificando gate de instrumentación..."
if npm run ci:require-taskdb; then
    echo "✅ Gate de instrumentación OK"
else
    echo "❌ Gate de instrumentación falló"
fi

echo ""

# 4. Test de instrumentación
echo "🧪 Verificando test de instrumentación..."
if npm run test:instrumentation; then
    echo "✅ Test de instrumentación OK"
else
    echo "❌ Test de instrumentación falló"
fi

echo ""

# 5. Health check completo
echo "🩺 Health check completo..."
npm run taskdb:health

echo ""
echo "✅ Quick Health Check completado"
