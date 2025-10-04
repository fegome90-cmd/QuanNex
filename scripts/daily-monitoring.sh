#!/usr/bin/env bash
set -e

# Script de monitoreo diario para TaskDB
# Uso: ./scripts/daily-monitoring.sh

echo "📡 TaskDB Daily Monitoring - $(date)"
echo "=================================="

# 1. Baseline diario
echo "📋 Generando baseline diario..."
npm run taskdb:baseline

# 2. Snapshot de métricas
echo "📸 Guardando snapshot de métricas..."
DATE=$(date +%F)
METRICS_URL="http://localhost:9464/metrics"
SNAPSHOT_PATH="reports/metrics-${DATE}.prom"

if curl -s "$METRICS_URL" > "$SNAPSHOT_PATH"; then
    echo "✅ Snapshot guardado: $SNAPSHOT_PATH"
else
    echo "⚠️ Error guardando snapshot"
fi

# 3. Verificar umbrales
echo "🚨 Verificando umbrales..."
if npm run alert:thresholds; then
    echo "✅ Todos los umbrales OK"
else
    echo "⚠️ Umbral excedido — revisar dashboard"
    # Opcional: enviar notificación
fi

# 4. Health check rápido
echo "🩺 Health check rápido..."
npm run taskdb:health

echo "✅ Monitoreo diario completado"
