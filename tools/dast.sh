#!/bin/bash
set -euo pipefail

# DAST Wrapper Script
# Proporciona acceso simplificado al scanner DAST con valores por defecto

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DAST_SCRIPT="$PROJECT_ROOT/core/scripts/dast-scan.sh"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[DAST-WRAPPER]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Verificar que el script DAST existe
if [[ ! -f "$DAST_SCRIPT" ]]; then
    error "Script DAST no encontrado en: $DAST_SCRIPT"
    exit 1
fi

# Verificar que el script DAST es ejecutable
if [[ ! -x "$DAST_SCRIPT" ]]; then
    error "Script DAST no es ejecutable: $DAST_SCRIPT"
    exit 1
fi

# Verificar dependencias
if ! command -v jq &> /dev/null; then
    error "jq no está instalado. Instalar con: brew install jq"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    error "curl no está instalado"
    exit 1
fi

# Función de ayuda
show_help() {
    cat << EOF
DAST Wrapper - Dynamic Application Security Testing

USAGE:
    $0 [OPTIONS] [target_url]

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
    $0                                    # Escanea localhost:8787 con tipo basic
    $0 https://api.example.com            # Escanea URL específica
    $0 -t api -v https://api.example.com  # Escaneo de API con output detallado
    $0 -t web -o custom-report.json https://app.example.com

VALORES POR DEFECTO:
    target_url: http://localhost:8787
    scan_type: basic
    verbose: false
    timeout: 30

EOF
}

# Configuración por defecto
TARGET_URL="http://localhost:8787"
SCAN_TYPE="basic"
OUTPUT_FILE=""
VERBOSE=false
TIMEOUT=30

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

# Construir comando para el script DAST
DAST_CMD="$DAST_SCRIPT"

if [[ -n "$SCAN_TYPE" ]]; then
    DAST_CMD="$DAST_CMD -t $SCAN_TYPE"
fi

if [[ -n "$OUTPUT_FILE" ]]; then
    DAST_CMD="$DAST_CMD -o $OUTPUT_FILE"
fi

if [[ "$VERBOSE" == "true" ]]; then
    DAST_CMD="$DAST_CMD -v"
fi

if [[ -n "$TIMEOUT" ]]; then
    DAST_CMD="$DAST_CMD -T $TIMEOUT"
fi

DAST_CMD="$DAST_CMD $TARGET_URL"

# Ejecutar comando DAST
log "Ejecutando: $DAST_CMD"
log "Target: $TARGET_URL"
log "Tipo: $SCAN_TYPE"

# Ejecutar el script DAST
eval "$DAST_CMD"
DAST_EXIT_CODE="$?"

if [[ $DAST_EXIT_CODE -eq 0 ]]; then
    success "Escaneo DAST completado exitosamente"
else
    error "Escaneo DAST falló con código: $DAST_EXIT_CODE"
fi

exit $DAST_EXIT_CODE
