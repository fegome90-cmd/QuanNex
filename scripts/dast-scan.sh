#!/bin/bash
set -euo pipefail

# DAST (Dynamic Application Security Testing) Scanner
# Escanea vulnerabilidades dinámicas en aplicaciones web y APIs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/.reports"
DAST_DIR="$REPORTS_DIR/dast"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[DAST]${NC} $1"
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
mkdir -p "$DAST_DIR" "$REPORTS_DIR"

# Configuración por defecto
TARGET_URL=""
SCAN_TYPE="basic"
OUTPUT_FILE="$DAST_DIR/dast-report-$TIMESTAMP.json"
VERBOSE=false
TIMEOUT=30

# Función de ayuda
show_help() {
    cat << EOF
DAST Scanner - Dynamic Application Security Testing

USAGE:
    $0 [OPTIONS] <target_url>

OPTIONS:
    -t, --type TYPE        Tipo de escaneo (basic|api|web|full) [default: basic]
    -o, --output FILE      Archivo de salida [default: auto-generated]
    -v, --verbose          Output detallado
    -T, --timeout SECONDS  Timeout para requests [default: 30]
    -h, --help             Mostrar esta ayuda

TIPOS DE ESCANEO:
    basic    - Escaneo básico de vulnerabilidades comunes
    api      - Enfocado en APIs REST/GraphQL
    web      - Enfocado en aplicaciones web tradicionales
    full     - Escaneo completo (puede ser lento)

EJEMPLOS:
    $0 https://api.example.com
    $0 -t api -v https://api.example.com/v1
    $0 -t web -o custom-report.json https://app.example.com

EOF
}

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
        -T|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        http*)
            TARGET_URL="$1"
            shift
            ;;
        *)
            error "Argumento desconocido: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validar argumentos
if [[ -z "$TARGET_URL" ]]; then
    error "URL objetivo requerida"
    show_help
    exit 1
fi

if [[ ! "$SCAN_TYPE" =~ ^(basic|api|web|full)$ ]]; then
    error "Tipo de escaneo inválido: $SCAN_TYPE"
    exit 1
fi

# Función para hacer requests HTTP
http_request() {
    local url="$1"
    local method="${2:-GET}"
    local headers="${3:-}"
    local data="${4:-}"
    
    local temp_file="/tmp/dast_response_$$"
    local curl_cmd="curl -s -w '%{http_code}' -o '$temp_file'"
    curl_cmd="$curl_cmd --max-time $TIMEOUT"
    curl_cmd="$curl_cmd -X $method"
    
    if [[ -n "$headers" ]]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi
    
    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    if [[ "$VERBOSE" == "true" ]]; then
        log "Ejecutando: $curl_cmd"
    fi
    
    eval "$curl_cmd"
    local curl_exit_code="$?"
    
    if [[ -f "$temp_file" ]]; then
        local file_size=$(wc -c < "$temp_file")
        if [[ $file_size -ge 3 ]]; then
            local http_code=$(tail -c 3 "$temp_file")
            local response_body=$(head -c $((file_size - 3)) "$temp_file")
        else
            local http_code="000"
            local response_body=""
        fi
        rm -f "$temp_file"
    else
        local http_code="000"
        local response_body=""
    fi
    
    echo "$http_code|$response_body"
}

# Función para escanear vulnerabilidades básicas
scan_basic() {
    local url="$1"
    local findings=()
    
    log "Iniciando escaneo básico de $url"
    
    # 1. Verificar headers de seguridad
    log "Verificando headers de seguridad..."
    local headers_response=$(http_request "$url" "HEAD")
    local headers_code=$(echo "$headers_response" | cut -d'|' -f1)
    local headers_body=$(echo "$headers_response" | cut -d'|' -f2)
    
    if [[ "$headers_code" == "200" ]]; then
        # Verificar headers de seguridad comunes
        local security_headers=(
            "X-Content-Type-Options"
            "X-Frame-Options"
            "X-XSS-Protection"
            "Strict-Transport-Security"
            "Content-Security-Policy"
            "Referrer-Policy"
        )
        
        for header in "${security_headers[@]}"; do
            if ! echo "$headers_body" | grep -qi "$header"; then
                findings+=("{\"type\":\"missing_security_header\",\"header\":\"$header\",\"severity\":\"medium\",\"description\":\"Missing security header: $header\"}")
            fi
        done
    fi
    
    # 2. Verificar métodos HTTP permitidos
    log "Verificando métodos HTTP permitidos..."
    local methods=("GET" "POST" "PUT" "DELETE" "PATCH" "OPTIONS" "HEAD")
    local allowed_methods=()
    
    for method in "${methods[@]}"; do
        local method_response=$(http_request "$url" "$method")
        local method_code=$(echo "$method_response" | cut -d'|' -f1)
        
        if [[ "$method_code" =~ ^[23] ]]; then
            allowed_methods+=("$method")
        fi
    done
    
    # Verificar métodos peligrosos
    local dangerous_methods=("PUT" "DELETE" "PATCH")
    for method in "${dangerous_methods[@]}"; do
        local is_allowed=false
        if [[ ${#allowed_methods[@]} -gt 0 ]]; then
            for allowed in "${allowed_methods[@]}"; do
                if [[ "$allowed" == "$method" ]]; then
                    is_allowed=true
                    break
                fi
            done
        fi
        
        if [[ "$is_allowed" == "true" ]]; then
            findings+=("{\"type\":\"dangerous_method_allowed\",\"method\":\"$method\",\"severity\":\"high\",\"description\":\"Dangerous HTTP method allowed: $method\"}")
        fi
    done
    
    # 3. Verificar información sensible en headers
    log "Verificando información sensible en headers..."
    local sensitive_patterns=(
        "server:.*apache.*"
        "server:.*nginx.*"
        "x-powered-by:.*"
        "x-aspnet-version:.*"
    )
    
    for pattern in "${sensitive_patterns[@]}"; do
        if echo "$headers_body" | grep -qi "$pattern"; then
            findings+=("{\"type\":\"information_disclosure\",\"pattern\":\"$pattern\",\"severity\":\"low\",\"description\":\"Server information disclosure: $pattern\"}")
        fi
    done
    
    # 4. Verificar HTTPS (si es aplicable)
    if [[ "$url" =~ ^https:// ]]; then
        log "Verificando configuración HTTPS..."
        # Verificar redirección HTTP -> HTTPS
        local http_url="${url/https/http}"
        local redirect_response=$(http_request "$http_url" "GET")
        local redirect_code=$(echo "$redirect_response" | cut -d'|' -f1)
        
        if [[ "$redirect_code" != "301" && "$redirect_code" != "302" ]]; then
            findings+=("{\"type\":\"missing_https_redirect\",\"severity\":\"medium\",\"description\":\"HTTP to HTTPS redirect not implemented\"}")
        fi
    fi
    
    echo "${findings[@]}"
}

# Función para escanear APIs
scan_api() {
    local url="$1"
    local findings=()
    
    log "Iniciando escaneo de API en $url"
    
    # 1. Verificar endpoints comunes de API
    local api_endpoints=(
        "/api"
        "/api/v1"
        "/api/v2"
        "/graphql"
        "/swagger"
        "/swagger-ui"
        "/docs"
        "/openapi.json"
        "/api-docs"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local api_url="${url%/}$endpoint"
        local api_response=$(http_request "$api_url" "GET")
        local api_code=$(echo "$api_response" | cut -d'|' -f1)
        
        if [[ "$api_code" == "200" ]]; then
            log "Endpoint encontrado: $api_url"
            # Verificar si expone documentación sensible
            if [[ "$endpoint" =~ (swagger|docs|openapi) ]]; then
                findings+=("{\"type\":\"api_documentation_exposed\",\"endpoint\":\"$endpoint\",\"severity\":\"medium\",\"description\":\"API documentation exposed at $endpoint\"}")
            fi
        fi
    done
    
    # 2. Verificar CORS
    log "Verificando configuración CORS..."
    local cors_response=$(http_request "$url" "OPTIONS" "Origin: https://evil.com")
    local cors_code=$(echo "$cors_response" | cut -d'|' -f1)
    local cors_body=$(echo "$cors_response" | cut -d'|' -f2)
    
    if [[ "$cors_code" == "200" ]]; then
        if echo "$cors_body" | grep -qi "Access-Control-Allow-Origin.*\*"; then
            findings+=("{\"type\":\"cors_misconfiguration\",\"severity\":\"high\",\"description\":\"CORS allows all origins (*)\"}")
        fi
    fi
    
    # 3. Verificar rate limiting
    log "Verificando rate limiting..."
    local rate_limit_response=$(http_request "$url" "GET")
    local rate_limit_code=$(echo "$rate_limit_response" | cut -d'|' -f1)
    local rate_limit_body=$(echo "$rate_limit_response" | cut -d'|' -f2)
    
    if ! echo "$rate_limit_body" | grep -qi "rate.limit\|x-ratelimit"; then
        findings+=("{\"type\":\"missing_rate_limiting\",\"severity\":\"medium\",\"description\":\"No rate limiting headers detected\"}")
    fi
    
    echo "${findings[@]}"
}

# Función para escanear aplicaciones web
scan_web() {
    local url="$1"
    local findings=()
    
    log "Iniciando escaneo de aplicación web en $url"
    
    # 1. Verificar directorios comunes
    local common_dirs=(
        "/admin"
        "/administrator"
        "/wp-admin"
        "/phpmyadmin"
        "/.git"
        "/.env"
        "/config"
        "/backup"
        "/test"
        "/dev"
    )
    
    for dir in "${common_dirs[@]}"; do
        local dir_url="${url%/}$dir"
        local dir_response=$(http_request "$dir_url" "GET")
        local dir_code=$(echo "$dir_response" | cut -d'|' -f1)
        
        if [[ "$dir_code" == "200" ]]; then
            findings+=("{\"type\":\"sensitive_directory_exposed\",\"directory\":\"$dir\",\"severity\":\"high\",\"description\":\"Sensitive directory accessible: $dir\"}")
        fi
    done
    
    # 2. Verificar archivos comunes
    local common_files=(
        "/robots.txt"
        "/sitemap.xml"
        "/.htaccess"
        "/web.config"
        "/crossdomain.xml"
        "/clientaccesspolicy.xml"
    )
    
    for file in "${common_files[@]}"; do
        local file_url="${url%/}$file"
        local file_response=$(http_request "$file_url" "GET")
        local file_code=$(echo "$file_response" | cut -d'|' -f1)
        
        if [[ "$file_code" == "200" ]]; then
            log "Archivo encontrado: $file_url"
        fi
    done
    
    echo "${findings[@]}"
}

# Función principal de escaneo
main() {
    log "Iniciando DAST scan - Tipo: $SCAN_TYPE, Target: $TARGET_URL"
    
    local all_findings=()
    
    # Ejecutar escaneo según el tipo
    case "$SCAN_TYPE" in
        "basic")
            all_findings+=($(scan_basic "$TARGET_URL"))
            ;;
        "api")
            all_findings+=($(scan_basic "$TARGET_URL"))
            all_findings+=($(scan_api "$TARGET_URL"))
            ;;
        "web")
            all_findings+=($(scan_basic "$TARGET_URL"))
            all_findings+=($(scan_web "$TARGET_URL"))
            ;;
        "full")
            all_findings+=($(scan_basic "$TARGET_URL"))
            all_findings+=($(scan_api "$TARGET_URL"))
            all_findings+=($(scan_web "$TARGET_URL"))
            ;;
    esac
    
    # Contar por severidad
    local summary_high=0
    local summary_medium=0
    local summary_low=0
    
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
    
    # Generar reporte JSON
    local report_json="{
        \"scan_info\": {
            \"target\": \"$TARGET_URL\",
            \"type\": \"$SCAN_TYPE\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"scanner_version\": \"1.0.0\"
        },
        \"summary\": {
            \"total_findings\": ${#all_findings[@]},
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
        success "No se encontraron vulnerabilidades"
    else
        warn "Se encontraron $total_findings vulnerabilidades"
        log "Reporte guardado en: $OUTPUT_FILE"
    fi
    
    # Mostrar findings en consola si es verbose
    if [[ "$VERBOSE" == "true" && $total_findings -gt 0 ]]; then
        echo
        log "Detalles de vulnerabilidades:"
        echo "$report_json" | jq -r '.findings[] | "\(.severity | ascii_upcase): \(.description)"'
    fi
    
    # Exit code basado en findings
    if [[ $total_findings -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Ejecutar función principal
main "$@"
