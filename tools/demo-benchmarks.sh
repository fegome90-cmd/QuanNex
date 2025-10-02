#!/bin/bash

# 🚀 DEMO BENCHMARKS - SISTEMA MCP
# Script de demostración de todos los benchmarks disponibles

set -e

echo "🚀 DEMO BENCHMARKS - SISTEMA MCP"
echo "=================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "tools/smart-benchmark.mjs" ]; then
    echo "❌ Error: Ejecutar desde el directorio raíz del proyecto"
    exit 1
fi

echo "📊 1. BENCHMARK RÁPIDO - Agente Context"
echo "---------------------------------------"
node tools/quick-benchmark.mjs --agent context --samples 5
echo ""

echo "📊 2. BENCHMARK INTELIGENTE - Todos los Agentes"
echo "-----------------------------------------------"
node tools/smart-benchmark.mjs --agent all --samples 5
echo ""

echo "📊 3. BENCHMARK EN TIEMPO REAL (10 segundos)"
echo "---------------------------------------------"
echo "💡 Ejecutando benchmark en tiempo real por 10 segundos..."
echo "   Presiona Ctrl+C para detener antes"
echo ""

# Ejecutar benchmark en tiempo real por 10 segundos
timeout 10s node tools/realtime-benchmark.mjs --agent context --interval 1000 --duration 10000 --samples 3 2>/dev/null || echo "⏰ Benchmark en tiempo real completado"
echo ""

echo "📊 4. MONITOR CONTINUO (5 segundos)"
echo "------------------------------------"
echo "💡 Iniciando monitor continuo por 5 segundos..."
echo "   Esto simula un monitor de producción"
echo ""

# Ejecutar monitor continuo por 5 segundos
timeout 5s node tools/continuous-monitor.mjs --interval 2000 --agents context 2>/dev/null || echo "⏰ Monitor continuo completado"
echo ""

echo "📊 5. SERVIDOR DE MÉTRICAS"
echo "--------------------------"
echo "💡 Para usar el dashboard web:"
echo "   1. Ejecutar: node tools/metrics-server.mjs"
echo "   2. Abrir: http://localhost:3000/dashboard"
echo "   3. En otra terminal: node tools/continuous-monitor.mjs"
echo ""

echo "📈 RESUMEN DE HERRAMIENTAS DISPONIBLES:"
echo "======================================="
echo ""
echo "🔧 BENCHMARKS:"
echo "   • quick-benchmark.mjs     - Benchmark rápido y simple"
echo "   • smart-benchmark.mjs     - Benchmark inteligente con payloads correctos"
echo "   • realtime-benchmark.mjs  - Benchmark en tiempo real con visualización"
echo ""
echo "📊 MONITOREO:"
echo "   • continuous-monitor.mjs  - Monitor continuo con alertas"
echo "   • metrics-server.mjs      - Servidor HTTP para dashboard"
echo "   • dashboard.html          - Dashboard web en tiempo real"
echo ""
echo "🎯 EJEMPLOS DE USO:"
echo ""
echo "   # Benchmark rápido"
echo "   node tools/quick-benchmark.mjs --agent context --samples 20"
echo ""
echo "   # Benchmark inteligente de todos los agentes"
echo "   node tools/smart-benchmark.mjs --agent all --samples 10"
echo ""
echo "   # Benchmark en tiempo real por 30 segundos"
echo "   node tools/realtime-benchmark.mjs --agent context --duration 30000"
echo ""
echo "   # Monitor continuo con alertas"
echo "   node tools/continuous-monitor.mjs --interval 5000"
echo ""
echo "   # Dashboard web (en terminal separada)"
echo "   node tools/metrics-server.mjs --port 3000"
echo ""

echo "✅ DEMO COMPLETADO"
echo "=================="
echo ""
echo "💡 Próximos pasos:"
echo "   1. Ejecutar benchmarks específicos según necesidades"
echo "   2. Configurar monitor continuo para producción"
echo "   3. Usar dashboard web para monitoreo visual"
echo "   4. Configurar alertas automáticas"
echo ""
