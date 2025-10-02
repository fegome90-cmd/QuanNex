#!/usr/bin/env bash
# Auto Initialize Cursor - Script que se ejecuta automáticamente al iniciar MCP
# Obliga a Cursor a leer manual y contexto para entrar en caliente

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[AUTO-INITIALIZE]${NC} $1"
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

# Función para mostrar el banner de inicialización
showInitializationBanner() {
    echo ""
    echo "🚀 =============================================== 🚀"
    echo "   QUANNEX STARTKIT - INICIALIZACIÓN AUTOMÁTICA"
    echo "🚀 =============================================== 🚀"
    echo ""
    echo "🎯 CURSOR VA A ENTRAR EN CALIENTE AUTOMÁTICAMENTE"
    echo "   Esto puede tomar unos minutos la primera vez..."
    echo ""
    echo "📋 PROCESO DE INICIALIZACIÓN:"
    echo "   1️⃣ Leyendo manual completo del proyecto"
    echo "   2️⃣ Leyendo contexto de ingeniero senior"
    echo "   3️⃣ Verificando estado del sistema"
    echo "   4️⃣ Confirmando inicialización completa"
    echo ""
    echo "⏳ Por favor, espera mientras se completa la inicialización..."
    echo ""
}

# Función para ejecutar inicialización automática
executeAutoInitialization() {
    log "Iniciando inicialización automática de Cursor..."
    
    # Mostrar banner
    showInitializationBanner
    
    # Verificar que el script de inicialización real existe
    if [[ ! -f "scripts/real-initialization-contract.sh" ]]; then
        error "Script de inicialización real no encontrado"
        return 1
    fi
    
    # Ejecutar contrato de inicialización REAL
    log "Ejecutando contrato de inicialización REAL..."
    log "Este script mostrará el manual completo y contexto de ingeniero senior"
    log "Y solicitará acknowledgments reales para confirmar la lectura"
    
    # Ejecutar script de inicialización real
    local result=$(bash scripts/real-initialization-contract.sh)
    
    if [[ $? -eq 0 ]]; then
        success "Inicialización automática completada exitosamente"
        echo ""
        echo "✅ =============================================== ✅"
        echo "   CURSOR ESTÁ AHORA EN CALIENTE Y LISTO"
        echo "✅ =============================================== ✅"
        echo ""
        echo "🎯 BENEFICIOS DE LA INICIALIZACIÓN REAL:"
        echo "   ✅ Manual completo leído y procesado REALMENTE"
        echo "   ✅ Contexto de ingeniero senior leído y procesado REALMENTE"
        echo "   ✅ Acknowledgments reales recibidos y validados"
        echo "   ✅ Estado del sistema verificado"
        echo "   ✅ Cursor listo para trabajar inmediatamente"
        echo ""
        echo "🚀 PUEDES EMPEZAR A TRABAJAR AHORA MISMO"
        echo "   No necesitas copiar y pegar contextos manualmente"
        echo "   El contrato se cumplió REALMENTE esta vez"
        echo ""
        return 0
    else
        error "Inicialización automática falló"
        echo ""
        echo "❌ =============================================== ❌"
        echo "   INICIALIZACIÓN AUTOMÁTICA FALLÓ"
        echo "❌ =============================================== ❌"
        echo ""
        echo "🔄 FALLBACK MANUAL REQUERIDO:"
        echo "   1. Lee MANUAL-COMPLETO-CURSOR.md manualmente"
        echo "   2. Lee CONTEXTO-INGENIERO-SENIOR.md manualmente"
        echo "   3. Verifica el sistema con: ./context-manager.sh status"
        echo ""
        return 1
    fi
}

# Función para verificar si ya se completó la inicialización
checkInitializationStatus() {
    local statusFile="$PROJECT_ROOT/.cursor-initialization-status.json"
    if [[ -f "$statusFile" ]]; then
        local status=$(cat "$statusFile" | grep -o '"completed": true' || echo "")
        if [[ -n "$status" ]]; then
            local sessionId=$(cat "$statusFile" | grep -o '"session_id": "[^"]*"' | cut -d'"' -f4)
            local completedAt=$(cat "$statusFile" | grep -o '"completed_at": "[^"]*"' | cut -d'"' -f4)
            echo "✅ Inicialización ya completada"
            echo "   Sesión: $sessionId"
            echo "   Completada: $completedAt"
            return 0
        fi
    fi
    return 1
}

# Función para mostrar ayuda
showHelp() {
    echo "=== AUTO INITIALIZE CURSOR - INICIALIZACIÓN AUTOMÁTICA ==="
    echo ""
    echo "🎯 FUNCIÓN:"
    echo "   Obliga a Cursor a leer manual y contexto automáticamente"
    echo "   para entrar en caliente desde el primer momento"
    echo ""
    echo "🚀 USO:"
    echo "   ./scripts/auto-initialize-cursor.sh          # Ejecutar inicialización"
    echo "   ./scripts/auto-initialize-cursor.sh check    # Verificar estado"
    echo "   ./scripts/auto-initialize-cursor.sh reset    # Resetear inicialización"
    echo "   ./scripts/auto-initialize-cursor.sh help     # Mostrar ayuda"
    echo ""
    echo "📋 PROCESO:"
    echo "   1. Lee MANUAL-COMPLETO-CURSOR.md completamente"
    echo "   2. Lee CONTEXTO-INGENIERO-SENIOR.md completamente"
    echo "   3. Verifica estado del sistema"
    echo "   4. Confirma inicialización completa"
    echo ""
    echo "🎯 RESULTADO:"
    echo "   Cursor entra en caliente automáticamente"
    echo "   No necesitas copiar y pegar contextos manualmente"
    echo ""
}

# Función para resetear inicialización
resetInitialization() {
    log "Reseteando estado de inicialización..."
    
    local statusFile="$PROJECT_ROOT/.cursor-initialization-status.json"
    if [[ -f "$statusFile" ]]; then
        rm "$statusFile"
        success "Estado de inicialización reseteado"
        echo "La próxima vez se ejecutará el contrato completo"
    else
        warning "No hay estado de inicialización para resetear"
    fi
}

# Función principal
main() {
    local command="${1:-execute}"
    
    case "$command" in
        "execute"|"init")
            # Verificar si ya se completó
            if checkInitializationStatus; then
                echo ""
                echo "✅ Inicialización ya completada en sesión anterior"
                echo "   Cursor debería estar en caliente"
                echo ""
                echo "🔄 Si necesitas reinicializar, usa:"
                echo "   ./scripts/auto-initialize-cursor.sh reset"
                echo "   ./scripts/auto-initialize-cursor.sh execute"
                echo ""
                return 0
            fi
            
            executeAutoInitialization
            ;;
        "check")
            if checkInitializationStatus; then
                echo "✅ Estado de inicialización verificado"
            else
                echo "❌ Inicialización no completada"
                echo "   Ejecuta: ./scripts/auto-initialize-cursor.sh execute"
            fi
            ;;
        "reset")
            resetInitialization
            ;;
        "help"|*)
            showHelp
            ;;
    esac
}

# Ejecutar función principal
main "$@"
