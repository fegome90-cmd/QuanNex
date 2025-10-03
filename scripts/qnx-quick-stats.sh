#!/bin/bash

# Script de análisis rápido de telemetría QuanNex
# Usa jq para generar estadísticas básicas

set -e

LOG_FILE=".reports/metrics/qnx-events.jsonl"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ No se encontró archivo de telemetría: $LOG_FILE"
    exit 1
fi

echo "📊 Análisis rápido de telemetría QuanNex"
echo "========================================"
echo ""

# Total de eventos
TOTAL_EVENTS=$(wc -l < "$LOG_FILE")
echo "📈 Total de eventos: $TOTAL_EVENTS"
echo ""

# Top componentes globales
echo "🏆 TOP COMPONENTES GLOBALES:"
jq -r 'select(.event=="component_used") | .component' "$LOG_FILE" \
    | sort | uniq -c | sort -nr | head -10 | \
    awk '{printf "   %-30s %s invocaciones\n", $2, $1}'
echo ""

# ¿Orchestrator Top-1 por run?
echo "🎯 ORCHESTRATOR COMO TOP-1 POR RUN:"
ORCHESTRATOR_TOP1=$(jq -sr '
  map(select(.event=="component_used")) 
  | group_by(.run_id) 
  | map({run: .[0].run_id, top: (group_by(.component) | max_by(length)[0].component)})
  | map(select(.top=="orchestrator"))
  | length
' "$LOG_FILE")

TOTAL_RUNS=$(jq -sr '
  map(select(.event=="run_start"))
  | length
' "$LOG_FILE")

if [ "$TOTAL_RUNS" -gt 0 ]; then
    ORCHESTRATOR_SHARE=$((ORCHESTRATOR_TOP1 * 100 / TOTAL_RUNS))
    echo "   Orchestrator es Top-1 en: $ORCHESTRATOR_TOP1 de $TOTAL_RUNS runs ($ORCHESTRATOR_SHARE%)"
else
    echo "   No hay datos de runs disponibles"
fi
echo ""

# Bypass rate y misfires
echo "⚠️ EVENTOS ESPECIALES:"
BYPASS_COUNT=$(jq -r 'select(.event=="cursor_bypass")|.run_id' "$LOG_FILE" | sort -u | wc -l)
MISFIRE_COUNT=$(jq -r 'select(.event=="tool_misfire")|.run_id' "$LOG_FILE" | sort -u | wc -l)
GATE_VIOLATIONS=$(jq -r 'select(.event=="gate_violation")|.run_id' "$LOG_FILE" | sort -u | wc -l)

echo "   Cursor Bypass: $BYPASS_COUNT runs"
echo "   Tool Misfires: $MISFIRE_COUNT runs"
echo "   Gate Violations: $GATE_VIOLATIONS runs"
echo ""

# Runs exitosos vs fallidos
echo "✅ ESTADÍSTICAS DE RUNS:"
SUCCESSFUL_RUNS=$(jq -r 'select(.event=="run_end" and .ok==true)|.run_id' "$LOG_FILE" | sort -u | wc -l)
FAILED_RUNS=$(jq -r 'select(.event=="run_end" and .ok==false)|.run_id' "$LOG_FILE" | sort -u | wc -l)

if [ "$TOTAL_RUNS" -gt 0 ]; then
    SUCCESS_RATE=$((SUCCESSFUL_RUNS * 100 / TOTAL_RUNS))
    echo "   Runs exitosos: $SUCCESSFUL_RUNS de $TOTAL_RUNS ($SUCCESS_RATE%)"
    echo "   Runs fallidos: $FAILED_RUNS de $TOTAL_RUNS"
else
    echo "   No hay datos de runs completados"
fi
echo ""

# Latencia promedio
echo "⏱️ LATENCIA:"
AVG_LATENCY=$(jq -r 'select(.event=="component_used" and .latency_ms)|.latency_ms' "$LOG_FILE" | \
    awk '{sum+=$1; count++} END {if(count>0) print int(sum/count); else print "N/A"}')
echo "   Latencia promedio: ${AVG_LATENCY}ms"
echo ""

# Top intenciones
echo "🎯 TOP INTENCIONES:"
jq -r 'select(.event=="run_start")|.meta.intent' "$LOG_FILE" | \
    sort | uniq -c | sort -nr | head -5 | \
    awk '{printf "   %-20s %s runs\n", $2, $1}'
echo ""

# Umbrales de salud
echo "🏥 SALUD DEL SISTEMA:"
echo "   Orchestrator Share: $ORCHESTRATOR_SHARE% (objetivo: ≥95%)"
if [ "$TOTAL_RUNS" -gt 0 ]; then
    BYPASS_RATE=$((BYPASS_COUNT * 100 / TOTAL_RUNS))
    MISFIRE_RATE=$((MISFIRE_COUNT * 100 / TOTAL_RUNS))
    echo "   Bypass Rate: $BYPASS_RATE% (objetivo: ≤5%)"
    echo "   Tool Misfire Rate: $MISFIRE_RATE% (objetivo: ≤3%)"
    echo "   Success Rate: $SUCCESS_RATE% (objetivo: ≥90%)"
else
    echo "   No hay datos suficientes para calcular métricas de salud"
fi
echo ""

# Alertas
echo "🚨 ALERTAS:"
ALERTS=0

if [ "$ORCHESTRATOR_SHARE" -lt 95 ]; then
    echo "   ⚠️ Orchestrator share bajo ($ORCHESTRATOR_SHARE%)"
    ALERTS=$((ALERTS + 1))
fi

if [ "$TOTAL_RUNS" -gt 0 ]; then
    if [ "$BYPASS_RATE" -gt 5 ]; then
        echo "   ⚠️ Bypass rate alto ($BYPASS_RATE%)"
        ALERTS=$((ALERTS + 1))
    fi
    
    if [ "$MISFIRE_RATE" -gt 3 ]; then
        echo "   ⚠️ Tool misfire rate alto ($MISFIRE_RATE%)"
        ALERTS=$((ALERTS + 1))
    fi
    
    if [ "$SUCCESS_RATE" -lt 90 ]; then
        echo "   ⚠️ Success rate bajo ($SUCCESS_RATE%)"
        ALERTS=$((ALERTS + 1))
    fi
fi

if [ "$ALERTS" -eq 0 ]; then
    echo "   ✅ Sistema saludable - no hay alertas"
else
    echo "   📊 Total de alertas: $ALERTS"
fi
echo ""

echo "📄 Para reporte completo: node scripts/qnx-telemetry-report.mjs"
echo "🌐 Para reporte HTML: abrir .reports/qnx-telemetry-report.html"
