#!/bin/bash
set -euo pipefail

# DAST Scanner Simplificado
# Versión simplificada para testing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/.reports"
DAST_DIR="$REPORTS_DIR/dast"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[DAST]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Crear directorios
mkdir -p "$DAST_DIR"

# Configuración
TARGET_URL=""
SCAN_TYPE="basic"
OUTPUT_FILE="$DAST_DIR/dast-report-$TIMESTAMP.json"
VERBOSE=false

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            SCAN_TYPE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        http*)
            TARGET_URL="$1"
            shift
            ;;
        *)
            error "Argumento desconocido: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$TARGET_URL" ]]; then
    error "URL objetivo requerida"
    exit 1
fi

# Función para hacer request HTTP simple
http_request() {
    local url="$1"
    local method="${2:-GET}"
    
    local response=$(curl -s -w "|%{http_code}" -X "$method" "$url" 2>/dev/null || echo "|000")
    local http_code=$(echo "$response" | cut -d'|' -f2)
    local body=$(echo "$response" | cut -d'|' -f1)
    
    echo "$http_code|$body"
}

# Escaneo básico simplificado
scan_basic() {
    local url="$1"
    local findings=()
    
    if [[ "$VERBOSE" == "true" ]]; then
        log "Escaneando $url"
    fi
    
    # 1. Verificar headers básicos
    local response=$(http_request "$url" "HEAD")
    local code=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2)
    
    if [[ "$code" == "200" ]]; then
        # Verificar headers de seguridad básicos
        if ! echo "$body" | grep -qi "x-content-type-options"; then
            findings+=("{\"type\":\"missing_security_header\",\"header\":\"X-Content-Type-Options\",\"severity\":\"medium\",\"description\":\"Missing security header X-Content-Type-Options\"}")
        fi
        
        if ! echo "$body" | grep -qi "x-frame-options"; then
            findings+=("{\"type\":\"missing_security_header\",\"header\":\"X-Frame-Options\",\"severity\":\"medium\",\"description\":\"Missing security header X-Frame-Options\"}")
        fi
    fi
    
    # 2. Verificar métodos HTTP
    local methods=("GET" "POST" "PUT" "DELETE")
    for method in "${methods[@]}"; do
        local method_response=$(http_request "$url" "$method")
        local method_code=$(echo "$method_response" | cut -d'|' -f1)
        
        if [[ "$method_code" =~ ^[23] ]]; then
            if [[ "$method" == "PUT" || "$method" == "DELETE" ]]; then
                findings+=("{\"type\":\"dangerous_method_allowed\",\"method\":\"$method\",\"severity\":\"high\",\"description\":\"Dangerous HTTP method allowed $method\"}")
            fi
        fi
    done
    
    if [[ ${#findings[@]} -gt 0 ]]; then
        echo "${findings[@]}"
    fi
}

# Función principal
main() {
    if [[ "$VERBOSE" == "true" ]]; then
        log "Iniciando DAST scan - Tipo: $SCAN_TYPE, Target: $TARGET_URL"
    fi
    
    local all_findings=()
    local basic_findings=$(scan_basic "$TARGET_URL")
    if [[ -n "$basic_findings" ]]; then
        read -ra findings_array <<< "$basic_findings"
        all_findings+=("${findings_array[@]}")
    fi
    
    # Contar por severidad
    local summary_high=0
    local summary_medium=0
    local summary_low=0
    
    if [[ ${#all_findings[@]} -gt 0 ]]; then
        for finding in "${all_findings[@]}"; do
            if [[ -n "$finding" ]]; then
                local severity=$(echo "$finding" | grep -o '"severity":"[^"]*"' | cut -d'"' -f4)
                case "$severity" in
                    "high") ((summary_high++)) ;;
                    "medium") ((summary_medium++)) ;;
                    "low") ((summary_low++)) ;;
                esac
            fi
        done
    fi
    
    # Generar reporte JSON simple
    cat > "$OUTPUT_FILE" << EOF
{
  "scan_info": {
    "target": "$TARGET_URL",
    "type": "$SCAN_TYPE",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "scanner_version": "1.0.0"
  },
  "summary": {
    "total_findings": ${#all_findings[@]},
    "high_severity": $summary_high,
    "medium_severity": $summary_medium,
    "low_severity": $summary_low
  },
  "findings": [
EOF

    local first=true
    if [[ ${#all_findings[@]} -gt 0 ]]; then
        for finding in "${all_findings[@]}"; do
            if [[ -n "$finding" ]]; then
                if [[ "$first" == "true" ]]; then
                    first=false
                else
                    echo "," >> "$OUTPUT_FILE"
                fi
                echo -n "    $finding" >> "$OUTPUT_FILE"
            fi
        done
    fi
    
    cat >> "$OUTPUT_FILE" << EOF

  ]
}
EOF

    # Mostrar resumen
    local total_findings=${#all_findings[@]}
    if [[ $total_findings -eq 0 ]]; then
        success "No se encontraron vulnerabilidades"
    else
        warn "Se encontraron $total_findings vulnerabilidades"
        log "Reporte guardado en: $OUTPUT_FILE"
    fi
    
    # Mostrar findings si es verbose
    if [[ "$VERBOSE" == "true" && $total_findings -gt 0 ]]; then
        echo
        log "Detalles de vulnerabilidades:"
        if [[ ${#all_findings[@]} -gt 0 ]]; then
            for finding in "${all_findings[@]}"; do
                if [[ -n "$finding" ]]; then
                    local severity=$(echo "$finding" | grep -o '"severity":"[^"]*"' | cut -d'"' -f4)
                    local description=$(echo "$finding" | grep -o '"description":"[^"]*"' | cut -d'"' -f4)
                    echo "  $severity: $description"
                fi
            done
        fi
    fi
    
    # Exit code basado en findings
    if [[ $total_findings -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Ejecutar
main "$@"
