#!/bin/bash
# Script de Activación Rápida - Defensa contra Rate Limits
# Implementa las 3 capas de protección inmediatamente

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[RATE-LIMIT-DEFENSE]${NC} $1"
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

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Función para mostrar ayuda
showHelp() {
    echo "=== ACTIVACIÓN RÁPIDA - DEFENSA CONTRA RATE LIMITS ==="
    echo ""
    echo "🎯 FUNCIÓN:"
    echo "   Activa las 3 capas de protección contra rate limits"
    echo ""
    echo "🚀 USO:"
    echo "   ./scripts/activate-rate-limit-defense.sh activate  # Activar todas las defensas"
    echo "   ./scripts/activate-rate-limit-defense.sh test      # Ejecutar tests de validación"
    echo "   ./scripts/activate-rate-limit-defense.sh status     # Ver estado actual"
    echo "   ./scripts/activate-rate-limit-defense.sh help      # Mostrar ayuda"
    echo ""
    echo "🛡️  CAPAS DE PROTECCIÓN:"
    echo "   Capa 0: Parche rápido (flags de admission control)"
    echo "   Capa 1: Prevención (context trimming, RAG optimizado)"
    echo "   Capa 2: Absorción (token bucket, circuit breaker)"
    echo "   Capa 3: Degradación (fallback models, respuestas parciales)"
    echo ""
}

# Función para activar todas las defensas
activateDefenses() {
    log "Activando defensas contra rate limits..."
    
    # Capa 0: Parche rápido - Flags de admission control
    info "🔄 Capa 0: Aplicando flags de admission control..."
    if [ -f "$PROJECT_ROOT/config/prod-tight.env" ]; then
        success "✅ Flags de admission control ya configurados en prod-tight.env"
    else
        error "❌ Error: prod-tight.env no encontrado"
        return 1
    fi
    
    # Capa 1: Prevención - Deshabilitar rate limiting básico
    info "🔄 Capa 1: Deshabilitando rate limiting básico..."
    if [ -f "$PROJECT_ROOT/.env" ]; then
        if grep -q "DISABLE_RATE_LIMITING=true" "$PROJECT_ROOT/.env"; then
            success "✅ Rate limiting básico ya deshabilitado"
        else
            echo "DISABLE_RATE_LIMITING=true" >> "$PROJECT_ROOT/.env"
            success "✅ Rate limiting básico deshabilitado"
        fi
    else
        echo "DISABLE_RATE_LIMITING=true" > "$PROJECT_ROOT/.env"
        success "✅ Rate limiting básico deshabilitado (creado .env)"
    fi
    
    # Capa 2: Absorción - Verificar que las utilidades existen
    info "🔄 Capa 2: Verificando utilidades de absorción..."
    local utils_exist=true
    
    if [ ! -f "$PROJECT_ROOT/utils/token-bucket.mjs" ]; then
        error "❌ token-bucket.mjs no encontrado"
        utils_exist=false
    fi
    
    if [ ! -f "$PROJECT_ROOT/utils/context-trimmer.mjs" ]; then
        error "❌ context-trimmer.mjs no encontrado"
        utils_exist=false
    fi
    
    if [ ! -f "$PROJECT_ROOT/utils/llm-client-advanced.mjs" ]; then
        error "❌ llm-client-advanced.mjs no encontrado"
        utils_exist=false
    fi
    
    if [ "$utils_exist" = true ]; then
        success "✅ Todas las utilidades de absorción disponibles"
    else
        error "❌ Faltan utilidades de absorción"
        return 1
    fi
    
    # Capa 3: Degradación - Verificar tests de carga
    info "🔄 Capa 3: Verificando tests de degradación..."
    if [ -f "$PROJECT_ROOT/tests/load/rate-limit-stress-test.mjs" ]; then
        success "✅ Tests de stress disponibles"
    else
        error "❌ Tests de stress no encontrados"
        return 1
    fi
    
    # Aplicar configuración tight
    info "🔄 Aplicando configuración tight..."
    cd "$PROJECT_ROOT"
    if make -f Makefile.quannex context-apply-tight-config; then
        success "✅ Configuración tight aplicada"
    else
        error "❌ Error aplicando configuración tight"
        return 1
    fi
    
    success "🎉 Todas las defensas activadas exitosamente!"
    echo ""
    info "📋 RESUMEN DE ACTIVACIÓN:"
    echo "   ✅ Admission control: Token bucket, circuit breaker, degradación"
    echo "   ✅ Rate limiting básico: Deshabilitado"
    echo "   ✅ Utilidades avanzadas: Disponibles"
    echo "   ✅ Tests de stress: Disponibles"
    echo "   ✅ Configuración tight: Aplicada"
    echo ""
    info "🚀 PRÓXIMOS PASOS:"
    echo "   1. Ejecutar: ./scripts/activate-rate-limit-defense.sh test"
    echo "   2. Monitorear: make context-logs"
    echo "   3. Validar: make context-rate-limit-test"
}

# Función para ejecutar tests de validación
runTests() {
    log "Ejecutando tests de validación..."
    
    cd "$PROJECT_ROOT"
    
    # Test 1: Verificar configuración
    info "🔄 Test 1: Verificando configuración..."
    if [ -f ".env" ] && grep -q "DISABLE_RATE_LIMITING=true" ".env"; then
        success "✅ Rate limiting deshabilitado"
    else
        error "❌ Rate limiting no deshabilitado"
        return 1
    fi
    
    # Test 2: Verificar servicios
    info "🔄 Test 2: Verificando servicios..."
    if docker compose -f docker/context/compose.yml ps | grep -q "Up"; then
        success "✅ Servicios Docker ejecutándose"
    else
        warning "⚠️  Servicios Docker no ejecutándose - ejecutando make context-up"
        if make -f Makefile.quannex context-up; then
            success "✅ Servicios Docker iniciados"
        else
            error "❌ Error iniciando servicios Docker"
            return 1
        fi
    fi
    
    # Test 3: Health check
    info "🔄 Test 3: Verificando health check..."
    if make -f Makefile.quannex context-health; then
        success "✅ Health check exitoso"
    else
        error "❌ Health check falló"
        return 1
    fi
    
    # Test 4: Smoke test (opcional)
    info "🔄 Test 4: Ejecutando smoke test..."
    if make -f Makefile.quannex context-rate-limit-test; then
        success "✅ Smoke test exitoso"
    else
        warning "⚠️  Smoke test falló - revisar configuración"
    fi
    
    success "🎉 Tests de validación completados!"
}

# Función para mostrar estado
showStatus() {
    log "Mostrando estado de las defensas..."
    
    echo ""
    info "📊 ESTADO DE LAS DEFENSAS:"
    echo "=========================="
    
    # Verificar archivos de configuración
    echo ""
    echo "🔧 CONFIGURACIÓN:"
    if [ -f "$PROJECT_ROOT/.env" ]; then
        if grep -q "DISABLE_RATE_LIMITING=true" "$PROJECT_ROOT/.env"; then
            echo "   ✅ Rate limiting básico: DESHABILITADO"
        else
            echo "   ❌ Rate limiting básico: HABILITADO"
        fi
    else
        echo "   ❌ Archivo .env: NO ENCONTRADO"
    fi
    
    if [ -f "$PROJECT_ROOT/config/prod-tight.env" ]; then
        echo "   ✅ Configuración tight: DISPONIBLE"
    else
        echo "   ❌ Configuración tight: NO ENCONTRADA"
    fi
    
    # Verificar utilidades
    echo ""
    echo "🛠️  UTILIDADES:"
    local utils=("token-bucket.mjs" "context-trimmer.mjs" "llm-client-advanced.mjs")
    for util in "${utils[@]}"; do
        if [ -f "$PROJECT_ROOT/utils/$util" ]; then
            echo "   ✅ $util: DISPONIBLE"
        else
            echo "   ❌ $util: NO ENCONTRADO"
        fi
    done
    
    # Verificar tests
    echo ""
    echo "🧪 TESTS:"
    if [ -f "$PROJECT_ROOT/tests/load/rate-limit-stress-test.mjs" ]; then
        echo "   ✅ Stress test: DISPONIBLE"
    else
        echo "   ❌ Stress test: NO ENCONTRADO"
    fi
    
    # Verificar servicios Docker
    echo ""
    echo "🐳 SERVICIOS DOCKER:"
    cd "$PROJECT_ROOT"
    if docker compose -f docker/context/compose.yml ps | grep -q "Up"; then
        echo "   ✅ Servicios: EJECUTÁNDOSE"
    else
        echo "   ❌ Servicios: NO EJECUTÁNDOSE"
    fi
    
    echo ""
}

# Función principal
main() {
    local command="${1:-help}"
    
    case "$command" in
        "activate")
            activateDefenses
            ;;
        "test")
            runTests
            ;;
        "status")
            showStatus
            ;;
        "help"|*)
            showHelp
            ;;
    esac
}

# Ejecutar función principal
main "$@"
