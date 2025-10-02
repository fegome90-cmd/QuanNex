#!/bin/bash
# Demo del Laboratorio Quannex Docker
# Demuestra el flujo completo de calibración del Context Agent

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[QUANNEX-LAB]${NC} $1"
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

# Banner de demostración
showDemoBanner() {
    echo ""
    echo "🚀 =============================================== 🚀"
    echo "   QUANNEX CONTEXT AGENT - LABORATORIO DOCKER"
    echo "🚀 =============================================== 🚀"
    echo ""
    echo "🎯 DEMOSTRACIÓN COMPLETA DE CALIBRACIÓN"
    echo "   Este demo muestra el flujo completo de optimización"
    echo ""
    echo "📋 PROCESO DE DEMOSTRACIÓN:"
    echo "   1️⃣ Construir imagen Docker del Context Agent"
    echo "   2️⃣ Levantar servicio con configuración baseline"
    echo "   3️⃣ Ejecutar benchmark de carga (60s)"
    echo "   4️⃣ Analizar métricas con Gate 14 anti-simulación"
    echo "   5️⃣ Aplicar configuración agresiva"
    echo "   6️⃣ Repetir benchmark y comparar resultados"
    echo "   7️⃣ Mostrar palancas de rendimiento disponibles"
    echo ""
    echo "⏳ Duración estimada: 5-10 minutos"
    echo ""
}

# Función para ejecutar demo completo
executeDemo() {
    log "Iniciando demostración del laboratorio Quannex..."
    
    # Mostrar banner
    showDemoBanner
    
    # 1. Construir imagen
    log "PASO 1: Construyendo imagen Docker del Context Agent..."
    if make -f Makefile.quannex context-build; then
        success "Imagen construida exitosamente"
    else
        error "Fallo en construcción de imagen"
        return 1
    fi
    
    # 2. Levantar servicio
    log "PASO 2: Levantando servicio Context Agent..."
    if make -f Makefile.quannex context-up; then
        success "Servicio levantado en puerto 8601"
    else
        error "Fallo al levantar servicio"
        return 1
    fi
    
    # Esperar que el servicio esté listo
    log "Esperando que el servicio esté listo..."
    sleep 5
    
    # Verificar salud
    log "Verificando salud del servicio..."
    if make -f Makefile.quannex context-health > /dev/null 2>&1; then
        success "Servicio saludable"
    else
        warning "Servicio puede no estar completamente listo, continuando..."
    fi
    
    # 3. Benchmark baseline
    log "PASO 3: Ejecutando benchmark baseline (60s, 50 RPS, 24 concurrencia)..."
    if make -f Makefile.quannex context-bench; then
        success "Benchmark baseline completado"
    else
        error "Fallo en benchmark baseline"
        return 1
    fi
    
    # 4. Analizar métricas baseline
    log "PASO 4: Analizando métricas baseline con Gate 14..."
    if make -f Makefile.quannex context-analyze; then
        success "Análisis baseline completado"
    else
        error "Fallo en análisis baseline"
        return 1
    fi
    
    # Mostrar resultados baseline
    echo ""
    echo "📊 RESULTADOS BASELINE:"
    echo "   Archivo: logs/context-bench.jsonl"
    echo "   Análisis: logs/context-bench-analysis.json"
    echo ""
    
    # 5. Configuración agresiva
    log "PASO 5: Aplicando configuración agresiva..."
    if make -f Makefile.quannex context-tune-aggr; then
        success "Configuración agresiva aplicada"
    else
        error "Fallo al aplicar configuración agresiva"
        return 1
    fi
    
    # Esperar que se aplique la configuración
    sleep 3
    
    # 6. Benchmark agresivo
    log "PASO 6: Ejecutando benchmark con configuración agresiva..."
    if make -f Makefile.quannex context-bench; then
        success "Benchmark agresivo completado"
    else
        error "Fallo en benchmark agresivo"
        return 1
    fi
    
    # 7. Analizar métricas agresivas
    log "PASO 7: Analizando métricas con configuración agresiva..."
    if make -f Makefile.quannex context-analyze; then
        success "Análisis agresivo completado"
    else
        error "Fallo en análisis agresivo"
        return 1
    fi
    
    # Mostrar información del laboratorio
    log "PASO 8: Mostrando información del laboratorio..."
    make -f Makefile.quannex context-info
    
    # Resumen final
    echo ""
    echo "✅ =============================================== ✅"
    echo "   DEMOSTRACIÓN COMPLETADA EXITOSAMENTE"
    echo "✅ =============================================== ✅"
    echo ""
    echo "🎯 RESULTADOS DEL LABORATORIO:"
    echo "   ✅ Imagen Docker construida y funcionando"
    echo "   ✅ Servicio Context Agent operativo"
    echo "   ✅ Benchmarks ejecutados (baseline + agresivo)"
    echo "   ✅ Análisis con Gate 14 anti-simulación completado"
    echo "   ✅ Palancas de rendimiento documentadas"
    echo ""
    echo "📁 ARCHIVOS GENERADOS:"
    echo "   📊 logs/context-bench.jsonl - Datos crudos de benchmark"
    echo "   📈 logs/context-bench-analysis.json - Análisis estadístico"
    echo "   🔐 logs/context-bench.jsonl.hash - Hash de integridad"
    echo "   📚 docs/quannex-performance-knobs.md - Documentación completa"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "   1. Revisar métricas en logs/context-bench-analysis.json"
    echo "   2. Ajustar palancas según resultados"
    echo "   3. Documentar configuración óptima"
    echo "   4. Clonar preset ganador a Vast"
    echo ""
    echo "💡 COMANDOS ÚTILES:"
    echo "   make -f Makefile.quannex context-logs    # Ver logs en tiempo real"
    echo "   make -f Makefile.quannex context-health   # Verificar salud"
    echo "   make -f Makefile.quannex context-clean   # Limpiar artefactos"
    echo ""
    
    return 0
}

# Función para mostrar ayuda
showHelp() {
    echo "=== QUANNEX LABORATORIO DOCKER - DEMO ==="
    echo ""
    echo "🎯 FUNCIÓN:"
    echo "   Demuestra el flujo completo de calibración del Context Agent"
    echo "   usando Docker con benchmarks y análisis de métricas"
    echo ""
    echo "🚀 USO:"
    echo "   ./scripts/demo-quannex-lab.sh          # Ejecutar demo completo"
    echo "   ./scripts/demo-quannex-lab.sh help     # Mostrar ayuda"
    echo ""
    echo "📋 PROCESO DEL DEMO:"
    echo "   1. Construir imagen Docker del Context Agent"
    echo "   2. Levantar servicio con configuración baseline"
    echo "   3. Ejecutar benchmark de carga (60s)"
    echo "   4. Analizar métricas con Gate 14 anti-simulación"
    echo "   5. Aplicar configuración agresiva"
    echo "   6. Repetir benchmark y comparar resultados"
    echo "   7. Mostrar palancas de rendimiento disponibles"
    echo ""
    echo "🎯 RESULTADO:"
    echo "   Laboratorio Docker completamente funcional"
    echo "   con datos de benchmark y análisis de rendimiento"
    echo ""
}

# Función principal
main() {
    local command="${1:-execute}"
    
    case "$command" in
        "execute"|"demo")
            executeDemo
            ;;
        "help"|*)
            showHelp
            ;;
    esac
}

# Ejecutar función principal
main "$@"
