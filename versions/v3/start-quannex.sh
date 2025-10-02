#!/bin/bash
# versions/v3/start-quannex.sh
# Script de inicio completo para StartKit QuanNex v3

set -euo pipefail

echo "🚀 StartKit QuanNex v3 - Iniciando Sistema Completo"
echo "=================================================="

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

# Verificar dependencias
log "Verificando dependencias..."
if ! command -v node >/dev/null 2>&1; then
    error "Node.js no está instalado"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    error "npm no está instalado"
    exit 1
fi

success "Dependencias verificadas"

# Verificar estructura
log "Verificando estructura del proyecto..."
if [ ! -d "versions/v3" ]; then
    error "Directorio versions/v3 no encontrado"
    exit 1
fi

if [ ! -d "shared" ]; then
    error "Directorio shared no encontrado"
    exit 1
fi

success "Estructura verificada"

# Verificar archivos necesarios
log "Verificando archivos necesarios..."
REQUIRED_FILES=(
    "versions/v3/agent-server.js"
    "versions/v3/health-monitor.js"
    "versions/v3/context-agent.js"
    "versions/v3/prompting-agent.js"
    "versions/v3/rules-agent.js"
    "shared/contracts/handshake.js"
    "shared/contracts/schema.js"
    "shared/contracts/threadstate.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Archivo requerido no encontrado: $file"
        exit 1
    fi
done

success "Archivos verificados"

# Crear directorio de logs
log "Preparando directorio de logs..."
mkdir -p logs
success "Directorio de logs preparado"

# Iniciar Health Monitor
log "Iniciando Health Monitor..."
node versions/v3/health-monitor.js > logs/health-monitor.log 2>&1 &
HEALTH_MONITOR_PID=$!
echo $HEALTH_MONITOR_PID > logs/health-monitor.pid

# Esperar un momento para que se inicie
sleep 2

if ps -p $HEALTH_MONITOR_PID > /dev/null; then
    success "Health Monitor iniciado (PID: $HEALTH_MONITOR_PID)"
else
    error "Error iniciando Health Monitor"
    exit 1
fi

# Verificar estado de agentes
log "Verificando estado de agentes..."
sleep 3

# Contar agentes saludables
HEALTHY_AGENTS=0
TOTAL_AGENTS=3

# Verificar context agent
if echo '{"requestId":"health-check","agent":"context","capability":"context.resolve","payload":{},"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}' | node versions/v3/agent-server.js | jq -e '.response.ok' >/dev/null 2>&1; then
    ((HEALTHY_AGENTS++))
    success "Context Agent: Saludable"
else
    warning "Context Agent: No responde"
fi

# Verificar prompting agent
if echo '{"requestId":"health-check","agent":"prompting","capability":"prompting.buildPrompt","payload":{"context":"test","intent":"test"},"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}' | node versions/v3/agent-server.js | jq -e '.response.ok' >/dev/null 2>&1; then
    ((HEALTHY_AGENTS++))
    success "Prompting Agent: Saludable"
else
    warning "Prompting Agent: No responde"
fi

# Verificar rules agent
if echo '{"requestId":"health-check","agent":"rules","capability":"rules.validate","payload":{"code":"test","rules":[]},"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}' | node versions/v3/agent-server.js | jq -e '.response.ok' >/dev/null 2>&1; then
    ((HEALTHY_AGENTS++))
    success "Rules Agent: Saludable"
else
    warning "Rules Agent: No responde"
fi

# Mostrar resumen
echo ""
echo "📊 RESUMEN DEL SISTEMA"
echo "======================"
echo "Health Monitor: PID $HEALTH_MONITOR_PID"
echo "Agentes saludables: $HEALTHY_AGENTS/$TOTAL_AGENTS"

if [ $HEALTHY_AGENTS -eq $TOTAL_AGENTS ]; then
    success "¡Todos los agentes están saludables!"
    echo ""
    echo "🎉 StartKit QuanNex v3 iniciado exitosamente"
    echo ""
    echo "📋 Comandos disponibles:"
    echo "  ./versions/v3/stop-quannex.sh    # Detener sistema"
    echo "  tail -f logs/health-monitor.log  # Ver logs"
    echo "  ps aux | grep health-monitor     # Ver procesos"
    echo ""
    echo "✅ Sistema listo para usar"
else
    warning "Algunos agentes no están respondiendo correctamente"
    echo "Revisa los logs en logs/health-monitor.log"
fi
