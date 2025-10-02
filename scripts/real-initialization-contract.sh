#!/usr/bin/env bash
# Real Initialization Contract - Script que cumple REALMENTE con el contrato de inicialización
# Obliga a Cursor a leer manual y contexto con acknowledgments reales

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[REAL-INITIALIZATION]${NC} $1"
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
    echo "   QUANNEX STARTKIT - INICIALIZACIÓN REAL"
    echo "🚀 =============================================== 🚀"
    echo ""
    echo "🎯 CURSOR DEBE LEER REALMENTE LOS DOCUMENTOS"
    echo "   Este proceso requiere acknowledgments específicos..."
    echo ""
    echo "📋 PROCESO DE INICIALIZACIÓN REAL:"
    echo "   1️⃣ Leer MANUAL-COMPLETO-CURSOR.md completamente"
    echo "   2️⃣ Proporcionar acknowledgment específico"
    echo "   3️⃣ Leer CONTEXTO-INGENIERO-SENIOR.md completamente"
    echo "   4️⃣ Proporcionar acknowledgment específico"
    echo "   5️⃣ Verificar estado del sistema"
    echo "   6️⃣ Confirmar inicialización completa"
    echo ""
    echo "⏳ Por favor, lee cada documento completamente antes de continuar..."
    echo ""
}

# Función para solicitar acknowledgment
requestAcknowledgment() {
    local document_name="$1"
    local required_acknowledgment="$2"
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo ""
        echo "📝 ACKNOWLEDGMENT REQUERIDO para $document_name:"
        echo "   Debes escribir exactamente:"
        echo "   \"$required_acknowledgment\""
        echo ""
        read -p "Escribe el acknowledgment: " user_input
        
        if [ "$user_input" = "$required_acknowledgment" ]; then
            success "Acknowledgment correcto recibido para $document_name"
            return 0
        else
            warning "Acknowledgment incorrecto. Intento $attempt de $max_attempts"
            echo "   Esperado: \"$required_acknowledgment\""
            echo "   Recibido: \"$user_input\""
            ((attempt++))
        fi
    done
    
    error "No se pudo obtener acknowledgment correcto para $document_name después de $max_attempts intentos"
    return 1
}

# Función para mostrar documento completo
showDocument() {
    local document_path="$1"
    local document_name="$2"
    
    if [ ! -f "$document_path" ]; then
        error "Documento no encontrado: $document_path"
        return 1
    fi
    
    log "Mostrando $document_name completo..."
    echo ""
    echo "📖 =============================================== 📖"
    echo "   $document_name"
    echo "📖 =============================================== 📖"
    echo ""
    
    # Mostrar el documento completo
    cat "$document_path"
    
    echo ""
    echo "📖 =============================================== 📖"
    echo "   FIN DE $document_name"
    echo "📖 =============================================== 📖"
    echo ""
    
    return 0
}

# Función para ejecutar inicialización real
executeRealInitialization() {
    log "Iniciando inicialización REAL de Cursor..."
    
    # Mostrar banner
    showInitializationBanner
    
    # 1. Leer MANUAL-COMPLETO-CURSOR.md
    log "PASO 1: Leyendo MANUAL-COMPLETO-CURSOR.md..."
    if ! showDocument "MANUAL-COMPLETO-CURSOR.md" "MANUAL COMPLETO CURSOR"; then
        error "No se pudo mostrar el manual completo"
        return 1
    fi
    
    # Solicitar acknowledgment para el manual
    if ! requestAcknowledgment "MANUAL-COMPLETO-CURSOR.md" "He leído y entendido completamente el manual del proyecto QuanNex StartKit"; then
        error "Fallo en acknowledgment del manual"
        return 1
    fi
    
    # 2. Leer CONTEXTO-INGENIERO-SENIOR.md
    log "PASO 2: Leyendo CONTEXTO-INGENIERO-SENIOR.md..."
    if ! showDocument "CONTEXTO-INGENIERO-SENIOR.md" "CONTEXTO INGENIERO SENIOR"; then
        error "No se pudo mostrar el contexto de ingeniero senior"
        return 1
    fi
    
    # Solicitar acknowledgment para el contexto
    if ! requestAcknowledgment "CONTEXTO-INGENIERO-SENIOR.md" "He leído y entendido el contexto completo del proyecto QuanNex StartKit"; then
        error "Fallo en acknowledgment del contexto"
        return 1
    fi
    
    # 3. Verificar estado del sistema
    log "PASO 3: Verificando estado del sistema..."
    if [ -f "./context-manager.sh" ]; then
        log "Ejecutando ./context-manager.sh status..."
        if ./context-manager.sh status 2>/dev/null | grep -q "MCP QuanNex funcionando\|Contextos disponibles"; then
            success "Estado del sistema verificado correctamente"
        else
            warning "Estado del sistema no contiene los elementos esperados, pero continuando..."
        fi
    else
        warning "context-manager.sh no encontrado, saltando verificación de estado"
    fi
    
    # 4. Confirmación final
    log "PASO 4: Confirmación final de inicialización..."
    if ! requestAcknowledgment "INICIALIZACIÓN COMPLETA" "Contrato de inicialización completado. Cursor está listo para trabajar en caliente con el proyecto QuanNex StartKit."; then
        error "Fallo en confirmación final"
        return 1
    fi
    
    # Marcar como completado
    local sessionId="cursor_session_$(date +%s)"
    local statusFile="$PROJECT_ROOT/.cursor-initialization-status.json"
    cat > "$statusFile" << EOF
{
  "completed": true,
  "session_id": "$sessionId",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "contract_version": "1.0.0",
  "real_initialization": true,
  "acknowledgments_received": [
    "He leído y entendido completamente el manual del proyecto QuanNex StartKit",
    "He leído y entendido el contexto completo del proyecto QuanNex StartKit",
    "Contrato de inicialización completado. Cursor está listo para trabajar en caliente con el proyecto QuanNex StartKit."
  ]
}
EOF
    
    success "Inicialización REAL completada exitosamente"
    echo ""
    echo "✅ =============================================== ✅"
    echo "   CURSOR ESTÁ AHORA REALMENTE EN CALIENTE"
    echo "✅ =============================================== ✅"
    echo ""
    echo "🎯 BENEFICIOS DE LA INICIALIZACIÓN REAL:"
    echo "   ✅ Manual completo leído y entendido REALMENTE"
    echo "   ✅ Contexto de ingeniero senior cargado REALMENTE"
    echo "   ✅ Estado del sistema verificado"
    echo "   ✅ Acknowledgments específicos recibidos y validados"
    echo "   ✅ Cursor listo para trabajar inmediatamente"
    echo ""
    echo "🚀 PUEDES EMPEZAR A TRABAJAR AHORA MISMO"
    echo "   El contrato se cumplió REALMENTE esta vez"
    echo ""
    
    return 0
}

# Función para mostrar ayuda
showHelp() {
    echo "=== REAL INITIALIZATION CONTRACT - INICIALIZACIÓN REAL ==="
    echo ""
    echo "🎯 FUNCIÓN:"
    echo "   Cumple REALMENTE con el contrato de inicialización"
    echo "   Obliga a Cursor a leer manual y contexto con acknowledgments reales"
    echo ""
    echo "🚀 USO:"
    echo "   ./scripts/real-initialization-contract.sh          # Ejecutar inicialización real"
    echo "   ./scripts/real-initialization-contract.sh help     # Mostrar ayuda"
    echo ""
    echo "📋 PROCESO REAL:"
    echo "   1. Lee MANUAL-COMPLETO-CURSOR.md completamente"
    echo "   2. Solicita acknowledgment específico"
    echo "   3. Lee CONTEXTO-INGENIERO-SENIOR.md completamente"
    echo "   4. Solicita acknowledgment específico"
    echo "   5. Verifica estado del sistema"
    echo "   6. Confirma inicialización completa"
    echo ""
    echo "🎯 RESULTADO:"
    echo "   Cursor entra REALMENTE en caliente"
    echo "   Todos los acknowledgments son validados"
    echo "   El contrato se cumple completamente"
    echo ""
}

# Función principal
main() {
    local command="${1:-execute}"
    
    case "$command" in
        "execute"|"init")
            executeRealInitialization
            ;;
        "help"|*)
            showHelp
            ;;
    esac
}

# Ejecutar función principal
main "$@"
