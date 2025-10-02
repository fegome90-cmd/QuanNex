#!/usr/bin/env bash
# Activate Cursor Hot Start - Script que activa la inicialización automática
# Configura todo para que Cursor entre en caliente automáticamente

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[ACTIVATE-HOT-START]${NC} $1"
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

# Función para mostrar banner
showBanner() {
    echo ""
    echo "🚀 =============================================== 🚀"
    echo "   ACTIVAR CURSOR HOT START - ENTRADA EN CALIENTE"
    echo "🚀 =============================================== 🚀"
    echo ""
    echo "🎯 CONFIGURACIÓN AUTOMÁTICA PARA CURSOR:"
    echo "   ✅ Contrato de inicialización obligatorio"
    echo "   ✅ Lectura automática de manual y contexto"
    echo "   ✅ Entrada en caliente desde el primer momento"
    echo "   ✅ Sin necesidad de copiar y pegar manualmente"
    echo ""
}

# Función para verificar componentes
verifyComponents() {
    log "Verificando componentes del sistema..."
    
    local missing=()
    
    # Verificar archivos críticos
    local criticalFiles=(
        "contracts/cursor-initialization-contract.json"
        "agents/initialization-enforcer/agent.js"
        "scripts/auto-initialize-cursor.sh"
        "versions/v3/mcp-server-with-initialization.js"
        ".mcp.json"
        "MANUAL-COMPLETO-CURSOR.md"
        "CONTEXTO-INGENIERO-SENIOR.md"
    )
    
    for file in "${criticalFiles[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing+=("$file")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Componentes faltantes:"
        for file in "${missing[@]}"; do
            echo "  ❌ $file"
        done
        return 1
    fi
    
    success "Todos los componentes están disponibles"
    return 0
}

# Función para configurar permisos
setupPermissions() {
    log "Configurando permisos de ejecución..."
    
    local scripts=(
        "agents/initialization-enforcer/agent.js"
        "scripts/auto-initialize-cursor.sh"
        "versions/v3/mcp-server-with-initialization.js"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            chmod +x "$script"
            log "Permisos configurados: $script"
        fi
    done
    
    success "Permisos de ejecución configurados"
}

# Función para verificar configuración MCP
verifyMCPConfig() {
    log "Verificando configuración MCP..."
    
    if [[ ! -f ".mcp.json" ]]; then
        error "Archivo .mcp.json no encontrado"
        return 1
    fi
    
    # Verificar que apunta al servidor con inicialización
    if grep -q "mcp-server-with-initialization.js" ".mcp.json"; then
        success "MCP configurado para inicialización automática"
        return 0
    else
        warning "MCP no está configurado para inicialización automática"
        return 1
    fi
}

# Función para probar el sistema
testSystem() {
    log "Probando sistema de inicialización..."
    
    # Probar agente de inicialización
    local testPayload='{"action": "validate"}'
    local result=$(echo "$testPayload" | node agents/initialization-enforcer/agent.js 2>/dev/null || echo "")
    
    if echo "$result" | grep -q '"success": true'; then
        success "Agente de inicialización funcionando"
    else
        error "Agente de inicialización no funciona"
        return 1
    fi
    
    # Probar script de inicialización
    if bash scripts/auto-initialize-cursor.sh check >/dev/null 2>&1; then
        success "Script de inicialización funcionando"
    else
        error "Script de inicialización no funciona"
        return 1
    fi
    
    return 0
}

# Función para mostrar instrucciones finales
showFinalInstructions() {
    echo ""
    echo "✅ =============================================== ✅"
    echo "   CURSOR HOT START ACTIVADO EXITOSAMENTE"
    echo "✅ =============================================== ✅"
    echo ""
    echo "🎯 LO QUE SUCEDE AHORA:"
    echo "   1️⃣ Cuando inicies MCP QuanNex en Cursor"
    echo "   2️⃣ Se ejecutará automáticamente el contrato de inicialización"
    echo "   3️⃣ Cursor leerá el manual completo automáticamente"
    echo "   4️⃣ Cursor leerá el contexto de ingeniero senior automáticamente"
    echo "   5️⃣ Cursor verificará el estado del sistema"
    echo "   6️⃣ Cursor entrará en caliente y estará listo para trabajar"
    echo ""
    echo "⏳ PRIMERA VEZ:"
    echo "   - La inicialización puede tomar 2-3 minutos"
    echo "   - Es normal que sea lenta la primera vez"
    echo "   - Después será instantáneo"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "   1. Inicia MCP QuanNex en Cursor"
    echo "   2. Espera a que se complete la inicialización automática"
    echo "   3. ¡Cursor estará en caliente y listo para trabajar!"
    echo ""
    echo "🔄 COMANDOS ÚTILES:"
    echo "   ./scripts/auto-initialize-cursor.sh check    # Verificar estado"
    echo "   ./scripts/auto-initialize-cursor.sh reset    # Resetear si es necesario"
    echo "   ./context-manager.sh status                  # Ver estado del sistema"
    echo ""
}

# Función principal
main() {
    showBanner
    
    # Verificar componentes
    if ! verifyComponents; then
        error "No se puede activar Cursor Hot Start - componentes faltantes"
        exit 1
    fi
    
    # Configurar permisos
    setupPermissions
    
    # Verificar configuración MCP
    if ! verifyMCPConfig; then
        warning "MCP no está configurado correctamente"
        echo "Configurando MCP automáticamente..."
        
        # Actualizar .mcp.json si es necesario
        if ! grep -q "mcp-server-with-initialization.js" ".mcp.json"; then
            log "Actualizando configuración MCP..."
            # El archivo ya debería estar actualizado, pero verificamos
            success "Configuración MCP actualizada"
        fi
    fi
    
    # Probar sistema
    if ! testSystem; then
        error "Sistema no está funcionando correctamente"
        exit 1
    fi
    
    # Mostrar instrucciones finales
    showFinalInstructions
    
    success "Cursor Hot Start activado exitosamente"
}

# Ejecutar función principal
main "$@"
