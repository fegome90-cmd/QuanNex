#!/bin/bash
set -euo pipefail

# Script de Monitoreo de Integridad del Sistema
# Este script monitorea la integridad completa del sistema de logging y protección

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CENTRALIZED_LOGGER="$PROJECT_ROOT/core/centralized-logger.js"
INTEGRITY_VALIDATOR="$PROJECT_ROOT/core/integrity-validator.js"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[SYSTEM-MONITOR]${NC} $1"
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

# Verificar si el logger centralizado existe
if [[ ! -f "$CENTRALIZED_LOGGER" ]]; then
    error "Centralized logger not found: $CENTRALIZED_LOGGER"
    exit 1
fi

log "Iniciando monitoreo de integridad del sistema..."

# 1. Obtener estadísticas del sistema centralizado
log "Obteniendo estadísticas del sistema centralizado..."
CENTRALIZED_STATS=$(node "$CENTRALIZED_LOGGER" --json-only 2>/dev/null || echo '{}')

# Parsear estadísticas usando jq si está disponible
if command -v jq &> /dev/null; then
    TOTAL_EXECUTIONS=$(echo "$CENTRALIZED_STATS" | jq -r '.total.executions // 0' 2>/dev/null || echo "0")
    TOTAL_VIOLATIONS=$(echo "$CENTRALIZED_STATS" | jq -r '.total.violations // 0' 2>/dev/null || echo "0")
    TOTAL_ACTIVITIES=$(echo "$CENTRALIZED_STATS" | jq -r '.total.activities // 0' 2>/dev/null || echo "0")
    RECENT_ACTIVITIES=$(echo "$CENTRALIZED_STATS" | jq -r '.recent.activities // 0' 2>/dev/null || echo "0")
    TASK_CREATIONS=$(echo "$CENTRALIZED_STATS" | jq -r '.recent.taskCreations // 0' 2>/dev/null || echo "0")
    FILE_CREATIONS=$(echo "$CENTRALIZED_STATS" | jq -r '.recent.fileCreations // 0' 2>/dev/null || echo "0")
    PROJECT_CREATIONS=$(echo "$CENTRALIZED_STATS" | jq -r '.recent.projectCreations // 0' 2>/dev/null || echo "0")
    
    # Debug: mostrar estadísticas raw si hay problemas
    if [[ "$TOTAL_EXECUTIONS" -eq 0 ]]; then
        warn "Debug: Estadísticas raw del logger centralizado:"
        echo "$CENTRALIZED_STATS" | jq '.' 2>/dev/null || echo "Error parseando JSON"
    fi
else
    # Fallback sin jq - intentar parsear manualmente
    TOTAL_EXECUTIONS=$(echo "$CENTRALIZED_STATS" | grep -o '"executions":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    TOTAL_VIOLATIONS=$(echo "$CENTRALIZED_STATS" | grep -o '"violations":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    TOTAL_ACTIVITIES=$(echo "$CENTRALIZED_STATS" | grep -o '"activities":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    RECENT_ACTIVITIES=0
    TASK_CREATIONS=0
    FILE_CREATIONS=0
    PROJECT_CREATIONS=0
fi

# Mostrar estadísticas centralizadas
log "📊 Estadísticas del Sistema Centralizado:"
echo "  🔄 Total ejecuciones: $TOTAL_EXECUTIONS"
echo "  🚨 Total violaciones: $TOTAL_VIOLATIONS"
echo "  📈 Total actividades: $TOTAL_ACTIVITIES"
echo "  ⏰ Actividades recientes (1h): $RECENT_ACTIVITIES"
echo "  📝 Creaciones de tareas (1h): $TASK_CREATIONS"
echo "  📄 Creaciones de archivos (1h): $FILE_CREATIONS"
echo "  🏗️  Creaciones de proyectos (1h): $PROJECT_CREATIONS"

# 2. Ejecutar validador de integridad
log "Ejecutando validador de integridad..."
if [[ -f "$INTEGRITY_VALIDATOR" ]]; then
    INTEGRITY_RESULT=$(node "$INTEGRITY_VALIDATOR" 2>&1 || echo "Validation failed")
    
    if echo "$INTEGRITY_RESULT" | grep -q "Sistema completamente íntegro"; then
        success "Sistema de integridad validado correctamente"
    else
        warn "Problemas de integridad detectados:"
        echo "$INTEGRITY_RESULT" | grep -E "(CRÍTICOS|ALTOS|MEDIUM|LOW)" || true
    fi
else
    warn "Validador de integridad no encontrado"
fi

# 3. Verificar archivos de logging
log "Verificando archivos de logging..."

LOGGING_FILES=(
    ".reports/centralized-system.log"
    ".reports/system-metrics.json"
    ".reports/activity-tracker.json"
    ".reports/rules-protection-config.json"
    ".reports/rules-throttle.json"
    ".reports/rules-performance.json"
)

for log_file in "${LOGGING_FILES[@]}"; do
    full_path="$PROJECT_ROOT/$log_file"
    if [[ -f "$full_path" ]]; then
        # Verificar si el archivo tiene contenido reciente (últimas 24 horas)
        if [[ $(find "$full_path" -mtime -1 2>/dev/null) ]]; then
            success "Log activo: $log_file"
        else
            warn "Log inactivo: $log_file"
        fi
    else
        warn "Log faltante: $log_file"
    fi
done

# 4. Verificar consistencia de datos
log "Verificando consistencia de datos..."

# Verificar que las métricas centralizadas coincidan con los archivos individuales
THROTTLE_EXECUTIONS=0
if [[ -f "$PROJECT_ROOT/.reports/rules-throttle.json" ]]; then
    if command -v jq &> /dev/null; then
        THROTTLE_EXECUTIONS=$(jq -r '.executions | length' "$PROJECT_ROOT/.reports/rules-throttle.json" 2>/dev/null || echo "0")
    fi
fi

if [[ "$TOTAL_EXECUTIONS" != "$THROTTLE_EXECUTIONS" ]]; then
    warn "Inconsistencia en conteo de ejecuciones: Centralizado=$TOTAL_EXECUTIONS, Throttle=$THROTTLE_EXECUTIONS"
else
    success "Conteo de ejecuciones consistente"
fi

# 5. Verificar logs recientes
log "Verificando logs recientes..."

if [[ -f "$PROJECT_ROOT/.reports/centralized-system.log" ]]; then
    RECENT_LOGS=$(tail -n 10 "$PROJECT_ROOT/.reports/centralized-system.log" 2>/dev/null | wc -l)
    if [[ "$RECENT_LOGS" -gt 0 ]]; then
        success "Logs recientes disponibles ($RECENT_LOGS líneas)"
        
        # Mostrar últimas 3 líneas de log
        echo "  📋 Últimas entradas:"
        tail -n 3 "$PROJECT_ROOT/.reports/centralized-system.log" 2>/dev/null | while read -r line; do
            if [[ -n "$line" ]]; then
                echo "    $line"
            fi
        done
    else
        warn "No hay logs recientes"
    fi
else
    warn "Log centralizado no encontrado"
fi

# 6. Verificar componentes del sistema
log "Verificando componentes del sistema..."

COMPONENTS=(
    "core/centralized-logger.js"
    "core/rules-enforcer.js"
    "core/rules-protection-system.js"
    "core/integrity-validator.js"
    "scripts/monitor-system-integrity.sh"
)

for component in "${COMPONENTS[@]}"; do
    if [[ -f "$PROJECT_ROOT/$component" ]]; then
        success "Componente disponible: $component"
    else
        error "Componente faltante: $component"
    fi
done

# 7. Verificar permisos de ejecución
log "Verificando permisos de ejecución..."

EXECUTABLE_FILES=(
    "core/centralized-logger.js"
    "core/rules-enforcer.js"
    "core/rules-protection-system.js"
    "core/integrity-validator.js"
    "scripts/monitor-system-integrity.sh"
)

for file in "${EXECUTABLE_FILES[@]}"; do
    full_path="$PROJECT_ROOT/$file"
    if [[ -f "$full_path" ]]; then
        if [[ -x "$full_path" ]]; then
            success "Ejecutable: $file"
        else
            warn "No ejecutable: $file"
        fi
    fi
done

# 8. Mostrar resumen final
echo ""
log "📊 Resumen del Monitoreo:"

# Contar problemas
PROBLEMS=0

# Verificar inconsistencias
if [[ "$TOTAL_EXECUTIONS" != "$THROTTLE_EXECUTIONS" ]]; then
    PROBLEMS=$((PROBLEMS + 1))
fi

# Verificar archivos faltantes
MISSING_FILES=0
for log_file in "${LOGGING_FILES[@]}"; do
    if [[ ! -f "$PROJECT_ROOT/$log_file" ]]; then
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [[ "$MISSING_FILES" -gt 0 ]]; then
    PROBLEMS=$((PROBLEMS + 1))
fi

# Verificar componentes faltantes
MISSING_COMPONENTS=0
for component in "${COMPONENTS[@]}"; do
    if [[ ! -f "$PROJECT_ROOT/$component" ]]; then
        MISSING_COMPONENTS=$((MISSING_COMPONENTS + 1))
    fi
done

if [[ "$MISSING_COMPONENTS" -gt 0 ]]; then
    PROBLEMS=$((PROBLEMS + 1))
fi

if [[ "$PROBLEMS" -eq 0 ]]; then
    success "Sistema de logging funcionando correctamente"
    log "✅ No se detectaron problemas críticos"
else
    warn "Se detectaron $PROBLEMS problemas en el sistema"
    log "⚠️  Revisar logs y configuración"
fi

# 9. Mostrar recomendaciones
echo ""
log "💡 Recomendaciones:"

if [[ "$TOTAL_EXECUTIONS" -eq 0 ]]; then
    echo "  - Ejecutar el sistema para generar métricas iniciales"
fi

if [[ "$RECENT_ACTIVITIES" -eq 0 ]]; then
    echo "  - Verificar que el sistema esté registrando actividades correctamente"
fi

if [[ "$TASK_CREATIONS" -gt 10 ]]; then
    echo "  - Revisar si se están creando tareas duplicadas"
fi

if [[ "$FILE_CREATIONS" -gt 5 ]]; then
    echo "  - Revisar si se están creando archivos innecesarios"
fi

# 10. Mostrar comandos útiles
echo ""
log "🔧 Comandos útiles:"
echo "  - Ver estadísticas: node $CENTRALIZED_LOGGER"
echo "  - Validar integridad: node $INTEGRITY_VALIDATOR"
echo "  - Ver logs: tail -f .reports/centralized-system.log"
echo "  - Ver métricas: cat .reports/system-metrics.json"
echo "  - Ver actividad: cat .reports/activity-tracker.json"

log "Monitoreo de integridad completado"
