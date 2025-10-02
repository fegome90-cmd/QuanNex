#!/usr/bin/env bash
# Codex Helper - Script de ayuda para Codex usando MCP QuanNex
# Uso: ./codex-helper.sh [comando]

set -euo pipefail

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función de logging
log() {
    echo -e "${BLUE}[CODEX-HELPER]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
check_directory() {
    if [[ "$(pwd)" != "/Users/felipe/Developer/startkit-main" ]]; then
        error "Debes estar en /Users/felipe/Developer/startkit-main"
        log "Ejecutando: cd /Users/felipe/Developer/startkit-main"
        cd /Users/felipe/Developer/startkit-main
    fi
    success "Directorio correcto: $(pwd)"
}

# Verificar estado del sistema
check_system() {
    log "Verificando estado del sistema..."
    
    # Verificar orquestador
    if [[ -f "orchestration/orchestrator.js" ]]; then
        success "Orquestador encontrado"
    else
        error "Orquestador no encontrado"
        return 1
    fi
    
    # Verificar agentes core
    local agents_ok=true
    for agent in context prompting rules; do
        if [[ -f "agents/$agent/agent.js" ]]; then
            success "Agente $agent encontrado"
        else
            error "Agente $agent no encontrado"
            agents_ok=false
        fi
    done
    
    if [[ "$agents_ok" == "false" ]]; then
        warn "Algunos agentes faltan. Usa: ./codex-helper.sh restore"
        return 1
    fi
    
    # Verificar que el orquestador funciona
    if node orchestration/orchestrator.js health >/dev/null 2>&1; then
        success "Sistema MCP QuanNex funcionando"
    else
        error "Sistema MCP QuanNex no responde"
        return 1
    fi
}

# Diagnóstico rápido
diagnose() {
    log "Ejecutando diagnóstico rápido..."
    
    # Crear workflow de diagnóstico
    cat > diagnostico-rapido.json << 'EOF'
{
  "name": "Diagnóstico Rápido",
  "steps": [
    {
      "step_id": "analizar_problemas",
      "agent": "context",
      "input": {
        "sources": ["logs/", "docs/audits/", "reports/"],
        "selectors": ["error", "problema", "fallo", "issue", "warning"],
        "max_tokens": 3000
      }
    },
    {
      "step_id": "generar_solucion",
      "agent": "prompting",
      "depends_on": ["analizar_problemas"],
      "input": {
        "goal": "Generar soluciones específicas para problemas encontrados",
        "context": "{{analizar_problemas.output.context_bundle}}",
        "style": "technical",
        "constraints": ["usar paths absolutos", "incluir comandos específicos"]
      }
    }
  ]
}
EOF
    
    # Crear y ejecutar workflow
    local workflow_id=$(node orchestration/orchestrator.js create diagnostico-rapido.json | jq -r '.workflow_id')
    log "Workflow creado: $workflow_id"
    
    # Ejecutar workflow
    node orchestration/orchestrator.js execute "$workflow_id"
    
    # Mostrar resultados
    log "Resultados del diagnóstico:"
    node orchestration/orchestrator.js status "$workflow_id"
    
    # Limpiar
    rm -f diagnostico-rapido.json
}

# Fix de pathing
fix_pathing() {
    log "Ejecutando fix de errores de pathing..."
    
    # Crear workflow de fix
    cat > fix-pathing.json << 'EOF'
{
  "name": "Fix Pathing Errors",
  "steps": [
    {
      "step_id": "identificar_paths",
      "agent": "context",
      "input": {
        "sources": ["orchestration/", "agents/", "core/", "versions/"],
        "selectors": ["import", "require", "path", "dirname", "fileURLToPath"],
        "max_tokens": 2000
      }
    },
    {
      "step_id": "generar_fix",
      "agent": "prompting",
      "depends_on": ["identificar_paths"],
      "input": {
        "goal": "Generar correcciones específicas para errores de pathing",
        "context": "{{identificar_paths.output.context_bundle}}",
        "style": "technical",
        "constraints": ["usar paths absolutos", "verificar que archivos existen"]
      }
    }
  ]
}
EOF
    
    # Crear y ejecutar workflow
    local workflow_id=$(node orchestration/orchestrator.js create fix-pathing.json | jq -r '.workflow_id')
    log "Workflow creado: $workflow_id"
    
    # Ejecutar workflow
    node orchestration/orchestrator.js execute "$workflow_id"
    
    # Mostrar resultados
    log "Resultados del fix:"
    node orchestration/orchestrator.js status "$workflow_id"
    
    # Limpiar
    rm -f fix-pathing.json
}

# Restaurar agentes desde backups
restore() {
    log "Restaurando agentes desde backups..."
    
    if [[ ! -d "backups/consolidation-20251001-160553" ]]; then
        error "Directorio de backups no encontrado"
        return 1
    fi
    
    # Restaurar agentes
    for agent in context prompting rules; do
        if [[ -f "backups/consolidation-20251001-160553/${agent}-agent.js" ]]; then
            cp "backups/consolidation-20251001-160553/${agent}-agent.js" "agents/$agent/agent.js"
            success "Agente $agent restaurado"
        else
            warn "Backup del agente $agent no encontrado"
        fi
    done
    
    # Verificar que funcionan
    log "Verificando agentes restaurados..."
    for agent in context prompting rules; do
        if node "agents/$agent/agent.js" < /dev/null >/dev/null 2>&1; then
            success "Agente $agent funcionando"
        else
            warn "Agente $agent puede tener problemas"
        fi
    done
}

# Mostrar ayuda
show_help() {
    echo "Codex Helper - Script de ayuda para MCP QuanNex"
    echo "================================================"
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  check     - Verificar estado del sistema"
    echo "  diagnose  - Ejecutar diagnóstico rápido"
    echo "  fix       - Corregir errores de pathing"
    echo "  restore   - Restaurar agentes desde backups"
    echo "  help      - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 check     # Verificar que todo funciona"
    echo "  $0 diagnose  # Analizar problemas"
    echo "  $0 fix       # Corregir pathing"
    echo "  $0 restore   # Restaurar agentes"
    echo ""
    echo "Nota: Este script debe ejecutarse desde /Users/felipe/Developer/startkit-main"
}

# Función principal
main() {
    # Verificar directorio
    check_directory
    
    # Procesar comando
    case "${1:-help}" in
        "check")
            check_system
            ;;
        "diagnose")
            check_system && diagnose
            ;;
        "fix")
            check_system && fix_pathing
            ;;
        "restore")
            restore
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            error "Comando desconocido: $1"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
