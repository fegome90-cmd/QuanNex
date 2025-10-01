#!/bin/bash
set -euo pipefail

# Script de Monitoreo de Salud del TaskDB
# Este script monitorea la integridad del TaskDB y previene corrupción

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TASKDB_PROTECTION="$PROJECT_ROOT/core/taskdb-protection.js"
TASKDB_PATH="$PROJECT_ROOT/data/taskdb.json"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[TASKDB-MONITOR]${NC} $1"
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

# Verificar si el sistema de protección existe
if [[ ! -f "$TASKDB_PROTECTION" ]]; then
    error "TaskDB Protection System not found: $TASKDB_PROTECTION"
    exit 1
fi

log "Iniciando monitoreo de salud del TaskDB..."

# 1. Validar integridad del TaskDB
log "Validando integridad del TaskDB..."
VALIDATION_RESULT=$(node "$TASKDB_PROTECTION" 2>&1 || echo "Validation failed")

if echo "$VALIDATION_RESULT" | grep -q "TaskDB is valid"; then
    success "TaskDB validation passed"
else
    error "TaskDB validation failed:"
    echo "$VALIDATION_RESULT" | grep -E "(ERROR|WARN)" || true
    
    # Intentar reparación automática
    log "Intentando reparación automática..."
    REPAIR_RESULT=$(node "$TASKDB_PROTECTION" --repair 2>&1 || echo "Repair failed")
    
    if echo "$REPAIR_RESULT" | grep -q "repaired successfully"; then
        success "TaskDB auto-repair completed"
    else
        error "TaskDB auto-repair failed:"
        echo "$REPAIR_RESULT" | grep -E "(ERROR|WARN)" || true
        exit 1
    fi
fi

# 2. Verificar archivo TaskDB
log "Verificando archivo TaskDB..."
if [[ -f "$TASKDB_PATH" ]]; then
    FILE_SIZE=$(stat -f%z "$TASKDB_PATH" 2>/dev/null || echo "0")
    if [[ "$FILE_SIZE" -gt 0 ]]; then
        success "TaskDB file exists and has content (${FILE_SIZE} bytes)"
    else
        error "TaskDB file is empty"
        exit 1
    fi
else
    error "TaskDB file not found: $TASKDB_PATH"
    exit 1
fi

# 3. Verificar estructura JSON
log "Verificando estructura JSON..."
if command -v jq &> /dev/null; then
    if jq empty "$TASKDB_PATH" 2>/dev/null; then
        success "TaskDB JSON structure is valid"
        
        # Verificar campos requeridos
        VERSION=$(jq -r '.version // "missing"' "$TASKDB_PATH")
        PROJECTS_COUNT=$(jq -r '.projects | length' "$TASKDB_PATH")
        TASKS_COUNT=$(jq -r '.tasks | length' "$TASKDB_PATH")
        
        echo "  📊 Versión: $VERSION"
        echo "  📁 Proyectos: $PROJECTS_COUNT"
        echo "  📋 Tareas: $TASKS_COUNT"
        
        # Verificar propiedades inválidas
        INVALID_PROPS=$(jq -r 'keys[] | select(. != "version" and . != "projects" and . != "tasks")' "$TASKDB_PATH" 2>/dev/null || echo "")
        if [[ -n "$INVALID_PROPS" ]]; then
            warn "Propiedades inválidas detectadas: $INVALID_PROPS"
        fi
        
    else
        error "TaskDB JSON structure is invalid"
        exit 1
    fi
else
    warn "jq not available, skipping JSON validation"
fi

# 4. Verificar backups
log "Verificando backups del TaskDB..."
BACKUPS=$(node "$TASKDB_PROTECTION" --list-backups 2>/dev/null || echo "No backups")
if echo "$BACKUPS" | grep -q "Available backups"; then
    BACKUP_COUNT=$(echo "$BACKUPS" | grep -c "taskdb-backup-" || echo "0")
    success "Backups disponibles: $BACKUP_COUNT"
    
    # Mostrar últimos 3 backups
    echo "$BACKUPS" | head -n 4 | tail -n 3 | while read -r line; do
        if [[ -n "$line" ]]; then
            echo "  📦 $line"
        fi
    done
else
    warn "No hay backups disponibles"
fi

# 5. Verificar locks
log "Verificando locks del TaskDB..."
LOCK_FILE="$PROJECT_ROOT/.reports/taskdb.lock"
if [[ -f "$LOCK_FILE" ]]; then
    LOCK_CONTENT=$(cat "$LOCK_FILE" 2>/dev/null || echo "{}")
    LOCK_TIME=$(echo "$LOCK_CONTENT" | jq -r '.timestamp // "unknown"' 2>/dev/null || echo "unknown")
    LOCK_PID=$(echo "$LOCK_CONTENT" | jq -r '.pid // "unknown"' 2>/dev/null || echo "unknown")
    
    if [[ "$LOCK_TIME" != "unknown" ]]; then
        LOCK_DATE=$(date -j -f "%Y-%m-%dT%H:%M:%S.%fZ" "$LOCK_TIME" "+%s" 2>/dev/null || echo "0")
        NOW=$(date +%s)
        LOCK_AGE=$((NOW - LOCK_DATE))
        
        if [[ $LOCK_AGE -gt 300 ]]; then # 5 minutos
            warn "Lock expirado detectado (${LOCK_AGE}s), removiendo..."
            rm -f "$LOCK_FILE"
        else
            warn "Lock activo detectado (PID: $LOCK_PID, edad: ${LOCK_AGE}s)"
        fi
    else
        warn "Lock file corrupto, removiendo..."
        rm -f "$LOCK_FILE"
    fi
else
    success "No hay locks activos"
fi

# 6. Verificar permisos
log "Verificando permisos del TaskDB..."
if [[ -r "$TASKDB_PATH" ]]; then
    success "TaskDB es legible"
else
    error "TaskDB no es legible"
    exit 1
fi

if [[ -w "$TASKDB_PATH" ]]; then
    success "TaskDB es escribible"
else
    error "TaskDB no es escribible"
    exit 1
fi

# 7. Verificar directorio de backups
log "Verificando directorio de backups..."
BACKUP_DIR="$PROJECT_ROOT/.reports/taskdb-backups"
if [[ -d "$BACKUP_DIR" ]]; then
    success "Directorio de backups existe"
    
    # Verificar espacio en disco
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "unknown")
    echo "  💾 Tamaño de backups: $BACKUP_SIZE"
    
    # Limpiar backups antiguos si es necesario
    if [[ -f "$TASKDB_PROTECTION" ]]; then
        CLEANUP_RESULT=$(node -e "
            import('./core/taskdb-protection.js').then(m => {
                const protection = new m.default();
                const result = protection.cleanOldBackups(7);
                console.log(JSON.stringify(result));
            });
        " 2>/dev/null || echo '{"removed":0,"kept":0}')
        
        REMOVED=$(echo "$CLEANUP_RESULT" | jq -r '.removed // 0' 2>/dev/null || echo "0")
        KEPT=$(echo "$CLEANUP_RESULT" | jq -r '.kept // 0' 2>/dev/null || echo "0")
        
        if [[ "$REMOVED" -gt 0 ]]; then
            success "Backups antiguos limpiados: $REMOVED removidos, $KEPT mantenidos"
        fi
    fi
else
    warn "Directorio de backups no existe"
fi

# 8. Verificar integridad de referencias
log "Verificando integridad de referencias..."
if command -v jq &> /dev/null; then
    # Verificar que todas las tareas referencian proyectos existentes
    ORPHAN_TASKS=$(jq -r '
        .tasks[] | 
        select(.project_id as $pid | (.projects | map(.id) | index($pid)) == null) |
        .id
    ' "$TASKDB_PATH" 2>/dev/null || echo "")
    
    if [[ -n "$ORPHAN_TASKS" ]]; then
        warn "Tareas huérfanas detectadas: $ORPHAN_TASKS"
    else
        success "Todas las tareas referencian proyectos válidos"
    fi
    
    # Verificar IDs únicos
    DUPLICATE_PROJECTS=$(jq -r '.projects | group_by(.id) | map(select(length > 1)) | map(.[0].id)' "$TASKDB_PATH" 2>/dev/null || echo "[]")
    DUPLICATE_TASKS=$(jq -r '.tasks | group_by(.id) | map(select(length > 1)) | map(.[0].id)' "$TASKDB_PATH" 2>/dev/null || echo "[]")
    
    if [[ "$DUPLICATE_PROJECTS" != "[]" ]]; then
        warn "IDs de proyectos duplicados: $DUPLICATE_PROJECTS"
    fi
    
    if [[ "$DUPLICATE_TASKS" != "[]" ]]; then
        warn "IDs de tareas duplicados: $DUPLICATE_TASKS"
    fi
    
    if [[ "$DUPLICATE_PROJECTS" == "[]" && "$DUPLICATE_TASKS" == "[]" ]]; then
        success "Todos los IDs son únicos"
    fi
fi

# 9. Mostrar resumen final
echo ""
log "📊 Resumen del Monitoreo de TaskDB:"

# Contar problemas
PROBLEMS=0

# Verificar validación
if ! echo "$VALIDATION_RESULT" | grep -q "TaskDB is valid"; then
    PROBLEMS=$((PROBLEMS + 1))
fi

# Verificar archivo
if [[ ! -f "$TASKDB_PATH" ]] || [[ $(stat -f%z "$TASKDB_PATH" 2>/dev/null || echo "0") -eq 0 ]]; then
    PROBLEMS=$((PROBLEMS + 1))
fi

# Verificar locks
if [[ -f "$LOCK_FILE" ]]; then
    PROBLEMS=$((PROBLEMS + 1))
fi

if [[ $PROBLEMS -eq 0 ]]; then
    success "TaskDB está saludable y protegido contra corrupción"
    log "✅ No se detectaron problemas críticos"
else
    warn "Se detectaron $PROBLEMS problemas en el TaskDB"
    log "⚠️  Revisar logs y considerar reparación manual"
fi

# 10. Mostrar recomendaciones
echo ""
log "💡 Recomendaciones:"

if [[ ! -f "$TASKDB_PATH" ]]; then
    echo "  - Crear TaskDB inicial"
fi

if echo "$BACKUPS" | grep -q "No backups"; then
    echo "  - Crear backup inicial del TaskDB"
fi

if [[ -f "$LOCK_FILE" ]]; then
    echo "  - Verificar procesos que puedan estar bloqueando el TaskDB"
fi

# 11. Mostrar comandos útiles
echo ""
log "🔧 Comandos útiles:"
echo "  - Validar TaskDB: node $TASKDB_PROTECTION"
echo "  - Reparar TaskDB: node $TASKDB_PROTECTION --repair"
echo "  - Crear backup: node $TASKDB_PROTECTION --backup"
echo "  - Listar backups: node $TASKDB_PROTECTION --list-backups"
echo "  - Ver TaskDB: cat $TASKDB_PATH | jq ."

log "Monitoreo de salud del TaskDB completado"
