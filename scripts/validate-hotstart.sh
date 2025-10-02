#!/usr/bin/env bash
# Validate Hot Start - Script de validación rápida del sistema endurecido
set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[VALIDATE-HOTSTART]${NC} $1"
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

cd "$PROJECT_ROOT"

# Función para mostrar banner
showBanner() {
    echo ""
    echo "🔍 =============================================== 🔍"
    echo "   VALIDACIÓN RÁPIDA DEL SISTEMA HOT START"
    echo "🔍 =============================================== 🔍"
    echo ""
    echo "🎯 VALIDANDO COMPONENTES DEL SISTEMA ENDURECIDO:"
    echo ""
}

# Función para validar git state
validateGitState() {
    log "Validando estado de Git..."
    
    local currentBranch=$(git rev-parse --abbrev-ref HEAD)
    local currentCommit=$(git rev-parse HEAD)
    
    echo "  📍 Rama actual: $currentBranch"
    echo "  📍 Commit actual: $currentCommit"
    
    # Verificar ramas permitidas
    local allowedBranches=("main" "fix/background-agent")
    local branchAllowed=false
    
    for branch in "${allowedBranches[@]}"; do
        if [[ "$currentBranch" == "$branch" ]]; then
            branchAllowed=true
            break
        fi
    done
    
    if [[ "$branchAllowed" == "true" ]]; then
        success "Rama permitida para hot start"
        return 0
    else
        warning "Rama no está en lista de permitidas para hot start"
        return 1
    fi
}

# Función para validar runtime
validateRuntime() {
    log "Validando runtime (Node.js y pnpm)..."
    
    local nodeVersion=$(node -v 2>/dev/null || echo "No Node.js")
    local pnpmVersion=$(pnpm -v 2>/dev/null || echo "No pnpm")
    
    echo "  📍 Node.js: $nodeVersion"
    echo "  📍 pnpm: $pnpmVersion"
    
    # Verificar que Node.js está disponible
    if [[ "$nodeVersion" == "No Node.js" ]]; then
        error "Node.js no está disponible"
        return 1
    fi
    
    # Verificar versión mínima de Node.js (v20+)
    local nodeMajor=$(echo "$nodeVersion" | sed 's/v\([0-9]*\).*/\1/')
    if [[ "$nodeMajor" -lt 20 ]]; then
        warning "Node.js version < 20, puede causar problemas"
    fi
    
    success "Runtime validado"
    return 0
}

# Función para validar workspace
validateWorkspace() {
    log "Validando workspace root..."
    
    local requiredFiles=("package.json" "orchestration" ".cursor")
    local allPresent=true
    
    for file in "${requiredFiles[@]}"; do
        if [[ -e "$file" ]]; then
            echo "  ✅ $file"
        else
            echo "  ❌ $file"
            allPresent=false
        fi
    done
    
    if [[ "$allPresent" == "true" ]]; then
        success "Workspace root validado"
        return 0
    else
        error "Workspace root incompleto"
        return 1
    fi
}

# Función para validar puertos
validatePorts() {
    log "Validando puertos críticos..."
    
    if [[ -f "scripts/check-ports.sh" ]]; then
        if ./scripts/check-ports.sh 8051 8052 3000 >/dev/null 2>&1; then
            success "Puertos críticos libres"
            return 0
        else
            warning "Algunos puertos críticos están ocupados"
            return 1
        fi
    else
        warning "Script de verificación de puertos no encontrado"
        return 1
    fi
}

# Función para validar TaskDB
validateTaskDB() {
    log "Validando TaskDB..."
    
    if [[ -f "scripts/taskdb-health.sh" ]]; then
        if ./scripts/taskdb-health.sh >/dev/null 2>&1; then
            success "TaskDB operativo"
            return 0
        else
            error "TaskDB no operativo"
            return 1
        fi
    else
        warning "Script de salud de TaskDB no encontrado"
        return 1
    fi
}

# Función para validar context manager
validateContextManager() {
    log "Validando context manager..."
    
    if [[ -f "context-manager.sh" ]]; then
        # Probar comandos básicos
        if ./context-manager.sh verify >/dev/null 2>&1; then
            success "Context manager funcionando"
            return 0
        else
            warning "Context manager con problemas"
            return 1
        fi
    else
        error "Context manager no encontrado"
        return 1
    fi
}

# Función para validar contrato endurecido
validateContract() {
    log "Validando contrato endurecido..."
    
    local contractFile="contracts/cursor-hotstart-contract.json"
    if [[ -f "$contractFile" ]]; then
        if python3 -m json.tool "$contractFile" >/dev/null 2>&1; then
            success "Contrato endurecido válido"
            
            # Mostrar información del contrato
            local contractVersion=$(python3 -c "
import json
with open('$contractFile', 'r') as f:
    data = json.load(f)
print(data.get('version', 'unknown'))
")
            echo "  📍 Versión del contrato: $contractVersion"
            return 0
        else
            error "Contrato endurecido inválido (JSON malformado)"
            return 1
        fi
    else
        error "Contrato endurecido no encontrado"
        return 1
    fi
}

# Función para validar agente endurecido
validateHotStartEnforcer() {
    log "Validando agente hot start enforcer..."
    
    local agentFile="agents/hotstart-enforcer/agent.js"
    if [[ -f "$agentFile" ]]; then
        # Probar validación del agente
        local testPayload='{"action": "validate"}'
        local result=$(echo "$testPayload" | node "$agentFile" 2>/dev/null || echo "")
        
        if echo "$result" | grep -q '"success": true'; then
            success "Agente hot start enforcer funcionando"
            return 0
        else
            error "Agente hot start enforcer no funciona"
            return 1
        fi
    else
        error "Agente hot start enforcer no encontrado"
        return 1
    fi
}

# Función principal
main() {
    showBanner
    
    local totalChecks=8
    local passedChecks=0
    
    # Ejecutar validaciones
    if validateGitState; then ((passedChecks++)); fi
    if validateRuntime; then ((passedChecks++)); fi
    if validateWorkspace; then ((passedChecks++)); fi
    if validatePorts; then ((passedChecks++)); fi
    if validateTaskDB; then ((passedChecks++)); fi
    if validateContextManager; then ((passedChecks++)); fi
    if validateContract; then ((passedChecks++)); fi
    if validateHotStartEnforcer; then ((passedChecks++)); fi
    
    echo ""
    echo "📊 =============================================== 📊"
    echo "   RESULTADO DE LA VALIDACIÓN"
    echo "📊 =============================================== 📊"
    echo ""
    echo "✅ Checks pasados: $passedChecks/$totalChecks"
    
    if [[ $passedChecks -eq $totalChecks ]]; then
        success "🎉 SISTEMA HOT START COMPLETAMENTE VALIDADO"
        echo ""
        echo "🚀 El sistema está listo para hot start:"
        echo "   1. Inicia MCP QuanNex en Cursor"
        echo "   2. Se ejecutará automáticamente el contrato endurecido"
        echo "   3. Cursor entrará en caliente con todas las validaciones"
        echo ""
        exit 0
    else
        error "❌ SISTEMA HOT START CON PROBLEMAS"
        echo ""
        echo "🔧 Acciones recomendadas:"
        echo "   - Revisar los componentes que fallaron"
        echo "   - Ejecutar ./scripts/validate-hotstart.sh para verificar de nuevo"
        echo "   - Usar ./context-manager.sh verify para diagnóstico detallado"
        echo ""
        exit 1
    fi
}

# Ejecutar función principal
main "$@"
