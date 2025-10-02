#!/usr/bin/env bash
# Verificador rápido de gates básicos
# Ejecuta los gates más críticos en secuencia

set -euo pipefail

echo "⚡ Verificación rápida de gates básicos MCP QuanNex"
echo "=================================================="

ERRORS=0
START_TIME=$(date +%s)

# Función para ejecutar gate con timeout
run_gate() {
    local name="$1"
    local command="$2"
    local timeout="${3:-60}"
    
    echo ""
    echo "🔧 Ejecutando: $name"
    echo "   Comando: $command"
    echo "   Timeout: ${timeout}s"
    
    local start_time=$(date +%s)
    
    if timeout $timeout bash -c "$command" 2>/dev/null; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "   ✅ $name completado en ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "   ❌ $name falló en ${duration}s"
        return 1
    fi
}

# Gates básicos críticos
echo "🚦 Ejecutando gates básicos críticos..."

# Gate 0: Layout
if ! run_gate "Gate 0: Layout" "bash tools/find-broken-imports.sh && node tools/registry-sanity.js" 30; then
    ((ERRORS++))
fi

# Gate 1: Contracts
if ! run_gate "Gate 1: Contracts" "npm run quannex:contracts" 60; then
    ((ERRORS++))
fi

# Gate 4: Orchestrator
if ! run_gate "Gate 4: Orchestrator" "npm run quannex:smoke" 120; then
    ((ERRORS++))
fi

# Gate 7: Security
if ! run_gate "Gate 7: Security" "node tools/security-gate.js" 120; then
    ((ERRORS++))
fi

# Gate 9: Resilience
if ! run_gate "Gate 9: Resilience" "node tools/resilience-gate.js" 120; then
    ((ERRORS++))
fi

# Gate 10: MCP Enforcement
if ! run_gate "Gate 10: MCP Enforcement" "bash ops/audit.sh" 60; then
    ((ERRORS++))
fi

# Gate 11: Performance
if ! run_gate "Gate 11: Performance" "npm run ci-quannex-perf" 180; then
    ((ERRORS++))
fi

# Resumen
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo ""
echo "📊 Resumen de verificación rápida:"
echo "   Tiempo total: ${TOTAL_DURATION}s"
echo "   Errores: $ERRORS"

if [ $ERRORS -eq 0 ]; then
    echo "✅ Todos los gates básicos pasaron"
    echo "🟢 Sistema listo para operación"
    exit 0
else
    echo "❌ $ERRORS gates fallaron"
    echo "🔴 Sistema requiere atención"
    exit 1
fi
