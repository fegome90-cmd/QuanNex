#!/bin/bash
# QuanNex Daily Automation Script
# Ejecuta el sistema de semáforo y métricas diariamente

set -e

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
METRICS_DIR="$PROJECT_ROOT/data/metrics"
REPORTS_DIR="$PROJECT_ROOT/data/reports"

# Crear directorios si no existen
mkdir -p "$LOG_DIR" "$METRICS_DIR" "$REPORTS_DIR"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/quannex-daily.log"
}

# Función para ejecutar comando con logging
run_with_log() {
    local cmd="$1"
    local description="$2"
    
    log "🔄 $description"
    if eval "$cmd" >> "$LOG_DIR/quannex-daily.log" 2>&1; then
        log "✅ $description - ÉXITO"
        return 0
    else
        log "❌ $description - FALLO"
        return 1
    fi
}

# Función principal
main() {
    log "🚀 Iniciando automatización diaria QuanNex"
    
    # Cambiar al directorio del proyecto
    cd "$PROJECT_ROOT"
    
    # 1. Health checks básicos
    log "📋 Ejecutando health checks básicos..."
    run_with_log "npm run quannex:contracts" "Tests de contratos"
    run_with_log "npm run quannex:init" "Health checks del sistema"
    run_with_log "npm run quannex:smoke" "Smoke tests"
    
    # 2. Recolectar métricas diarias
    log "📊 Recolectando métricas diarias..."
    if run_with_log "npm run quannex:metrics" "Recolección de métricas"; then
        log "✅ Métricas recolectadas exitosamente"
    else
        log "⚠️ Error en recolección de métricas, continuando..."
    fi
    
    # 3. Evaluar semáforo
    log "🚦 Evaluando semáforo de arranque..."
    if run_with_log "npm run quannex:semaphore" "Evaluación del semáforo"; then
        log "✅ Evaluación del semáforo completada"
    else
        log "⚠️ Error en evaluación del semáforo"
    fi
    
    # 4. Generar reporte diario
    log "📋 Generando reporte diario..."
    if run_with_log "npm run quannex:metrics:report" "Reporte diario"; then
        log "✅ Reporte diario generado"
    else
        log "⚠️ Error generando reporte diario"
    fi
    
    # 5. Verificar estado del sistema
    log "🔍 Verificando estado general del sistema..."
    
    # Verificar archivos de métricas
    local today=$(date '+%Y-%m-%d')
    local metrics_file="$METRICS_DIR/quannex-$today.json"
    local report_file="$REPORTS_DIR/daily-report-$today.json"
    
    if [[ -f "$metrics_file" ]]; then
        log "✅ Archivo de métricas encontrado: $metrics_file"
    else
        log "❌ Archivo de métricas no encontrado: $metrics_file"
    fi
    
    if [[ -f "$report_file" ]]; then
        log "✅ Archivo de reporte encontrado: $report_file"
    else
        log "❌ Archivo de reporte no encontrado: $report_file"
    fi
    
    # 6. Limpieza de logs antiguos (mantener últimos 30 días)
    log "🧹 Limpiando logs antiguos..."
    find "$LOG_DIR" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    find "$METRICS_DIR" -name "quannex-*.json" -mtime +30 -delete 2>/dev/null || true
    find "$REPORTS_DIR" -name "daily-report-*.json" -mtime +30 -delete 2>/dev/null || true
    
    log "✅ Automatización diaria completada"
    
    # 7. Mostrar resumen
    echo ""
    log "📊 RESUMEN DE LA EJECUCIÓN:"
    log "=========================="
    
    # Mostrar estado del semáforo si está disponible
    if [[ -f "$report_file" ]]; then
        local semaphore_status=$(jq -r '.summary.semaphore_status // "UNKNOWN"' "$report_file" 2>/dev/null || echo "UNKNOWN")
        local recommendation=$(jq -r '.summary.recommendation // "UNKNOWN"' "$report_file" 2>/dev/null || echo "UNKNOWN")
        
        log "🚦 Estado del Semáforo: $semaphore_status"
        log "💡 Recomendación: $recommendation"
        
        if [[ "$semaphore_status" == "GREEN" ]]; then
            log "🎉 ¡Sistema listo para mejoras!"
        else
            log "⚠️ Sistema requiere estabilización"
        fi
    else
        log "❌ No se pudo determinar el estado del semáforo"
    fi
    
    log "📁 Logs guardados en: $LOG_DIR/quannex-daily.log"
    log "📊 Métricas en: $METRICS_DIR/"
    log "📋 Reportes en: $REPORTS_DIR/"
}

# Función de ayuda
show_help() {
    echo "QuanNex Daily Automation Script"
    echo "==============================="
    echo ""
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  --help, -h     Mostrar esta ayuda"
    echo "  --dry-run      Ejecutar sin hacer cambios reales"
    echo "  --verbose      Mostrar salida detallada"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Ejecutar automatización completa"
    echo "  $0 --dry-run          # Simular ejecución"
    echo "  $0 --verbose          # Ejecutar con salida detallada"
    echo ""
    echo "El script ejecuta automáticamente:"
    echo "  - Health checks básicos"
    echo "  - Recolección de métricas diarias"
    echo "  - Evaluación del semáforo"
    echo "  - Generación de reportes"
    echo "  - Limpieza de archivos antiguos"
}

# Procesar argumentos
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Configurar logging basado en verbosidad
if [[ "$VERBOSE" == "true" ]]; then
    # En modo verbose, mostrar todo en consola también
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/quannex-daily.log"
    }
else
    # En modo normal, solo log a archivo
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/quannex-daily.log"
    }
fi

# Ejecutar en modo dry-run si se especifica
if [[ "$DRY_RUN" == "true" ]]; then
    log "🔍 MODO DRY-RUN: Simulando ejecución sin cambios reales"
    log "📋 Comandos que se ejecutarían:"
    log "  - npm run quannex:contracts"
    log "  - npm run quannex:init"
    log "  - npm run quannex:smoke"
    log "  - npm run quannex:metrics"
    log "  - npm run quannex:semaphore"
    log "  - npm run quannex:metrics:report"
    log "✅ Simulación completada"
    exit 0
fi

# Ejecutar función principal
main "$@"
