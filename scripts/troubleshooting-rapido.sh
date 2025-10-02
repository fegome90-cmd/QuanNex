#!/usr/bin/env bash
set -euo pipefail

# Script de troubleshooting rápido para Hot Start Endurecido
# Resuelve problemas comunes de forma automática

echo "=== 🔧 TROUBLESHOOTING RÁPIDO - HOT START ENDURECIDO ==="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[TROUBLESHOOTING]${NC} $1"
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

# Función para diagnosticar problema
diagnose_problem() {
    log "Diagnosticando problemas del sistema..."
    
    local problems=()
    
    # 1. HEAD desprendida no permitida
    if [[ "$(git rev-parse --abbrev-ref HEAD)" == "HEAD" ]]; then
        local current_commit="$(git rev-parse --verify HEAD)"
        log "HEAD desprendida detectada en commit: $current_commit"
        
        # Verificar si está en rama permitida
        local in_allowed_branch=false
        for branch in main fix/background-agent; do
            if git merge-base --is-ancestor "$current_commit" "origin/$branch" 2>/dev/null; then
                in_allowed_branch=true
                break
            fi
        done
        
        if [[ "$in_allowed_branch" == "false" ]]; then
            problems+=("HEAD_DETACHED")
        fi
    fi
    
    # 2. Puertos ocupados
    for port in 8051 8052 3000; do
        if lsof -i :$port >/dev/null 2>&1; then
            problems+=("PORT_OCCUPIED_$port")
        fi
    done
    
    # 3. TaskDB down
    if ! ./scripts/taskdb-health.sh >/dev/null 2>&1; then
        problems+=("TASKDB_DOWN")
    fi
    
    # 4. Idempotencia atascada
    if [[ -f ".cache/hotstart_init.json" ]]; then
        if ! jq -e '.init_done == true' .cache/hotstart_init.json >/dev/null 2>&1; then
            problems+=("IDEMPOTENCY_STUCK")
        fi
    else
        problems+=("IDEMPOTENCY_MISSING")
    fi
    
    # 5. MCP QuanNex no funciona
    if ! node orchestration/orchestrator.js health >/dev/null 2>&1; then
        problems+=("MCP_DOWN")
    fi
    
    # 6. Contextos faltantes
    if [[ ! -f "CONTEXTO-INGENIERO-SENIOR.md" ]] || [[ ! -f "CONTEXTO-RAPIDO.md" ]]; then
        problems+=("CONTEXTS_MISSING")
    fi
    
    echo "${problems[*]}"
}

# Función para resolver HEAD desprendida
fix_head_detached() {
    local current_commit="$(git rev-parse --verify HEAD)"
    log "Resolviendo HEAD desprendida en commit: $current_commit"
    
    echo "Opciones disponibles:"
    echo "1. Añadir commit a ALLOWED_COMMITS"
    echo "2. Cambiar a rama permitida"
    echo "3. Crear rama temporal"
    echo ""
    
    read -p "Selecciona opción (1-3): " option
    
    case "$option" in
        1)
            log "Añadiendo commit a ALLOWED_COMMITS..."
            export ALLOWED_COMMITS="$current_commit"
            if ALLOWED_BRANCHES="main,fix/background-agent" ./scripts/validate-git.sh; then
                success "Commit añadido a lista blanca"
                echo "Para hacer permanente, añade este commit al contrato:"
                echo "  \"allowed_commits\": [\"$current_commit\"]"
            else
                error "No se pudo añadir commit a lista blanca"
            fi
            ;;
        2)
            log "Cambiando a rama permitida..."
            echo "Ramas disponibles:"
            git branch -r | grep -E "(main|fix/background-agent)" | head -5
            echo ""
            read -p "Nombre de rama: " branch_name
            if git checkout "$branch_name" 2>/dev/null; then
                success "Cambiado a rama: $branch_name"
            else
                error "No se pudo cambiar a rama: $branch_name"
            fi
            ;;
        3)
            log "Creando rama temporal..."
            read -p "Nombre de rama temporal: " temp_branch
            if git checkout -b "$temp_branch" 2>/dev/null; then
                success "Creada rama temporal: $temp_branch"
                warning "Recuerda añadir '$temp_branch' a ALLOWED_BRANCHES si es necesario"
            else
                error "No se pudo crear rama temporal"
            fi
            ;;
        *)
            error "Opción inválida"
            ;;
    esac
}

# Función para resolver puertos ocupados
fix_ports_occupied() {
    log "Resolviendo puertos ocupados..."
    
    for port in 8051 8052 3000; do
        local pid=$(lsof -ti :$port 2>/dev/null || true)
        if [[ -n "$pid" ]]; then
            log "Puerto $port ocupado por PID: $pid"
            echo "Proceso: $(ps -p $pid -o comm= 2>/dev/null || echo 'desconocido')"
            echo ""
            echo "Opciones:"
            echo "1. Matar proceso"
            echo "2. Reenrutar puerto"
            echo "3. Saltar este puerto"
            echo ""
            read -p "Selecciona opción (1-3): " option
            
            case "$option" in
                1)
                    if kill -9 "$pid" 2>/dev/null; then
                        success "Proceso $pid terminado"
                    else
                        error "No se pudo terminar proceso $pid"
                    fi
                    ;;
                2)
                    log "Reenrutando puerto $port..."
                    warning "Funcionalidad de reenrutamiento no implementada"
                    ;;
                3)
                    log "Saltando puerto $port..."
                    ;;
                *)
                    error "Opción inválida"
                    ;;
            esac
        fi
    done
}

# Función para resolver TaskDB down
fix_taskdb_down() {
    log "Resolviendo TaskDB down..."
    
    echo "Opciones disponibles:"
    echo "1. Reiniciar servicio TaskDB"
    echo "2. Verificar configuración"
    echo "3. Recrear TaskDB"
    echo ""
    read -p "Selecciona opción (1-3): " option
    
    case "$option" in
        1)
            log "Reiniciando servicio TaskDB..."
            if docker-compose restart taskdb 2>/dev/null || docker restart taskdb 2>/dev/null; then
                success "Servicio TaskDB reiniciado"
                sleep 5
                if ./scripts/taskdb-health.sh; then
                    success "TaskDB funcionando"
                else
                    error "TaskDB sigue sin funcionar"
                fi
            else
                error "No se pudo reiniciar servicio TaskDB"
            fi
            ;;
        2)
            log "Verificando configuración TaskDB..."
            if [[ -f "data/taskdb.json" ]]; then
                if jq . data/taskdb.json >/dev/null 2>&1; then
                    success "TaskDB JSON válido"
                else
                    error "TaskDB JSON inválido"
                fi
            else
                error "TaskDB no existe"
            fi
            ;;
        3)
            log "Recreando TaskDB..."
            if cp data/taskdb.json.backup data/taskdb.json 2>/dev/null; then
                success "TaskDB recreado desde backup"
            else
                warning "No hay backup, creando TaskDB vacío"
                echo '{}' > data/taskdb.json
                success "TaskDB vacío creado"
            fi
            ;;
        *)
            error "Opción inválida"
            ;;
    esac
}

# Función para resolver idempotencia atascada
fix_idempotency_stuck() {
    log "Resolviendo idempotencia atascada..."
    
    echo "Opciones disponibles:"
    echo "1. Resetear idempotencia (borrar .cache/hotstart_init.json)"
    echo "2. Forzar re-ejecución de lecturas"
    echo "3. Verificar estado actual"
    echo ""
    read -p "Selecciona opción (1-3): " option
    
    case "$option" in
        1)
            log "Reseteando idempotencia..."
            rm -f .cache/hotstart_init.json
            success "Idempotencia reseteada"
            ;;
        2)
            log "Forzando re-ejecución de lecturas..."
            rm -f .cache/hotstart_init.json
            if [[ -f "scripts/idempotency.sh" ]]; then
                . scripts/idempotency.sh mark
                success "Lecturas forzadas"
            else
                error "Script de idempotencia no encontrado"
            fi
            ;;
        3)
            log "Verificando estado actual..."
            if [[ -f ".cache/hotstart_init.json" ]]; then
                cat .cache/hotstart_init.json
            else
                echo "No hay archivo de idempotencia"
            fi
            ;;
        *)
            error "Opción inválida"
            ;;
    esac
}

# Función para resolver MCP down
fix_mcp_down() {
    log "Resolviendo MCP QuanNex down..."
    
    echo "Opciones disponibles:"
    echo "1. Reiniciar MCP QuanNex"
    echo "2. Verificar configuración MCP"
    echo "3. Recrear configuración MCP"
    echo ""
    read -p "Selecciona opción (1-3): " option
    
    case "$option" in
        1)
            log "Reiniciando MCP QuanNex..."
            if node orchestration/orchestrator.js health >/dev/null 2>&1; then
                success "MCP QuanNex ya funciona"
            else
                warning "MCP QuanNex no responde, verificar manualmente"
            fi
            ;;
        2)
            log "Verificando configuración MCP..."
            if [[ -f ".mcp.json" ]]; then
                if jq . .mcp.json >/dev/null 2>&1; then
                    success "Configuración MCP válida"
                    cat .mcp.json
                else
                    error "Configuración MCP inválida"
                fi
            else
                error "Configuración MCP no encontrada"
            fi
            ;;
        3)
            log "Recreando configuración MCP..."
            if [[ -f ".mcp.json.backup" ]]; then
                cp .mcp.json.backup .mcp.json
                success "Configuración MCP restaurada desde backup"
            else
                error "No hay backup de configuración MCP"
            fi
            ;;
        *)
            error "Opción inválida"
            ;;
    esac
}

# Función para resolver contextos faltantes
fix_contexts_missing() {
    log "Resolviendo contextos faltantes..."
    
    echo "Opciones disponibles:"
    echo "1. Generar contextos básicos"
    echo "2. Actualizar contextos con MCP QuanNex"
    echo "3. Restaurar desde backup"
    echo ""
    read -p "Selecciona opción (1-3): " option
    
    case "$option" in
        1)
            log "Generando contextos básicos..."
            if ./context-manager.sh generate; then
                success "Contextos básicos generados"
            else
                error "No se pudieron generar contextos básicos"
            fi
            ;;
        2)
            log "Actualizando contextos con MCP QuanNex..."
            if ./context-manager.sh update; then
                success "Contextos actualizados con MCP QuanNex"
            else
                error "No se pudieron actualizar contextos"
            fi
            ;;
        3)
            log "Restaurando desde backup..."
            if [[ -f "CONTEXTO-INGENIERO-SENIOR.md.backup" ]]; then
                cp CONTEXTO-INGENIERO-SENIOR.md.backup CONTEXTO-INGENIERO-SENIOR.md
                success "Contexto senior restaurado"
            fi
            if [[ -f "CONTEXTO-RAPIDO.md.backup" ]]; then
                cp CONTEXTO-RAPIDO.md.backup CONTEXTO-RAPIDO.md
                success "Contexto rápido restaurado"
            fi
            ;;
        *)
            error "Opción inválida"
            ;;
    esac
}

# Función principal
main() {
    log "Iniciando diagnóstico automático..."
    
    local problems=($(diagnose_problem))
    
    if [[ ${#problems[@]} -eq 0 ]]; then
        success "No se detectaron problemas - sistema funcionando correctamente"
        exit 0
    fi
    
    log "Problemas detectados: ${problems[*]}"
    echo ""
    
    for problem in "${problems[@]}"; do
        case "$problem" in
            "HEAD_DETACHED")
                fix_head_detached
                ;;
            "PORT_OCCUPIED_"*)
                fix_ports_occupied
                ;;
            "TASKDB_DOWN")
                fix_taskdb_down
                ;;
            "IDEMPOTENCY_STUCK"|"IDEMPOTENCY_MISSING")
                fix_idempotency_stuck
                ;;
            "MCP_DOWN")
                fix_mcp_down
                ;;
            "CONTEXTS_MISSING")
                fix_contexts_missing
                ;;
        esac
        echo ""
    done
    
    log "Diagnóstico completado"
    echo ""
    log "Ejecutando verificación final..."
    if ./scripts/checklist-verificacion.sh; then
        success "Sistema funcionando correctamente después del troubleshooting"
    else
        warning "Algunos problemas persisten, revisar manualmente"
    fi
}

# Ejecutar función principal
main "$@"
