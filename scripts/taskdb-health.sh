#!/usr/bin/env bash
# TaskDB Health Check - Verificar salud de TaskDB
set -euo pipefail

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[TASKDB-HEALTH]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

PROJECT_ROOT="/Users/felipe/Developer/startkit-main"
TASKDB_FILE="$PROJECT_ROOT/data/taskdb.json"

# Función para verificar que TaskDB existe
check_taskdb_exists() {
    if [[ -f "$TASKDB_FILE" ]]; then
        log "TaskDB file exists: $TASKDB_FILE"
        return 0
    else
        error "TaskDB file not found: $TASKDB_FILE"
        return 1
    fi
}

# Función para verificar que TaskDB es JSON válido
check_taskdb_valid_json() {
    if ! python3 -m json.tool "$TASKDB_FILE" >/dev/null 2>&1; then
        error "TaskDB is not valid JSON"
        return 1
    else
        log "TaskDB is valid JSON"
        return 0
    fi
}

# Función para verificar estructura básica de TaskDB
check_taskdb_structure() {
    local has_version=$(python3 -c "
import json
try:
    with open('$TASKDB_FILE', 'r') as f:
        data = json.load(f)
    print('version' in data)
except:
    print('False')
")
    
    if [[ "$has_version" == "True" ]]; then
        log "TaskDB has required structure (version field)"
        return 0
    else
        error "TaskDB missing required structure"
        return 1
    fi
}

# Función para verificar que TaskDB es escribible
check_taskdb_writable() {
    if [[ -w "$TASKDB_FILE" ]]; then
        log "TaskDB is writable"
        return 0
    else
        error "TaskDB is not writable"
        return 1
    fi
}

# Función para verificar backup de TaskDB
check_taskdb_backup() {
    local backup_file="$TASKDB_FILE.backup"
    if [[ -f "$backup_file" ]]; then
        log "TaskDB backup exists"
        return 0
    else
        warning "TaskDB backup not found (this is optional)"
        return 0
    fi
}

# Función principal
main() {
    log "Verificando salud de TaskDB..."
    
    local checks_passed=0
    local total_checks=4
    
    # Ejecutar verificaciones
    if check_taskdb_exists; then
        ((checks_passed++))
        
        if check_taskdb_valid_json; then
            ((checks_passed++))
            
            if check_taskdb_structure; then
                ((checks_passed++))
                
                if check_taskdb_writable; then
                    ((checks_passed++))
                fi
            fi
        fi
    fi
    
    # Verificar backup (opcional)
    check_taskdb_backup
    
    # Resultado final
    if [[ $checks_passed -eq $total_checks ]]; then
        log "✅ TaskDB: OK - $checks_passed/$total_checks checks passed"
        echo "TaskDB: OK"
        exit 0
    else
        error "❌ TaskDB: FAILED - $checks_passed/$total_checks checks passed"
        exit 1
    fi
}

# Ejecutar función principal
main "$@"
