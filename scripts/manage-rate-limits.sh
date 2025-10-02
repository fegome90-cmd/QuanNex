#!/bin/bash
# Script para gestionar rate limits de Quannex

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"
RATE_LIMITS_DIR="$PROJECT_ROOT/.rate-limits"

log() {
    echo -e "${BLUE}[RATE-LIMITS]${NC} $1"
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

# Función para mostrar ayuda
showHelp() {
    echo "=== GESTIÓN DE RATE LIMITS QUANNEX ==="
    echo ""
    echo "🎯 FUNCIÓN:"
    echo "   Gestiona los rate limits de los agentes Quannex"
    echo ""
    echo "🚀 USO:"
    echo "   ./scripts/manage-rate-limits.sh status     # Ver estado actual"
    echo "   ./scripts/manage-rate-limits.sh reset      # Resetear todos los límites"
    echo "   ./scripts/manage-rate-limits.sh disable    # Deshabilitar rate limiting"
    echo "   ./scripts/manage-rate-limits.sh enable     # Habilitar rate limiting"
    echo "   ./scripts/manage-rate-limits.sh help       # Mostrar ayuda"
    echo ""
    echo "📋 LÍMITES ACTUALES (por minuto):"
    echo "   context: 100 requests"
    echo "   prompting: 150 requests"
    echo "   rules: 200 requests"
    echo "   security: 50 requests"
    echo "   orchestrator: 500 requests"
    echo "   (otros agentes también aumentados)"
    echo ""
    echo "🔧 VARIABLES DE ENTORNO:"
    echo "   DISABLE_RATE_LIMITING=true  # Deshabilita completamente el rate limiting"
    echo ""
}

# Función para mostrar estado
showStatus() {
    log "Mostrando estado de rate limits..."
    
    if [ ! -d "$RATE_LIMITS_DIR" ]; then
        success "No hay archivos de rate limiting (todos los límites están disponibles)"
        return
    fi
    
    echo ""
    echo "📊 ESTADO ACTUAL DE RATE LIMITS:"
    echo "================================="
    
    for file in "$RATE_LIMITS_DIR"/*.json; do
        if [ -f "$file" ]; then
            agent_name=$(basename "$file" .json)
            content=$(cat "$file")
            count=$(echo "$content" | jq -r '.count')
            reset_time=$(echo "$content" | jq -r '.resetTime')
            current_time=$(date +%s)000
            remaining_time=$(( (reset_time - current_time) / 1000 ))
            
            echo "🤖 $agent_name:"
            echo "   Requests: $count"
            echo "   Reset en: ${remaining_time}s"
            echo ""
        fi
    done
}

# Función para resetear límites
resetLimits() {
    log "Reseteando todos los rate limits..."
    
    if [ -d "$RATE_LIMITS_DIR" ]; then
        rm -rf "$RATE_LIMITS_DIR"/*
        success "Rate limits reseteados"
    else
        success "No hay rate limits para resetear"
    fi
}

# Función para deshabilitar rate limiting
disableRateLimiting() {
    log "Deshabilitando rate limiting..."
    
    # Crear archivo .env si no existe
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        touch "$PROJECT_ROOT/.env"
    fi
    
    # Agregar variable si no existe
    if ! grep -q "DISABLE_RATE_LIMITING" "$PROJECT_ROOT/.env"; then
        echo "DISABLE_RATE_LIMITING=true" >> "$PROJECT_ROOT/.env"
        success "Rate limiting deshabilitado (agregado a .env)"
    else
        # Actualizar si ya existe
        sed -i '' 's/DISABLE_RATE_LIMITING=.*/DISABLE_RATE_LIMITING=true/' "$PROJECT_ROOT/.env"
        success "Rate limiting deshabilitado (actualizado en .env)"
    fi
    
    # Resetear límites actuales
    resetLimits
}

# Función para habilitar rate limiting
enableRateLimiting() {
    log "Habilitando rate limiting..."
    
    if [ -f "$PROJECT_ROOT/.env" ]; then
        if grep -q "DISABLE_RATE_LIMITING" "$PROJECT_ROOT/.env"; then
            sed -i '' 's/DISABLE_RATE_LIMITING=.*/DISABLE_RATE_LIMITING=false/' "$PROJECT_ROOT/.env"
            success "Rate limiting habilitado"
        else
            success "Rate limiting ya estaba habilitado"
        fi
    else
        success "Rate limiting habilitado (no había .env)"
    fi
}

# Función principal
main() {
    local command="${1:-help}"
    
    case "$command" in
        "status")
            showStatus
            ;;
        "reset")
            resetLimits
            ;;
        "disable")
            disableRateLimiting
            ;;
        "enable")
            enableRateLimiting
            ;;
        "help"|*)
            showHelp
            ;;
    esac
}

# Ejecutar función principal
main "$@"
