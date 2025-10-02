#!/usr/bin/env bash
# Check Ports - Verificar que puertos críticos están libres
set -euo pipefail

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[CHECK-PORTS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para verificar si un puerto está libre
check_port() {
    local port=$1
    if lsof -i ":$port" >/dev/null 2>&1; then
        error "Puerto $port está ocupado"
        lsof -i ":$port"
        return 1
    else
        log "Puerto $port libre"
        return 0
    fi
}

# Función principal
main() {
    if [[ $# -eq 0 ]]; then
        echo "Uso: $0 <puerto1> [puerto2] [puerto3] ..."
        echo "Ejemplo: $0 8051 8052 3000"
        exit 1
    fi
    
    log "Verificando puertos críticos..."
    
    local all_free=true
    
    for port in "$@"; do
        if ! check_port "$port"; then
            all_free=false
        fi
    done
    
    if [[ "$all_free" == "true" ]]; then
        log "✅ Todos los puertos están libres"
        exit 0
    else
        error "❌ Algunos puertos están ocupados"
        exit 1
    fi
}

# Ejecutar función principal
main "$@"
