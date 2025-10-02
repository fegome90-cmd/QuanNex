#!/bin/bash
# versions/v3/stop-quannex.sh
# Script para detener StartKit QuanNex v3

set -euo pipefail

echo "🛑 StartKit QuanNex v3 - Deteniendo Sistema"
echo "==========================================="

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Función para logging
log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

# Detener Health Monitor
log "Deteniendo Health Monitor..."
if [ -f "logs/health-monitor.pid" ]; then
    HEALTH_MONITOR_PID=$(cat logs/health-monitor.pid)
    if ps -p $HEALTH_MONITOR_PID > /dev/null; then
        kill $HEALTH_MONITOR_PID
        success "Health Monitor detenido (PID: $HEALTH_MONITOR_PID)"
    else
        warning "Health Monitor ya estaba detenido"
    fi
    rm -f logs/health-monitor.pid
else
    warning "PID file no encontrado, buscando procesos..."
fi

# Buscar y detener procesos restantes
log "Buscando procesos de QuanNex..."
QUANNEX_PIDS=$(pgrep -f "health-monitor\|agent-server" || true)

if [ -n "$QUANNEX_PIDS" ]; then
    log "Deteniendo procesos restantes..."
    echo "$QUANNEX_PIDS" | xargs kill
    success "Procesos detenidos"
else
    success "No se encontraron procesos de QuanNex ejecutándose"
fi

# Limpiar archivos temporales
log "Limpiando archivos temporales..."
rm -f logs/health-monitor.log
rm -f logs/*.pid
success "Archivos temporales limpiados"

echo ""
echo "📊 RESUMEN DE DETENCIÓN"
echo "======================="
success "StartKit QuanNex v3 detenido completamente"
echo ""
echo "📋 Para verificar que todo está detenido:"
echo "  ps aux | grep -E '(health-monitor|agent-server)' | grep -v grep"
echo ""
echo "✅ Sistema detenido exitosamente"
