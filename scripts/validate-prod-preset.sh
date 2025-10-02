#!/bin/bash
# Validación del Preset de Producción Quannex
# Valida que el preset cumpla con los objetivos de rendimiento

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[VALIDATE-PROD]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
cd "$PROJECT_ROOT"

# Objetivos de rendimiento del preset de producción
P95_TARGET=100
P99_TARGET=150
SUCCESS_RATE_TARGET=99.5
TOKENS_TARGET=600
RPS_TARGET=40

# Función para validar métricas
validateMetrics() {
    local analysis_file="$1"
    
    if [ ! -f "$analysis_file" ]; then
        error "Archivo de análisis no encontrado: $analysis_file"
        return 1
    fi
    
    # Extraer métricas del JSON
    local p95=$(jq -r '.p95_ms' "$analysis_file")
    local p99=$(jq -r '.p99_ms' "$analysis_file")
    local success_rate=$(jq -r '.ok / .n * 100' "$analysis_file")
    local tokens_out=$(jq -r '.tokens_out_avg' "$analysis_file")
    local rps=$(jq -r '.rps_real' "$analysis_file")
    
    log "Validando métricas del preset de producción..."
    echo ""
    echo "📊 MÉTRICAS OBTENIDAS:"
    echo "   P95: ${p95}ms (objetivo: ≤${P95_TARGET}ms)"
    echo "   P99: ${p99}ms (objetivo: ≤${P99_TARGET}ms)"
    echo "   Éxito: ${success_rate}% (objetivo: ≥${SUCCESS_RATE_TARGET}%)"
    echo "   Tokens: ${tokens_out} (objetivo: ≤${TOKENS_TARGET})"
    echo "   RPS: ${rps} (objetivo: ≥${RPS_TARGET})"
    echo ""
    
    local validation_passed=true
    
    # Validar P95
    if (( $(echo "$p95 <= $P95_TARGET" | bc -l) )); then
        success "✅ P95: ${p95}ms ≤ ${P95_TARGET}ms"
    else
        error "❌ P95: ${p95}ms > ${P95_TARGET}ms"
        validation_passed=false
    fi
    
    # Validar P99
    if (( $(echo "$p99 <= $P99_TARGET" | bc -l) )); then
        success "✅ P99: ${p99}ms ≤ ${P99_TARGET}ms"
    else
        error "❌ P99: ${p99}ms > ${P99_TARGET}ms"
        validation_passed=false
    fi
    
    # Validar tasa de éxito
    if (( $(echo "$success_rate >= $SUCCESS_RATE_TARGET" | bc -l) )); then
        success "✅ Éxito: ${success_rate}% ≥ ${SUCCESS_RATE_TARGET}%"
    else
        error "❌ Éxito: ${success_rate}% < ${SUCCESS_RATE_TARGET}%"
        validation_passed=false
    fi
    
    # Validar tokens
    if (( $(echo "$tokens_out <= $TOKENS_TARGET" | bc -l) )); then
        success "✅ Tokens: ${tokens_out} ≤ ${TOKENS_TARGET}"
    else
        error "❌ Tokens: ${tokens_out} > ${TOKENS_TARGET}"
        validation_passed=false
    fi
    
    # Validar RPS
    if (( $(echo "$rps >= $RPS_TARGET" | bc -l) )); then
        success "✅ RPS: ${rps} ≥ ${RPS_TARGET}"
    else
        error "❌ RPS: ${rps} < ${RPS_TARGET}"
        validation_passed=false
    fi
    
    echo ""
    
    if [ "$validation_passed" = true ]; then
        success "🎉 PRESET DE PRODUCCIÓN VALIDADO EXITOSAMENTE"
        echo ""
        echo "🏆 CALIFICACIÓN: A+"
        echo "✅ Todos los objetivos de rendimiento cumplidos"
        echo "🚀 Listo para despliegue en producción"
        return 0
    else
        error "❌ PRESET DE PRODUCCIÓN NO CUMPLE OBJETIVOS"
        echo ""
        echo "🔧 RECOMENDACIONES:"
        echo "   - Ajustar palancas de rendimiento"
        echo "   - Revisar configuración de recursos"
        echo "   - Ejecutar benchmark más largo"
        return 1
    fi
}

# Función para ejecutar validación completa
executeValidation() {
    log "Iniciando validación del preset de producción..."
    
    echo ""
    echo "🏭 =============================================== 🏭"
    echo "   VALIDACIÓN PRESET DE PRODUCCIÓN QUANNEX"
    echo "🏭 =============================================== 🏭"
    echo ""
    echo "🎯 OBJETIVOS DE VALIDACIÓN:"
    echo "   P95 ≤ ${P95_TARGET}ms"
    echo "   P99 ≤ ${P99_TARGET}ms"
    echo "   Tasa de éxito ≥ ${SUCCESS_RATE_TARGET}%"
    echo "   Tokens salida ≤ ${TOKENS_TARGET}"
    echo "   RPS ≥ ${RPS_TARGET}"
    echo ""
    
    # 1. Aplicar preset de producción
    log "PASO 1: Aplicando preset de producción..."
    if make -f Makefile.quannex context-tune-prod; then
        success "Preset de producción aplicado"
    else
        error "Fallo al aplicar preset de producción"
        return 1
    fi
    
    # Esperar que se aplique la configuración
    sleep 5
    
    # 2. Ejecutar benchmark
    log "PASO 2: Ejecutando benchmark de validación (60s)..."
    if make -f Makefile.quannex context-bench; then
        success "Benchmark completado"
    else
        error "Fallo en benchmark"
        return 1
    fi
    
    # 3. Analizar métricas
    log "PASO 3: Analizando métricas..."
    if make -f Makefile.quannex context-analyze; then
        success "Análisis completado"
    else
        error "Fallo en análisis"
        return 1
    fi
    
    # 4. Validar métricas
    log "PASO 4: Validando objetivos de rendimiento..."
    validateMetrics "logs/context-bench-analysis.json"
    
    return $?
}

# Función para mostrar ayuda
showHelp() {
    echo "=== VALIDACIÓN PRESET DE PRODUCCIÓN QUANNEX ==="
    echo ""
    echo "🎯 FUNCIÓN:"
    echo "   Valida que el preset de producción cumpla con los objetivos"
    echo "   de rendimiento establecidos para despliegue en producción"
    echo ""
    echo "🚀 USO:"
    echo "   ./scripts/validate-prod-preset.sh          # Ejecutar validación completa"
    echo "   ./scripts/validate-prod-preset.sh help     # Mostrar ayuda"
    echo ""
    echo "📋 PROCESO DE VALIDACIÓN:"
    echo "   1. Aplicar preset de producción optimizado"
    echo "   2. Ejecutar benchmark de validación (60s)"
    echo "   3. Analizar métricas obtenidas"
    echo "   4. Validar objetivos de rendimiento"
    echo ""
    echo "🎯 OBJETIVOS DE VALIDACIÓN:"
    echo "   P95 ≤ 100ms"
    echo "   P99 ≤ 150ms"
    echo "   Tasa de éxito ≥ 99.5%"
    echo "   Tokens salida ≤ 600"
    echo "   RPS ≥ 40"
    echo ""
    echo "✅ RESULTADO:"
    echo "   Preset validado y listo para producción"
    echo ""
}

# Función principal
main() {
    local command="${1:-execute}"
    
    case "$command" in
        "execute"|"validate")
            executeValidation
            ;;
        "help"|*)
            showHelp
            ;;
    esac
}

# Ejecutar función principal
main "$@"
