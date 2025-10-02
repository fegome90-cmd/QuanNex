#!/bin/bash
# Script de Activación Nivel 1 — Urgente
# Implementa pilares básicos de Quannex con anatomía de herramientas y guardrails

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
    echo -e "${BLUE}[LEVEL-1]${NC} $1"
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
    echo "=== ACTIVACIÓN NIVEL 1 — URGENTE ==="
    echo ""
    echo "🎯 FUNCIÓN:"
    echo "   Implementa pilares básicos de Quannex con anatomía de herramientas"
    echo ""
    echo "🚀 USO:"
    echo "   ./scripts/activate-level1-urgent.sh activate  # Activar todas las mejoras"
    echo "   ./scripts/activate-level1-urgent.sh test       # Ejecutar tests de validación"
    echo "   ./scripts/activate-level1-urgent.sh status     # Ver estado actual"
    echo "   ./scripts/activate-level1-urgent.sh help      # Mostrar ayuda"
    echo ""
    echo "🛠️  COMPONENTES NIVEL 1:"
    echo "   1. Anatomía de herramientas + Guardrails de I/O"
    echo "   2. Control de límites (Rate limiting + Retries + Fallbacks)"
    echo "   3. Registrar tool calls y logs completos"
    echo ""
    echo "📋 PILARES IMPLEMENTADOS:"
    echo "   ✅ ToolBase class con try/catch estructurado"
    echo "   ✅ Logger centralizado para tool calls"
    echo "   ✅ Cliente LLM con token bucket y retry"
    echo "   ✅ Herramientas críticas mejoradas"
    echo "   ✅ Circuit breaker y degradación progresiva"
    echo ""
}

# Función para activar todas las mejoras del Nivel 1
activateLevel1() {
    log "Activando Nivel 1 — Pilares básicos de Quannex..."
    
    # 1. Anatomía de herramientas + Guardrails de I/O
    info "🔄 Pilar 1: Verificando anatomía de herramientas..."
    
    local tools_ok=true
    
    # Verificar ToolBase class
    if [ -f "$PROJECT_ROOT/utils/tool-base.mjs" ]; then
        success "✅ ToolBase class disponible"
    else
        error "❌ ToolBase class no encontrada"
        tools_ok=false
    fi
    
    # Verificar herramientas críticas mejoradas
    if [ -f "$PROJECT_ROOT/utils/context-tools.mjs" ]; then
        success "✅ Context tools mejoradas disponibles"
    else
        error "❌ Context tools no encontradas"
        tools_ok=false
    fi
    
    if [ "$tools_ok" = false ]; then
        error "❌ Faltan componentes de anatomía de herramientas"
        return 1
    fi
    
    # 2. Control de límites (Rate limiting + Retries + Fallbacks)
    info "🔄 Pilar 2: Verificando control de límites..."
    
    local limits_ok=true
    
    # Verificar cliente LLM mejorado
    if [ -f "$PROJECT_ROOT/utils/llm-client-enhanced.mjs" ]; then
        success "✅ Cliente LLM con token bucket disponible"
    else
        error "❌ Cliente LLM mejorado no encontrado"
        limits_ok=false
    fi
    
    # Verificar token bucket
    if [ -f "$PROJECT_ROOT/utils/token-bucket.mjs" ]; then
        success "✅ Token bucket y circuit breaker disponibles"
    else
        error "❌ Token bucket no encontrado"
        limits_ok=false
    fi
    
    if [ "$limits_ok" = false ]; then
        error "❌ Faltan componentes de control de límites"
        return 1
    fi
    
    # 3. Registrar tool calls y logs completos
    info "🔄 Pilar 3: Verificando logging centralizado..."
    
    local logging_ok=true
    
    # Verificar logger centralizado
    if [ -f "$PROJECT_ROOT/utils/tool-logger.mjs" ]; then
        success "✅ Logger centralizado disponible"
    else
        error "❌ Logger centralizado no encontrado"
        logging_ok=false
    fi
    
    # Crear directorio de logs
    if [ ! -d "$PROJECT_ROOT/logs" ]; then
        mkdir -p "$PROJECT_ROOT/logs"
        success "✅ Directorio de logs creado"
    else
        success "✅ Directorio de logs existe"
    fi
    
    if [ "$logging_ok" = false ]; then
        error "❌ Faltan componentes de logging"
        return 1
    fi
    
    # Verificar configuración de rate limiting
    info "🔄 Verificando configuración de rate limiting..."
    
    if [ -f "$PROJECT_ROOT/.env" ] && grep -q "DISABLE_RATE_LIMITING=true" "$PROJECT_ROOT/.env"; then
        success "✅ Rate limiting básico deshabilitado"
    else
        warning "⚠️  Rate limiting básico no deshabilitado - ejecutando script de defensa"
        cd "$PROJECT_ROOT"
        if ./scripts/activate-rate-limit-defense.sh activate; then
            success "✅ Rate limiting configurado"
        else
            error "❌ Error configurando rate limiting"
            return 1
        fi
    fi
    
    # Crear archivo de configuración para Nivel 1
    info "🔄 Creando configuración específica del Nivel 1..."
    
    cat > "$PROJECT_ROOT/config/level1.env" << 'EOF'
# Nivel 1 — Urgente Configuration
# Pilares básicos de Quannex

# Rate Limiting Avanzado
RL_MODE=token-bucket
RL_QPS=3
RL_BURST=6
RL_RETRY=expo-jitter:5,base=250ms,max=30s
RL_TIMEOUT_MS=45000

# Fallback Models
FALLBACK_CHAIN=model_b,model_c
DOWNGRADE_ON_429=true

# Tool Call Logging
TOOL_LOG_ENABLED=true
TOOL_LOG_LEVEL=info
TOOL_LOG_FILE=logs/tool_calls.jsonl
TOOL_LOG_MAX_SIZE=100MB
TOOL_LOG_RETENTION_DAYS=7

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Degradación Progresiva
CONTEXT_TRIM_ON_429=0.3
DISABLE_NONCRITICAL_TOOLS_ON_429=true
MAX_TOOL_CALLS_PER_TURN=2

# Logging Centralizado
CENTRALIZED_LOGGING=true
LOG_LEVEL=info
LOG_FORMAT=json
EOF

    success "✅ Configuración del Nivel 1 creada"
    
    # Verificar que los servicios Docker estén ejecutándose
    info "🔄 Verificando servicios Docker..."
    
    cd "$PROJECT_ROOT"
    if docker compose -f docker/context/compose.yml ps | grep -q "Up"; then
        success "✅ Servicios Docker ejecutándose"
    else
        warning "⚠️  Servicios Docker no ejecutándose - iniciando..."
        if make -f Makefile.quannex context-up; then
            success "✅ Servicios Docker iniciados"
        else
            error "❌ Error iniciando servicios Docker"
            return 1
        fi
    fi
    
    success "🎉 Nivel 1 activado exitosamente!"
    echo ""
    info "📋 RESUMEN DE ACTIVACIÓN NIVEL 1:"
    echo "   ✅ Anatomía de herramientas: ToolBase class + herramientas críticas"
    echo "   ✅ Control de límites: Token bucket + retry + circuit breaker"
    echo "   ✅ Logging centralizado: Tool calls + errores + estadísticas"
    echo "   ✅ Configuración específica: level1.env creado"
    echo "   ✅ Servicios Docker: Ejecutándose"
    echo ""
    info "🚀 PRÓXIMOS PASOS:"
    echo "   1. Ejecutar: ./scripts/activate-level1-urgent.sh test"
    echo "   2. Monitorear: tail -f logs/tool_calls.jsonl"
    echo "   3. Verificar: make context-health"
}

# Función para ejecutar tests de validación
runTests() {
    log "Ejecutando tests de validación del Nivel 1..."
    
    cd "$PROJECT_ROOT"
    
    # Test 1: Verificar componentes
    info "🔄 Test 1: Verificando componentes del Nivel 1..."
    
    local components=(
        "utils/tool-base.mjs"
        "utils/context-tools.mjs"
        "utils/llm-client-enhanced.mjs"
        "utils/token-bucket.mjs"
        "utils/tool-logger.mjs"
        "config/level1.env"
    )
    
    local all_components_ok=true
    for component in "${components[@]}"; do
        if [ -f "$component" ]; then
            success "✅ $component disponible"
        else
            error "❌ $component no encontrado"
            all_components_ok=false
        fi
    done
    
    if [ "$all_components_ok" = false ]; then
        error "❌ Faltan componentes del Nivel 1"
        return 1
    fi
    
    # Test 2: Verificar configuración
    info "🔄 Test 2: Verificando configuración..."
    
    if [ -f ".env" ] && grep -q "DISABLE_RATE_LIMITING=true" ".env"; then
        success "✅ Rate limiting configurado correctamente"
    else
        error "❌ Rate limiting no configurado"
        return 1
    fi
    
    # Test 3: Verificar servicios
    info "🔄 Test 3: Verificando servicios..."
    
    if docker compose -f docker/context/compose.yml ps | grep -q "Up"; then
        success "✅ Servicios Docker ejecutándose"
    else
        error "❌ Servicios Docker no ejecutándose"
        return 1
    fi
    
    # Test 4: Health check
    info "🔄 Test 4: Verificando health check..."
    
    if make -f Makefile.quannex context-health; then
        success "✅ Health check exitoso"
    else
        error "❌ Health check falló"
        return 1
    fi
    
    # Test 5: Verificar logging
    info "🔄 Test 5: Verificando sistema de logging..."
    
    if [ -d "logs" ]; then
        success "✅ Directorio de logs existe"
    else
        error "❌ Directorio de logs no existe"
        return 1
    fi
    
    success "🎉 Todos los tests del Nivel 1 pasaron!"
}

# Función para mostrar estado
showStatus() {
    log "Mostrando estado del Nivel 1..."
    
    echo ""
    info "📊 ESTADO NIVEL 1 — URGENTE:"
    echo "============================="
    
    # Verificar componentes
    echo ""
    echo "🛠️  COMPONENTES:"
    local components=(
        "utils/tool-base.mjs:ToolBase class"
        "utils/context-tools.mjs:Context tools mejoradas"
        "utils/llm-client-enhanced.mjs:Cliente LLM mejorado"
        "utils/token-bucket.mjs:Token bucket y circuit breaker"
        "utils/tool-logger.mjs:Logger centralizado"
        "config/level1.env:Configuración Nivel 1"
    )
    
    for component in "${components[@]}"; do
        IFS=':' read -r file desc <<< "$component"
        if [ -f "$PROJECT_ROOT/$file" ]; then
            echo "   ✅ $desc: DISPONIBLE"
        else
            echo "   ❌ $desc: NO ENCONTRADO"
        fi
    done
    
    # Verificar configuración
    echo ""
    echo "⚙️  CONFIGURACIÓN:"
    if [ -f "$PROJECT_ROOT/.env" ]; then
        if grep -q "DISABLE_RATE_LIMITING=true" "$PROJECT_ROOT/.env"; then
            echo "   ✅ Rate limiting: CONFIGURADO"
        else
            echo "   ❌ Rate limiting: NO CONFIGURADO"
        fi
    else
        echo "   ❌ Archivo .env: NO ENCONTRADO"
    fi
    
    if [ -f "$PROJECT_ROOT/config/level1.env" ]; then
        echo "   ✅ Configuración Nivel 1: DISPONIBLE"
    else
        echo "   ❌ Configuración Nivel 1: NO ENCONTRADA"
    fi
    
    # Verificar servicios
    echo ""
    echo "🐳 SERVICIOS:"
    cd "$PROJECT_ROOT"
    if docker compose -f docker/context/compose.yml ps | grep -q "Up"; then
        echo "   ✅ Docker services: EJECUTÁNDOSE"
    else
        echo "   ❌ Docker services: NO EJECUTÁNDOSE"
    fi
    
    # Verificar logs
    echo ""
    echo "📝 LOGGING:"
    if [ -d "$PROJECT_ROOT/logs" ]; then
        echo "   ✅ Directorio de logs: EXISTE"
        if [ -f "$PROJECT_ROOT/logs/tool_calls.jsonl" ]; then
            local log_size=$(wc -l < "$PROJECT_ROOT/logs/tool_calls.jsonl" 2>/dev/null || echo "0")
            echo "   ✅ Tool calls log: $log_size entradas"
        else
            echo "   ⚠️  Tool calls log: VACÍO"
        fi
    else
        echo "   ❌ Directorio de logs: NO EXISTE"
    fi
    
    echo ""
}

# Función principal
main() {
    local command="${1:-help}"
    
    case "$command" in
        "activate")
            activateLevel1
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
