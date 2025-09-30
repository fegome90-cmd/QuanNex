#!/bin/bash
set -euo pipefail

# Security Report Aggregator
# Combina múltiples reportes de seguridad en un resumen consolidado

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/.reports"
CONSOLIDATED_DIR="$REPORTS_DIR/consolidated"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[SEC-AGG]${NC} $1"
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

# Crear directorios necesarios
mkdir -p "$CONSOLIDATED_DIR" "$REPORTS_DIR"

# Configuración
OUTPUT_FILE="$CONSOLIDATED_DIR/consolidated-security-report-$TIMESTAMP.json"
VERBOSE=false

# Función de ayuda
show_help() {
    cat << EOF
Security Report Aggregator

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -o, --output FILE     Archivo de salida [default: auto-generated]
    -v, --verbose         Output detallado
    -h, --help            Mostrar esta ayuda

Este script combina reportes de:
- DAST scans
- Security dependencies scans
- npm audit
- gitleaks
- trivy
- ESLint security rules

EOF
}

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Argumento desconocido: $1"
            show_help
            exit 1
            ;;
    esac
done

# Función para leer y procesar reporte JSON
read_report() {
    local file="$1"
    local report_type="$2"
    
    if [[ ! -f "$file" ]]; then
        if [[ "$VERBOSE" == "true" ]]; then
            warn "Reporte no encontrado: $file"
        fi
        return
    fi
    
    log "Procesando $report_type: $file"
    
    # Leer y validar JSON
    if ! jq empty "$file" 2>/dev/null; then
        warn "Archivo JSON inválido: $file"
        return
    fi
    
    # Extraer información del reporte
    local findings=$(jq -r '.findings // []' "$file")
    local summary=$(jq -r '.summary // {}' "$file")
    
    echo "{\"type\":\"$report_type\",\"file\":\"$file\",\"findings\":$findings,\"summary\":$summary}"
}

# Función para procesar reporte de DAST
process_dast_report() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return
    fi
    
    log "Procesando reporte DAST: $file"
    
    # Extraer findings de DAST
    local findings=$(jq -r '.findings // []' "$file")
    local scan_info=$(jq -r '.scan_info // {}' "$file")
    
    echo "{\"type\":\"dast\",\"file\":\"$file\",\"findings\":$findings,\"scan_info\":$scan_info}"
}

# Función para procesar reporte de dependencias
process_deps_report() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return
    fi
    
    log "Procesando reporte de dependencias: $file"
    
    # Extraer findings de dependencias
    local findings=$(jq -r '.findings // []' "$file")
    local summary=$(jq -r '.summary // {}' "$file")
    
    echo "{\"type\":\"dependencies\",\"file\":\"$file\",\"findings\":$findings,\"summary\":$summary}"
}

# Función para procesar reporte de gitleaks
process_gitleaks_report() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return
    fi
    
    log "Procesando reporte gitleaks: $file"
    
    # Convertir gitleaks JSON a formato estándar
    local findings=$(jq -r '.[] | {
        "type": "secret_leak",
        "rule": .rule,
        "severity": .severity,
        "file": .file,
        "line": .line,
        "description": .description
    }' "$file" | jq -s '.')
    
    echo "{\"type\":\"gitleaks\",\"file\":\"$file\",\"findings\":$findings}"
}

# Función para procesar reporte de trivy
process_trivy_report() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return
    fi
    
    log "Procesando reporte trivy: $file"
    
    # Convertir trivy JSON a formato estándar
    local findings=$(jq -r '.Results[]?.Vulnerabilities[]? | {
        "type": "os_vulnerability",
        "vulnerability_id": .VulnerabilityID,
        "package": .PkgName,
        "severity": .Severity,
        "description": .Description,
        "title": .Title
    }' "$file" | jq -s '.')
    
    echo "{\"type\":\"trivy\",\"file\":\"$file\",\"findings\":$findings}"
}

# Función para procesar reporte de ESLint
process_eslint_report() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return
    fi
    
    log "Procesando reporte ESLint: $file"
    
    # Convertir ESLint JSON a formato estándar
    local findings=$(jq -r '.[] | {
        "type": "code_quality",
        "rule": .ruleId,
        "severity": .severity,
        "file": .filePath,
        "line": .line,
        "message": .message
    }' "$file" | jq -s '.')
    
    echo "{\"type\":\"eslint\",\"file\":\"$file\",\"findings\":$findings}"
}

# Función para generar resumen consolidado
generate_consolidated_summary() {
    local reports="$1"
    
    # Contar total de findings por tipo y severidad
    local total_findings=0
    local critical_count=0
    local high_count=0
    local medium_count=0
    local low_count=0
    local info_count=0
    
    # Contar por tipo de reporte
    local dast_count=0
    local deps_count=0
    local gitleaks_count=0
    local trivy_count=0
    local eslint_count=0
    
    # Procesar cada reporte
    while IFS= read -r report; do
        if [[ -n "$report" ]]; then
            local report_type=$(echo "$report" | jq -r '.type')
            local findings=$(echo "$report" | jq -r '.findings // []')
            local findings_count=$(echo "$findings" | jq 'length')
            
            total_findings=$((total_findings + findings_count))
            
            # Contar por tipo de reporte
            case "$report_type" in
                "dast") dast_count=$((dast_count + findings_count)) ;;
                "dependencies") deps_count=$((deps_count + findings_count)) ;;
                "gitleaks") gitleaks_count=$((gitleaks_count + findings_count)) ;;
                "trivy") trivy_count=$((trivy_count + findings_count)) ;;
                "eslint") eslint_count=$((eslint_count + findings_count)) ;;
            esac
            
            # Contar por severidad
            echo "$findings" | jq -r '.[] | .severity // "info"' | while read -r severity; do
                case "$severity" in
                    "critical"|"CRITICAL") ((critical_count++)) ;;
                    "high"|"HIGH") ((high_count++)) ;;
                    "medium"|"moderate"|"MEDIUM") ((medium_count++)) ;;
                    "low"|"LOW") ((low_count++)) ;;
                    *) ((info_count++)) ;;
                esac
            done
        fi
    done <<< "$reports"
    
    # Generar resumen
    cat << EOF
{
  "total_findings": $total_findings,
  "by_severity": {
    "critical": $critical_count,
    "high": $high_count,
    "medium": $medium_count,
    "low": $low_count,
    "info": $info_count
  },
  "by_tool": {
    "dast": $dast_count,
    "dependencies": $deps_count,
    "gitleaks": $gitleaks_count,
    "trivy": $trivy_count,
    "eslint": $eslint_count
  }
}
EOF
}

# Función principal
main() {
    log "Iniciando agregación de reportes de seguridad"
    
    # Buscar reportes disponibles
    local dast_reports=($(find "$REPORTS_DIR" -name "dast-report-*.json" 2>/dev/null || true))
    local deps_reports=($(find "$REPORTS_DIR" -name "security-deps-report-*.json" 2>/dev/null || true))
    local gitleaks_reports=($(find "$REPORTS_DIR" -name "gitleaks-report.json" 2>/dev/null || true))
    local trivy_reports=($(find "$REPORTS_DIR" -name "trivy-fs-report.json" 2>/dev/null || true))
    local eslint_reports=($(find "$REPORTS_DIR" -name "eslint-report.json" 2>/dev/null || true))
    
    log "Reportes encontrados:"
    log "  DAST: ${#dast_reports[@]}"
    log "  Dependencies: ${#deps_reports[@]}"
    log "  Gitleaks: ${#gitleaks_reports[@]}"
    log "  Trivy: ${#trivy_reports[@]}"
    log "  ESLint: ${#eslint_reports[@]}"
    
    # Procesar reportes
    local processed_reports=()
    
    # Procesar reportes DAST
    for report in "${dast_reports[@]}"; do
        processed_reports+=("$(process_dast_report "$report")")
    done
    
    # Procesar reportes de dependencias
    for report in "${deps_reports[@]}"; do
        processed_reports+=("$(process_deps_report "$report")")
    done
    
    # Procesar reportes gitleaks
    for report in "${gitleaks_reports[@]}"; do
        processed_reports+=("$(process_gitleaks_report "$report")")
    done
    
    # Procesar reportes trivy
    for report in "${trivy_reports[@]}"; do
        processed_reports+=("$(process_trivy_report "$report")")
    done
    
    # Procesar reportes ESLint
    for report in "${eslint_reports[@]}"; do
        processed_reports+=("$(process_eslint_report "$report")")
    done
    
    # Generar reporte consolidado
    local consolidated_json="{
        \"consolidated_info\": {
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"aggregator_version\": \"1.0.0\",
            \"reports_processed\": ${#processed_reports[@]}
        },
        \"summary\": $(generate_consolidated_summary "$(printf '%s\n' "${processed_reports[@]}")"),
        \"reports\": ["
    
    local first=true
    for report in "${processed_reports[@]}"; do
        if [[ -n "$report" ]]; then
            if [[ "$first" == "true" ]]; then
                first=false
            else
                consolidated_json+=","
            fi
            consolidated_json+="$report"
        fi
    done
    
    consolidated_json+="]
    }"
    
    # Guardar reporte consolidado
    echo "$consolidated_json" | jq '.' > "$OUTPUT_FILE"
    
    # Mostrar resumen
    local total_findings=$(echo "$consolidated_json" | jq -r '.summary.total_findings')
    if [[ $total_findings -eq 0 ]]; then
        success "No se encontraron vulnerabilidades en ningún reporte"
    else
        warn "Se encontraron $total_findings vulnerabilidades en total"
        log "Críticas: $(echo "$consolidated_json" | jq -r '.summary.by_severity.critical')"
        log "Altas: $(echo "$consolidated_json" | jq -r '.summary.by_severity.high')"
        log "Medias: $(echo "$consolidated_json" | jq -r '.summary.by_severity.medium')"
        log "Bajas: $(echo "$consolidated_json" | jq -r '.summary.by_severity.low')"
    fi
    
    log "Reporte consolidado guardado en: $OUTPUT_FILE"
    
    # Mostrar detalles si es verbose
    if [[ "$VERBOSE" == "true" && $total_findings -gt 0 ]]; then
        echo
        log "Detalles por herramienta:"
        echo "$consolidated_json" | jq -r '.summary.by_tool | to_entries[] | "\(.key): \(.value) findings"'
    fi
    
    # Exit code basado en findings críticos/altos
    local critical_count=$(echo "$consolidated_json" | jq -r '.summary.by_severity.critical')
    local high_count=$(echo "$consolidated_json" | jq -r '.summary.by_severity.high')
    
    if [[ $critical_count -gt 0 || $high_count -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Ejecutar función principal
main "$@"
