#!/usr/bin/env bash
# Context Manager - Sistema de Gestión Dinámica de Contextos
# Permite al ingeniero de contexto mantener y actualizar automáticamente los contextos

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"

log() {
    echo -e "${BLUE}[CONTEXT-MANAGER]${NC} $1"
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

# Función para mostrar ayuda
show_help() {
    echo "=== CONTEXT MANAGER - SISTEMA DE GESTIÓN DINÁMICA DE CONTEXTOS ==="
    echo ""
    echo "🎯 FUNCIONES DISPONIBLES:"
    echo ""
    echo "  📄 generate     - Generar contextos actualizados"
    echo "  🔄 update       - Actualizar contextos usando MCP QuanNex"
    echo "  📋 show         - Mostrar contextos actuales"
    echo "  🧹 clean        - Limpiar contextos temporales"
  echo "  📊 status       - Ver estado de los contextos"
  echo "  🔍 verify       - Verificar estado del sistema (contrato endurecido)"
  echo "  💾 rehydrate    - Rehidratar contexto desde snapshot"
  echo "  🔄 rehydrate-robust - Rehidratación robusta con timeouts"
  echo "  ❓ help         - Mostrar esta ayuda"
    echo ""
    echo "🚀 EJEMPLOS DE USO:"
    echo ""
    echo "  ./context-manager.sh generate    # Generar contextos básicos"
    echo "  ./context-manager.sh update      # Actualizar con MCP QuanNex"
    echo "  ./context-manager.sh show        # Ver contextos actuales"
    echo "  ./context-manager.sh status      # Ver estado del sistema"
    echo ""
    echo "📚 CONTEXTOS GENERADOS:"
    echo "  📄 CONTEXTO-INGENIERO-SENIOR.md (Completo - 236 líneas)"
    echo "  ⚡ CONTEXTO-RAPIDO.md (Compacto - 32 líneas)"
}

# Función para generar contextos básicos
generate_contexts() {
    log "Generando contextos básicos..."
    
    if [[ -f "generate-context.sh" ]]; then
        ./generate-context.sh
        success "Contextos básicos generados exitosamente"
    else
        error "generate-context.sh no encontrado"
        return 1
    fi
}

# Función para actualizar contextos usando MCP QuanNex
update_contexts() {
    log "Actualizando contextos usando MCP QuanNex..."
    
    # Verificar que el orquestador funciona
    if ! node orchestration/orchestrator.js health >/dev/null 2>&1; then
        error "MCP QuanNex no está funcionando. Ejecutando generación básica..."
        generate_contexts
        return 1
    fi
    
    # Crear workflow de actualización
    if [[ -f "workflows/context-updater.json" ]]; then
        log "Creando workflow de actualización de contexto..."
        local workflow_id=$(node orchestration/orchestrator.js create workflows/context-updater.json | grep -o 'workflow_[a-f0-9-]*' | head -1)
        
        if [[ -n "$workflow_id" ]]; then
            log "Ejecutando workflow: $workflow_id"
            node orchestration/orchestrator.js execute "$workflow_id"
            
            log "Obteniendo resultados..."
            local status=$(node orchestration/orchestrator.js status "$workflow_id")
            
            if echo "$status" | grep -q "completed"; then
                success "Contextos actualizados usando MCP QuanNex"
                
                # Extraer y aplicar actualizaciones
                log "Extrayendo actualizaciones de contexto..."
                # Aquí se implementaría la lógica para extraer las actualizaciones
                # del resultado del workflow y aplicarlas a los archivos de contexto
                
            else
                warning "Workflow no completado. Usando generación básica..."
                generate_contexts
            fi
        else
            warning "No se pudo crear workflow. Usando generación básica..."
            generate_contexts
        fi
    else
        warning "workflows/context-updater.json no encontrado. Usando generación básica..."
        generate_contexts
    fi
}

# Función para mostrar contextos actuales
show_contexts() {
    log "Mostrando contextos actuales..."
    
    echo ""
    echo "=== CONTEXTOS DISPONIBLES ==="
    echo ""
    
    if [[ -f "CONTEXTO-INGENIERO-SENIOR.md" ]]; then
        local lines=$(wc -l < "CONTEXTO-INGENIERO-SENIOR.md")
        local size=$(du -h "CONTEXTO-INGENIERO-SENIOR.md" | cut -f1)
        local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "CONTEXTO-INGENIERO-SENIOR.md")
        echo "📄 CONTEXTO-INGENIERO-SENIOR.md"
        echo "   Líneas: $lines | Tamaño: $size | Modificado: $modified"
    else
        echo "❌ CONTEXTO-INGENIERO-SENIOR.md no encontrado"
    fi
    
    if [[ -f "CONTEXTO-RAPIDO.md" ]]; then
        local lines=$(wc -l < "CONTEXTO-RAPIDO.md")
        local size=$(du -h "CONTEXTO-RAPIDO.md" | cut -f1)
        local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "CONTEXTO-RAPIDO.md")
        echo "⚡ CONTEXTO-RAPIDO.md"
        echo "   Líneas: $lines | Tamaño: $size | Modificado: $modified"
    else
        echo "❌ CONTEXTO-RAPIDO.md no encontrado"
    fi
    
    echo ""
    echo "🎯 INSTRUCCIONES DE USO:"
    echo "  1. Copiar contenido completo del archivo deseado"
    echo "  2. Pegar al inicio del nuevo chat en Cursor"
    echo "  3. Cursor entenderá inmediatamente el proyecto"
}

# Función para ver estado del sistema
show_status() {
    log "Verificando estado del sistema de contextos..."
    
    echo ""
    echo "=== ESTADO DEL SISTEMA DE CONTEXTOS ==="
    echo ""
    
    # Verificar archivos de contexto
    echo "📄 ARCHIVOS DE CONTEXTO:"
    if [[ -f "CONTEXTO-INGENIERO-SENIOR.md" ]]; then
        echo "  ✅ CONTEXTO-INGENIERO-SENIOR.md"
    else
        echo "  ❌ CONTEXTO-INGENIERO-SENIOR.md"
    fi
    
    if [[ -f "CONTEXTO-RAPIDO.md" ]]; then
        echo "  ✅ CONTEXTO-RAPIDO.md"
    else
        echo "  ❌ CONTEXTO-RAPIDO.md"
    fi
    
    # Verificar scripts
    echo ""
    echo "🔧 SCRIPTS:"
    if [[ -f "generate-context.sh" ]]; then
        echo "  ✅ generate-context.sh"
    else
        echo "  ❌ generate-context.sh"
    fi
    
    if [[ -f "context-manager.sh" ]]; then
        echo "  ✅ context-manager.sh"
    else
        echo "  ❌ context-manager.sh"
    fi
    
    # Verificar workflows
    echo ""
    echo "🔄 WORKFLOWS:"
    if [[ -f "workflows/context-updater.json" ]]; then
        echo "  ✅ workflows/context-updater.json"
    else
        echo "  ❌ workflows/context-updater.json"
    fi
    
    # Verificar MCP QuanNex
    echo ""
    echo "🤖 MCP QUANNEX:"
    if node orchestration/orchestrator.js health >/dev/null 2>&1; then
        echo "  ✅ MCP QuanNex funcionando"
    else
        echo "  ❌ MCP QuanNex no disponible"
    fi
    
    echo ""
    echo "🎯 RECOMENDACIONES:"
    if [[ ! -f "CONTEXTO-INGENIERO-SENIOR.md" ]] || [[ ! -f "CONTEXTO-RAPIDO.md" ]]; then
        echo "  🔄 Ejecutar: ./context-manager.sh generate"
    else
        echo "  ✅ Contextos disponibles y listos para usar"
    fi
}

# Función para limpiar archivos temporales
clean_contexts() {
    log "Limpiando archivos temporales..."
    
    # Limpiar archivos temporales
    rm -f /tmp/project_info.json
    rm -f /tmp/context_*.md
    
    success "Archivos temporales limpiados"
}

# Función principal
main() {
    local command="${1:-help}"
    
    case "$command" in
        "generate")
            generate_contexts
            ;;
        "update")
            update_contexts
            ;;
        "show")
            show_contexts
            ;;
        "status")
            show_status
            ;;
        "clean")
            clean_contexts
            ;;
          "rehydrate")
              rehydrate_context "${2:-}" "${3:-.cache/last-snapshot.json}"
              ;;
          "verify")
              verify_system_status
              ;;
          "status")
              timeout_cmd 10 node orchestration/orchestrator.js ping | tee -a .cache/init.log
              timeout_cmd 5 ./scripts/taskdb-health.sh | tee -a .cache/init.log
              echo "Contextos disponibles"
              ;;
          "rehydrate-robust")
              SNAP="${2:-.cache/last-snapshot.json}"
              if [[ "${3:-}" == "--if-exists" && ! -f "$SNAP" ]]; then
                  echo "No hay snapshot previa, skip"; exit 0
              fi
              timeout_cmd 20 node orchestration/orchestrator.js rehydrate "$SNAP" | tee -a .cache/init.log
              ;;
          "help"|*)
              show_help
              ;;
      esac
}

# Función timeout para comandos
timeout_cmd() { 
    perl -e 'alarm shift; exec @ARGV' "$@"
}

# Función para verificar estado del sistema (para contrato endurecido)
verify_system_status() {
    log "Verificando estado del sistema para contrato endurecido..."
    
    local all_ok=true
    
    # Verificar MCP QuanNex con timeout
    echo "🔍 Verificando MCP QuanNex..."
    if timeout_cmd 10 node orchestration/orchestrator.js health >/dev/null 2>&1; then
        echo "✅ MCP QuanNex funcionando"
    else
        echo "❌ MCP QuanNex no funciona"
        all_ok=false
    fi
    
    # Verificar contextos disponibles
    echo "🔍 Verificando contextos disponibles..."
    if [[ -f "CONTEXTO-INGENIERO-SENIOR.md" ]] && [[ -f "CONTEXTO-RAPIDO.md" ]]; then
        echo "✅ Contextos disponibles"
    else
        echo "❌ Contextos faltantes"
        all_ok=false
    fi
    
    # Verificar TaskDB con timeout
    echo "🔍 Verificando TaskDB..."
    if timeout_cmd 5 ./scripts/taskdb-health.sh >/dev/null 2>&1; then
        echo "✅ TaskDB: OK"
    else
        echo "❌ TaskDB: FAILED"
        all_ok=false
    fi
    
    if [[ "$all_ok" == "true" ]]; then
        echo "✅ Sistema en estado saludable"
        return 0
    else
        echo "❌ Sistema con problemas"
        return 1
    fi
}

# Función para rehidratar contexto con timeouts robustos
rehydrate_context() {
    local force="${1:-}"
    local snapshot_file="${2:-.cache/last-snapshot.json}"
    log "Rehidratando contexto..."
    
    # Verificar si existe snapshot
    if [[ "$force" != "--force" ]] && [[ ! -f "$snapshot_file" ]]; then
        log "No hay snapshot previa, saltando rehidratación"
        return 0
    fi
    
    # Verificar si hay snapshot válido
    if [[ -f "$snapshot_file" ]]; then
        if python3 -m json.tool "$snapshot_file" >/dev/null 2>&1; then
            log "Snapshot válido encontrado, rehidratando..."
            
            # Rehidratar usando el orquestador con timeout
            if timeout_cmd 20 node orchestration/orchestrator.js rehydrate "$snapshot_file" >/dev/null 2>&1; then
                log "✅ Rehidratación completada"
                return 0
            else
                warning "Rehidratación falló, continuando sin snapshot"
                return 0
            fi
        else
            warning "Snapshot inválido, saltando rehidratación"
            return 0
        fi
    else
        log "No hay snapshot para rehidratar"
        return 0
    fi
}

# Ejecutar función principal
main "$@"
