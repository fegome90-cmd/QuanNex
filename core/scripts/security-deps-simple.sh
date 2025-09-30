#!/bin/bash
set -euo pipefail

# Security Dependencies Scanner Simplificado

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/.reports"
SECURITY_DIR="$REPORTS_DIR/security"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SEC-DEPS]${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1" >&2; }

# Crear directorios
mkdir -p "$SECURITY_DIR"

# Configuración
OUTPUT_FILE="$SECURITY_DIR/security-deps-report-$TIMESTAMP.json"
VERBOSE=false
AUDIT_LEVEL="moderate"

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--level)
            AUDIT_LEVEL="$2"
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
        *)
            error "Argumento desconocido: $1"
            exit 1
            ;;
    esac
done

# Validar nivel de auditoría
if [[ ! "$AUDIT_LEVEL" =~ ^(low|moderate|high|critical)$ ]]; then
    error "Nivel de auditoría inválido: $AUDIT_LEVEL"
    exit 1
fi

# Función para escanear dependencias npm
scan_npm_deps() {
    local findings=()
    
    if [[ "$VERBOSE" == "true" ]]; then
        log "Escaneando dependencias npm..."
    fi
    
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        if [[ "$VERBOSE" == "true" ]]; then
            warn "package.json no encontrado, saltando escaneo npm"
        fi
        return
    fi
    
    # Ejecutar npm audit
    local audit_output
    if audit_output=$(cd "$PROJECT_ROOT" && npm audit --json 2>/dev/null); then
        if [[ "$VERBOSE" == "true" ]]; then
            log "npm audit completado sin vulnerabilidades"
        fi
    else
        local audit_exit_code=$?
        if [[ $audit_exit_code -eq 1 ]]; then
            if [[ "$VERBOSE" == "true" ]]; then
                log "Vulnerabilidades encontradas en dependencias npm"
            fi
            
            # Procesar vulnerabilidades por severidad
            echo "$audit_output" | jq -r '.vulnerabilities // {} | to_entries[] | select(.value.severity != null) | "\(.value.severity)|\(.key)|\(.value.title // "No title")|\(.value.range // "No range")"' | while IFS='|' read -r severity package title range; do
                case "$AUDIT_LEVEL" in
                    "critical")
                        if [[ "$severity" == "critical" ]]; then
                            findings+=("npm_vulnerability|$package|$severity|$title|$range")
                        fi
                        ;;
                    "high")
                        if [[ "$severity" =~ ^(critical|high)$ ]]; then
                            findings+=("npm_vulnerability|$package|$severity|$title|$range")
                        fi
                        ;;
                    "moderate")
                        if [[ "$severity" =~ ^(critical|high|moderate)$ ]]; then
                            findings+=("npm_vulnerability|$package|$severity|$title|$range")
                        fi
                        ;;
                    "low")
                        findings+=("npm_vulnerability|$package|$severity|$title|$range")
                        ;;
                esac
            done
        else
            if [[ "$VERBOSE" == "true" ]]; then
                error "Error ejecutando npm audit"
            fi
        fi
    fi
    
    # Imprimir findings
    for finding in "${findings[@]}"; do
        echo "$finding"
    done
}

# Función para escanear secretos con gitleaks
scan_secrets() {
    local findings=()
    
    if [[ "$VERBOSE" == "true" ]]; then
        log "Escaneando secretos con gitleaks..."
    fi
    
    # Verificar si gitleaks está disponible
    if ! command -v gitleaks &> /dev/null; then
        if [[ "$VERBOSE" == "true" ]]; then
            warn "gitleaks no está instalado, saltando escaneo de secretos"
        fi
        return
    fi
    
    # Ejecutar gitleaks
    local gitleaks_output
    if gitleaks_output=$(cd "$PROJECT_ROOT" && gitleaks detect --source . --report-format json --no-git 2>/dev/null); then
        if [[ "$VERBOSE" == "true" ]]; then
            log "gitleaks completado sin secretos encontrados"
        fi
    else
        local gitleaks_exit_code=$?
        if [[ $gitleaks_exit_code -eq 1 ]]; then
            if [[ "$VERBOSE" == "true" ]]; then
                log "Secretos encontrados en el código"
            fi
            
            # Procesar output de gitleaks
            echo "$gitleaks_output" | jq -r '.[] | "\(.rule)|\(.severity)|\(.file)|\(.line)"' | while IFS='|' read -r rule severity file line; do
                findings+=("secret_leak|$rule|$severity|$file|$line")
            done
        else
            if [[ "$VERBOSE" == "true" ]]; then
                error "Error ejecutando gitleaks"
            fi
        fi
    fi
    
    # Imprimir findings
    for finding in "${findings[@]}"; do
        echo "$finding"
    done
}

# Función principal
main() {
    if [[ "$VERBOSE" == "true" ]]; then
        log "Iniciando escaneo de seguridad de dependencias - Nivel: $AUDIT_LEVEL"
    fi
    
    # Ejecutar escaneos
    local npm_findings=$(scan_npm_deps)
    local secrets_findings=$(scan_secrets)
    
    # Procesar findings
    local total_findings=0
    local summary_critical=0
    local summary_high=0
    local summary_medium=0
    local summary_low=0
    local findings_json=""
    
    # Procesar findings de npm
    if [[ -n "$npm_findings" ]]; then
        while IFS='|' read -r type package severity title range; do
            ((total_findings++))
            
            case "$severity" in
                "critical") ((summary_critical++)) ;;
                "high") ((summary_high++)) ;;
                "medium") ((summary_medium++)) ;;
                "low") ((summary_low++)) ;;
            esac
            
            if [[ -n "$findings_json" ]]; then
                findings_json+=","
            fi
            
            findings_json+="{\"type\":\"$type\",\"package\":\"$package\",\"severity\":\"$severity\",\"title\":\"$title\",\"range\":\"$range\",\"source\":\"npm_audit\"}"
        done <<< "$npm_findings"
    fi
    
    # Procesar findings de gitleaks
    if [[ -n "$secrets_findings" ]]; then
        while IFS='|' read -r type rule severity file line; do
            ((total_findings++))
            
            case "$severity" in
                "critical") ((summary_critical++)) ;;
                "high") ((summary_high++)) ;;
                "medium") ((summary_medium++)) ;;
                "low") ((summary_low++)) ;;
            esac
            
            if [[ -n "$findings_json" ]]; then
                findings_json+=","
            fi
            
            findings_json+="{\"type\":\"$type\",\"rule\":\"$rule\",\"severity\":\"$severity\",\"file\":\"$file\",\"line\":\"$line\",\"source\":\"gitleaks\"}"
        done <<< "$secrets_findings"
    fi
    
    # Generar reporte JSON
    cat > "$OUTPUT_FILE" << EOF
{
  "scan_info": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "audit_level": "$AUDIT_LEVEL",
    "scanner_version": "1.0.0"
  },
  "summary": {
    "total_findings": $total_findings,
    "critical_severity": $summary_critical,
    "high_severity": $summary_high,
    "medium_severity": $summary_medium,
    "low_severity": $summary_low
  },
  "findings": [$findings_json]
}
EOF

    # Mostrar resumen
    if [[ $total_findings -eq 0 ]]; then
        success "No se encontraron vulnerabilidades de seguridad"
    else
        warn "Se encontraron $total_findings vulnerabilidades de seguridad"
        log "Críticas: $summary_critical, Altas: $summary_high, Medias: $summary_medium, Bajas: $summary_low"
        log "Reporte guardado en: $OUTPUT_FILE"
    fi
    
    # Mostrar findings si es verbose
    if [[ "$VERBOSE" == "true" && $total_findings -gt 0 ]]; then
        echo
        log "Detalles de vulnerabilidades:"
        if [[ -n "$npm_findings" ]]; then
            while IFS='|' read -r type package severity title range; do
                echo "  $severity: $type - $package"
            done <<< "$npm_findings"
        fi
        if [[ -n "$secrets_findings" ]]; then
            while IFS='|' read -r type rule severity file line; do
                echo "  $severity: $type - $rule"
            done <<< "$secrets_findings"
        fi
    fi
    
    # Exit code basado en findings críticos/altos
    if [[ $summary_critical -gt 0 || $summary_high -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Ejecutar
main "$@"
