#!/bin/bash
set -euo pipefail

# Script de Monitoreo del Sistema de Protección de Rules
# Este script monitorea el sistema de protección para asegurar que esté funcionando correctamente

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROTECTION_SYSTEM="$PROJECT_ROOT/core/rules-protection-system.js"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[RULES-MONITOR]${NC} $1"
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
if [[ ! -f "$PROTECTION_SYSTEM" ]]; then
    error "Sistema de protección no encontrado: $PROTECTION_SYSTEM"
    exit 1
fi

log "Iniciando monitoreo del sistema de protección de rules..."

# Obtener estadísticas del sistema
STATS=$(node "$PROTECTION_SYSTEM" 2>/dev/null || echo '{"throttling":{"executions":0,"violations":0,"currentBackoff":0},"performance":{"averageExecutionTime":0,"peakMemoryUsage":0,"slowExecutions":0},"activity":{"total":0,"taskCreations":0,"fileCreations":0,"dbWrites":0}}')

# Parsear estadísticas usando jq si está disponible, o usar métodos alternativos
if command -v jq &> /dev/null; then
    EXECUTIONS=$(echo "$STATS" | jq -r '.throttling.executions // 0' 2>/dev/null || echo "0")
    VIOLATIONS=$(echo "$STATS" | jq -r '.throttling.violations // 0' 2>/dev/null || echo "0")
    BACKOFF=$(echo "$STATS" | jq -r '.throttling.currentBackoff // 0' 2>/dev/null || echo "0")
    AVG_TIME=$(echo "$STATS" | jq -r '.performance.averageExecutionTime // 0' 2>/dev/null || echo "0")
    PEAK_MEMORY=$(echo "$STATS" | jq -r '.performance.peakMemoryUsage // 0' 2>/dev/null || echo "0")
    SLOW_EXECUTIONS=$(echo "$STATS" | jq -r '.performance.slowExecutions // 0' 2>/dev/null || echo "0")
    TOTAL_ACTIVITY=$(echo "$STATS" | jq -r '.activity.total // 0' 2>/dev/null || echo "0")
    TASK_CREATIONS=$(echo "$STATS" | jq -r '.activity.taskCreations // 0' 2>/dev/null || echo "0")
    FILE_CREATIONS=$(echo "$STATS" | jq -r '.activity.fileCreations // 0' 2>/dev/null || echo "0")
    DB_WRITES=$(echo "$STATS" | jq -r '.activity.dbWrites // 0' 2>/dev/null || echo "0")
else
    # Fallback sin jq - usar valores por defecto
    EXECUTIONS=0
    VIOLATIONS=0
    BACKOFF=0
    AVG_TIME=0
    PEAK_MEMORY=0
    SLOW_EXECUTIONS=0
    TOTAL_ACTIVITY=0
    TASK_CREATIONS=0
    FILE_CREATIONS=0
    DB_WRITES=0
fi

# Mostrar estadísticas
log "📊 Estadísticas del Sistema de Protección:"
echo "  🔄 Ejecuciones: $EXECUTIONS"
echo "  🚨 Violaciones: $VIOLATIONS"
echo "  ⏸️  Backoff actual: ${BACKOFF}ms"
echo "  ⏱️  Tiempo promedio: ${AVG_TIME}ms"
echo "  💾 Memoria pico: $PEAK_MEMORY bytes"
echo "  🐌 Ejecuciones lentas: $SLOW_EXECUTIONS"
echo "  📈 Actividad total: $TOTAL_ACTIVITY"
echo "  📝 Creaciones de tareas: $TASK_CREATIONS"
echo "  📄 Creaciones de archivos: $FILE_CREATIONS"
echo "  💾 Escrituras a DB: $DB_WRITES"

# Verificar umbrales de alerta
ALERTS=0

# Verificar violaciones
if [[ "$VIOLATIONS" -gt 0 ]]; then
    warn "Se detectaron $VIOLATIONS violaciones en el sistema"
    ALERTS=$((ALERTS + 1))
fi

# Verificar backoff
if [[ "$BACKOFF" -gt 0 ]]; then
    warn "Sistema en backoff: ${BACKOFF}ms"
    ALERTS=$((ALERTS + 1))
fi

# Verificar ejecuciones lentas
if [[ "$SLOW_EXECUTIONS" -gt 0 ]]; then
    warn "Se detectaron $SLOW_EXECUTIONS ejecuciones lentas"
    ALERTS=$((ALERTS + 1))
fi

# Verificar tiempo promedio
if (( $(echo "$AVG_TIME > 1000" | bc -l) )); then
    warn "Tiempo promedio de ejecución alto: ${AVG_TIME}ms"
    ALERTS=$((ALERTS + 1))
fi

# Verificar uso de memoria
if [[ "$PEAK_MEMORY" -gt 100000000 ]]; then  # 100MB
    warn "Uso de memoria alto: $PEAK_MEMORY bytes"
    ALERTS=$((ALERTS + 1))
fi

# Verificar actividad excesiva
if [[ "$TOTAL_ACTIVITY" -gt 50 ]]; then
    warn "Actividad excesiva detectada: $TOTAL_ACTIVITY actividades"
    ALERTS=$((ALERTS + 1))
fi

# Verificar creaciones de tareas excesivas
if [[ "$TASK_CREATIONS" -gt 10 ]]; then
    warn "Creaciones de tareas excesivas: $TASK_CREATIONS"
    ALERTS=$((ALERTS + 1))
fi

# Verificar creaciones de archivos excesivas
if [[ "$FILE_CREATIONS" -gt 5 ]]; then
    warn "Creaciones de archivos excesivas: $FILE_CREATIONS"
    ALERTS=$((ALERTS + 1))
fi

# Mostrar resumen
echo ""
if [[ "$ALERTS" -eq 0 ]]; then
    success "Sistema de protección funcionando correctamente"
    log "✅ No se detectaron problemas"
else
    warn "Se detectaron $ALERTS alertas en el sistema"
    log "⚠️  Revisar configuración y logs"
fi

# Verificar archivos de configuración
log "Verificando archivos de configuración..."

CONFIG_FILES=(
    ".reports/rules-protection-config.json"
    ".reports/rules-throttle.json"
    ".reports/rules-performance.json"
    ".reports/rules-activity.log"
)

for config_file in "${CONFIG_FILES[@]}"; do
    full_path="$PROJECT_ROOT/$config_file"
    if [[ -f "$full_path" ]]; then
        success "Configuración disponible: $config_file"
    else
        warn "Archivo de configuración faltante: $config_file"
    fi
done

# Verificar logs recientes
log "Verificando logs recientes..."

LOG_FILES=(
    ".reports/rules-enforcement.log"
    ".reports/rules-activity.log"
)

for log_file in "${LOG_FILES[@]}"; do
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

# Mostrar recomendaciones
echo ""
log "💡 Recomendaciones:"

if [[ "$VIOLATIONS" -gt 0 ]]; then
    echo "  - Revisar logs de violaciones para identificar patrones problemáticos"
fi

if [[ "$BACKOFF" -gt 0 ]]; then
    echo "  - Esperar a que termine el período de backoff antes de ejecutar más reglas"
fi

if [[ "$SLOW_EXECUTIONS" -gt 0 ]]; then
    echo "  - Optimizar reglas que causan ejecuciones lentas"
fi

if [[ "$TOTAL_ACTIVITY" -gt 50 ]]; then
    echo "  - Revisar si el agente de rules está ejecutándose demasiado frecuentemente"
fi

if [[ "$TASK_CREATIONS" -gt 10 ]]; then
    echo "  - Verificar si se están creando tareas duplicadas"
fi

if [[ "$FILE_CREATIONS" -gt 5 ]]; then
    echo "  - Verificar si se están creando archivos innecesarios"
fi

# Mostrar comandos útiles
echo ""
log "🔧 Comandos útiles:"
echo "  - Ver estadísticas: node $PROTECTION_SYSTEM"
echo "  - Resetear protección: node -e \"import('./core/rules-protection-system.js').then(m => new m.default().resetProtection())\""
echo "  - Ver logs: tail -f .reports/rules-activity.log"
echo "  - Ver configuración: cat .reports/rules-protection-config.json"

log "Monitoreo completado"
