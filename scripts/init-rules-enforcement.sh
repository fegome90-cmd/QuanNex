#!/bin/bash
set -euo pipefail

# Script de Inicialización de Rules Enforcement
# Este script se ejecuta automáticamente para asegurar que el agente de rules
# esté siempre activo y obligue a la IA de Cursor a seguir las reglas del proyecto.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RULES_HOOK="$PROJECT_ROOT/core/auto-rules-hook.js"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[RULES-INIT]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Verificar si Node.js está disponible
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado. Es requerido para el Rules Enforcement."
    exit 1
fi

# Verificar si el hook de rules existe
if [[ ! -f "$RULES_HOOK" ]]; then
    error "Rules hook no encontrado: $RULES_HOOK"
    exit 1
fi

# Verificar si el hook es ejecutable
if [[ ! -x "$RULES_HOOK" ]]; then
    log "Haciendo el hook ejecutable..."
    chmod +x "$RULES_HOOK"
fi

log "Iniciando Rules Enforcement automático..."

# Ejecutar el hook de rules
if node "$RULES_HOOK"; then
    success "Rules Enforcement inicializado correctamente"
    
    # Verificar que el Task DB esté actualizado
    TASK_DB="$PROJECT_ROOT/data/taskdb.json"
    if [[ -f "$TASK_DB" ]]; then
        # Verificar que el proyecto de gaps existe
        if grep -q "gaps-repair-2025-10-01" "$TASK_DB"; then
            success "Proyecto de gaps verificado en Task DB"
        else
            warn "Proyecto de gaps no encontrado en Task DB"
        fi
        
        # Verificar que las tareas críticas estén registradas
        CRITICAL_TASKS=$(grep -c "gap-00[1-5]" "$TASK_DB" || echo "0")
        if [[ "$CRITICAL_TASKS" -ge 5 ]]; then
            success "Tareas críticas verificadas en Task DB ($CRITICAL_TASKS tareas)"
        else
            warn "Tareas críticas faltantes en Task DB ($CRITICAL_TASKS encontradas)"
        fi
    else
        warn "Task DB no encontrado"
    fi
    
    # Mostrar estado de agentes MCP
    log "Verificando agentes MCP disponibles..."
    
    AGENTS=(
        "agents/security/agent.js:Security Agent"
        "agents/tests/test-agent.js:Test Agent"
        "agents/docsync/docsync-agent.js:Documentation Agent"
        "orchestration/orchestrator.js:Orchestrator"
    )
    
    for agent_info in "${AGENTS[@]}"; do
        IFS=':' read -r agent_path agent_name <<< "$agent_info"
        full_path="$PROJECT_ROOT/$agent_path"
        
        if [[ -f "$full_path" ]]; then
            success "$agent_name disponible"
        else
            warn "$agent_name faltante ($agent_path)"
        fi
    done
    
    # Mostrar estado de documentación crítica
    log "Verificando documentación crítica..."
    
    DOCS=(
        "docs/AGENTS.md:Guía de Agentes"
        "docs/audits/2025-09-initial-gap.md:Auditoría de Gaps"
        "docs/PLAN-REPARACION-GAPS-2025-10-01.md:Plan de Reparación"
    )
    
    for doc_info in "${DOCS[@]}"; do
        IFS=':' read -r doc_path doc_name <<< "$doc_info"
        full_path="$PROJECT_ROOT/$doc_path"
        
        if [[ -f "$full_path" ]]; then
            success "$doc_name disponible"
        else
            warn "$doc_name faltante ($doc_path)"
        fi
    done
    
    # Crear archivo de estado para verificación rápida
    STATE_FILE="$PROJECT_ROOT/.reports/rules-enforcement-state.json"
    cat > "$STATE_FILE" << EOF
{
  "initialized": true,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_root": "$PROJECT_ROOT",
  "rules_hook": "$RULES_HOOK",
  "task_db": "$PROJECT_ROOT/data/taskdb.json",
  "status": "active"
}
EOF
    
    success "Estado de Rules Enforcement guardado en $STATE_FILE"
    
else
    error "Error inicializando Rules Enforcement"
    exit 1
fi

log "Rules Enforcement inicializado exitosamente"
log "El agente de rules ahora obligará automáticamente a la IA de Cursor a:"
log "  - Seguir las reglas del proyecto"
log "  - Registrar tareas en el Task DB"
log "  - Mantener el contexto de trabajo"
log "  - Evitar pérdida de información crítica"
log "  - Priorizar gaps críticos de seguridad"

success "Sistema de Rules Enforcement activo y funcionando"
