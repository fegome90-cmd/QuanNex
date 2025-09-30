#!/bin/bash
set -euo pipefail

# Security Dependencies Scanner
# Escanea vulnerabilidades en dependencias y paquetes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/.reports"
SECURITY_DIR="$REPORTS_DIR/security"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[SEC-DEPS]${NC} $1"
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
mkdir -p "$SECURITY_DIR" "$REPORTS_DIR"

# Configuración
OUTPUT_FILE="$SECURITY_DIR/security-deps-report-$TIMESTAMP.json"
VERBOSE=false
AUDIT_LEVEL="moderate"

# Función de ayuda
show_help() {
    cat << EOF
Security Dependencies Scanner

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -l, --level LEVEL     Nivel de auditoría (low|moderate|high|critical) [default: moderate]
    -o, --output FILE     Archivo de salida [default: auto-generated]
    -v, --verbose         Output detallado
    -h, --help            Mostrar esta ayuda

NIVELES DE AUDITORÍA:
    low       - Solo vulnerabilidades críticas
    moderate  - Críticas y altas (default)
    high      - Críticas, altas y moderadas
    critical  - Solo críticas

EOF
}

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

# Validar nivel de auditoría
if [[ ! "$AUDIT_LEVEL" =~ ^(low|moderate|high|critical)$ ]]; then
    error "Nivel de auditoría inválido: $AUDIT_LEVEL"
    exit 1
fi

# Función para escanear dependencias npm
scan_npm_deps() {
    local findings=()
    
    log "Escaneando dependencias npm..."
    
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        warn "package.json no encontrado, saltando escaneo npm"
        return
    fi
    
    # Ejecutar npm audit
    local audit_output
    if audit_output=$(cd "$PROJECT_ROOT" && npm audit --json 2>/dev/null); then
        log "npm audit completado sin vulnerabilidades"
    else
        local audit_exit_code=$?
        if [[ $audit_exit_code -eq 1 ]]; then
            # npm audit encontró vulnerabilidades
            local vulnerabilities=$(echo "$audit_output" | jq -r '.vulnerabilities // {}')
            
            if [[ "$vulnerabilities" != "{}" && "$vulnerabilities" != "null" ]]; then
                log "Vulnerabilidades encontradas en dependencias npm"
                
                # Procesar vulnerabilidades por severidad
                echo "$vulnerabilities" | jq -r 'to_entries[] | select(.value.severity != null) | .value | "\(.severity)|\(.title)|\(.via[0] // "unknown")|\(.range)"' | while IFS='|' read -r severity title package range; do
                    case "$AUDIT_LEVEL" in
                        "critical")
                            if [[ "$severity" == "critical" ]]; then
                                findings+=("{\"type\":\"npm_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"title\":\"$title\",\"range\":\"$range\",\"source\":\"npm_audit\"}")
                            fi
                            ;;
                        "high")
                            if [[ "$severity" =~ ^(critical|high)$ ]]; then
                                findings+=("{\"type\":\"npm_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"title\":\"$title\",\"range\":\"$range\",\"source\":\"npm_audit\"}")
                            fi
                            ;;
                        "moderate")
                            if [[ "$severity" =~ ^(critical|high|moderate)$ ]]; then
                                findings+=("{\"type\":\"npm_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"title\":\"$title\",\"range\":\"$range\",\"source\":\"npm_audit\"}")
                            fi
                            ;;
                        "low")
                            findings+=("{\"type\":\"npm_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"title\":\"$title\",\"range\":\"$range\",\"source\":\"npm_audit\"}")
                            ;;
                    esac
                done
            fi
        else
            error "Error ejecutando npm audit: $audit_output"
        fi
    fi
    
    echo "${findings[@]}"
}

# Función para escanear dependencias Python
scan_python_deps() {
    local findings=()
    
    log "Escaneando dependencias Python..."
    
    # Buscar archivos de dependencias Python
    local python_files=("requirements.txt" "pyproject.toml" "Pipfile" "poetry.lock")
    local found_python=false
    
    for file in "${python_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            found_python=true
            log "Archivo de dependencias Python encontrado: $file"
            break
        fi
    done
    
    if [[ "$found_python" == "false" ]]; then
        log "No se encontraron archivos de dependencias Python"
        return
    fi
    
    # Verificar si safety está disponible
    if ! command -v safety &> /dev/null; then
        warn "safety no está instalado, instalando..."
        pip install safety
    fi
    
    # Ejecutar safety check
    if safety_output=$(cd "$PROJECT_ROOT" && safety check --json 2>/dev/null); then
        log "safety check completado sin vulnerabilidades"
    else
        local safety_exit_code=$?
        if [[ $safety_exit_code -eq 1 ]]; then
            log "Vulnerabilidades encontradas en dependencias Python"
            
            # Procesar output de safety
            echo "$safety_output" | jq -r '.[] | "\(.severity)|\(.package_name)|\(.advisory)"' | while IFS='|' read -r severity package advisory; do
                case "$AUDIT_LEVEL" in
                    "critical")
                        if [[ "$severity" == "critical" ]]; then
                            findings+=("{\"type\":\"python_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"advisory\":\"$advisory\",\"source\":\"safety\"}")
                        fi
                        ;;
                    "high")
                        if [[ "$severity" =~ ^(critical|high)$ ]]; then
                            findings+=("{\"type\":\"python_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"advisory\":\"$advisory\",\"source\":\"safety\"}")
                        fi
                        ;;
                    "moderate")
                        if [[ "$severity" =~ ^(critical|high|moderate)$ ]]; then
                            findings+=("{\"type\":\"python_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"advisory\":\"$advisory\",\"source\":\"safety\"}")
                        fi
                        ;;
                    "low")
                        findings+=("{\"type\":\"python_vulnerability\",\"package\":\"$package\",\"severity\":\"$severity\",\"advisory\":\"$advisory\",\"source\":\"safety\"}")
                        ;;
                esac
            done
        else
            error "Error ejecutando safety: $safety_output"
        fi
    fi
    
    echo "${findings[@]}"
}

# Función para escanear secretos con gitleaks
scan_secrets() {
    local findings=()
    
    log "Escaneando secretos con gitleaks..."
    
    # Verificar si gitleaks está disponible
    if ! command -v gitleaks &> /dev/null; then
        warn "gitleaks no está instalado, saltando escaneo de secretos"
        return
    fi
    
    # Ejecutar gitleaks
    local gitleaks_output
    if gitleaks_output=$(cd "$PROJECT_ROOT" && gitleaks detect --source . --report-format json --no-git 2>/dev/null); then
        log "gitleaks completado sin secretos encontrados"
    else
        local gitleaks_exit_code=$?
        if [[ $gitleaks_exit_code -eq 1 ]]; then
            log "Secretos encontrados en el código"
            
            # Procesar output de gitleaks
            echo "$gitleaks_output" | jq -r '.[] | "\(.rule)|\(.severity)|\(.file)|\(.line)"' | while IFS='|' read -r rule severity file line; do
                findings+=("{\"type\":\"secret_leak\",\"rule\":\"$rule\",\"severity\":\"$severity\",\"file\":\"$file\",\"line\":\"$line\",\"source\":\"gitleaks\"}")
            done
        else
            error "Error ejecutando gitleaks: $gitleaks_output"
        fi
    fi
    
    echo "${findings[@]}"
}

# Función para escanear vulnerabilidades del sistema operativo
scan_os_vulnerabilities() {
    local findings=()
    
    log "Escaneando vulnerabilidades del sistema operativo..."
    
    # Verificar si trivy está disponible
    if command -v trivy &> /dev/null; then
        log "Usando trivy para escaneo del sistema"
        
        local trivy_output
        if trivy_output=$(trivy fs --format json "$PROJECT_ROOT" 2>/dev/null); then
            log "trivy completado sin vulnerabilidades del sistema"
        else
            local trivy_exit_code=$?
            if [[ $trivy_exit_code -eq 1 ]]; then
                log "Vulnerabilidades del sistema encontradas"
                
                # Procesar output de trivy
                echo "$trivy_output" | jq -r '.Results[]?.Vulnerabilities[]? | "\(.Severity)|\(.VulnerabilityID)|\(.PkgName)|\(.Description)"' | while IFS='|' read -r severity vuln_id pkg_name description; do
                    case "$AUDIT_LEVEL" in
                        "critical")
                            if [[ "$severity" == "CRITICAL" ]]; then
                                findings+=("{\"type\":\"os_vulnerability\",\"vulnerability_id\":\"$vuln_id\",\"package\":\"$pkg_name\",\"severity\":\"$severity\",\"description\":\"$description\",\"source\":\"trivy\"}")
                            fi
                            ;;
                        "high")
                            if [[ "$severity" =~ ^(CRITICAL|HIGH)$ ]]; then
                                findings+=("{\"type\":\"os_vulnerability\",\"vulnerability_id\":\"$vuln_id\",\"package\":\"$pkg_name\",\"severity\":\"$severity\",\"description\":\"$description\",\"source\":\"trivy\"}")
                            fi
                            ;;
                        "moderate")
                            if [[ "$severity" =~ ^(CRITICAL|HIGH|MEDIUM)$ ]]; then
                                findings+=("{\"type\":\"os_vulnerability\",\"vulnerability_id\":\"$vuln_id\",\"package\":\"$pkg_name\",\"severity\":\"$severity\",\"description\":\"$description\",\"source\":\"trivy\"}")
                            fi
                            ;;
                        "low")
                            findings+=("{\"type\":\"os_vulnerability\",\"vulnerability_id\":\"$vuln_id\",\"package\":\"$pkg_name\",\"severity\":\"$severity\",\"description\":\"$description\",\"source\":\"trivy\"}")
                            ;;
                    esac
                done
            fi
        fi
    else
        log "trivy no está disponible, saltando escaneo del sistema"
    fi
    
    echo "${findings[@]}"
}

# Función principal
main() {
    log "Iniciando escaneo de seguridad de dependencias - Nivel: $AUDIT_LEVEL"
    
    local all_findings=()
    local summary_critical=0
    local summary_high=0
    local summary_medium=0
    local summary_low=0
    
    # Ejecutar todos los escaneos
    all_findings+=($(scan_npm_deps))
    all_findings+=($(scan_python_deps))
    all_findings+=($(scan_secrets))
    all_findings+=($(scan_os_vulnerabilities))
    
    # Contar por severidad
    for finding in "${all_findings[@]}"; do
        if [[ -n "$finding" ]]; then
            local severity=$(echo "$finding" | grep -o '"severity":"[^"]*"' | cut -d'"' -f4)
            case "$severity" in
                "critical"|"CRITICAL") ((summary_critical++)) ;;
                "high"|"HIGH") ((summary_high++)) ;;
                "medium"|"moderate"|"MEDIUM") ((summary_medium++)) ;;
                "low"|"LOW") ((summary_low++)) ;;
            esac
        fi
    done
    
    # Generar reporte JSON
    local report_json="{
        \"scan_info\": {
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"audit_level\": \"$AUDIT_LEVEL\",
            \"scanner_version\": \"1.0.0\"
        },
        \"summary\": {
            \"total_findings\": ${#all_findings[@]},
            \"critical_severity\": $summary_critical,
            \"high_severity\": $summary_high,
            \"medium_severity\": $summary_medium,
            \"low_severity\": $summary_low
        },
        \"findings\": ["
    
    local first=true
    for finding in "${all_findings[@]}"; do
        if [[ -n "$finding" ]]; then
            if [[ "$first" == "true" ]]; then
                first=false
            else
                report_json+=","
            fi
            report_json+="$finding"
        fi
    done
    
    report_json+="]
    }"
    
    # Guardar reporte
    echo "$report_json" | jq '.' > "$OUTPUT_FILE"
    
    # Mostrar resumen
    local total_findings=${#all_findings[@]}
    if [[ $total_findings -eq 0 ]]; then
        success "No se encontraron vulnerabilidades de seguridad"
    else
        warn "Se encontraron $total_findings vulnerabilidades de seguridad"
        log "Críticas: $summary_critical, Altas: $summary_high, Medias: $summary_medium, Bajas: $summary_low"
        log "Reporte guardado en: $OUTPUT_FILE"
    fi
    
    # Mostrar findings en consola si es verbose
    if [[ "$VERBOSE" == "true" && $total_findings -gt 0 ]]; then
        echo
        log "Detalles de vulnerabilidades:"
        echo "$report_json" | jq -r '.findings[] | "\(.severity | ascii_upcase): \(.type) - \(.package // .rule // .vulnerability_id)"'
    fi
    
    # Exit code basado en findings críticos/altos
    if [[ $summary_critical -gt 0 || $summary_high -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Ejecutar función principal
main "$@"
