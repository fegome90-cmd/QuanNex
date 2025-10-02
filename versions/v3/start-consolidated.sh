#!/bin/bash
# VERSIÓN CONSOLIDADA V3 - SCRIPT DE INICIO DEFINITIVO
# Corrige problemas de pathing y scripts pegados

set -euo pipefail

echo "🚀 StartKit QuanNex V3 CONSOLIDADO - Iniciando Sistema"
echo "====================================================="

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

# Verificar que estamos en el directorio correcto
if [ ! -f "claude-project-init.sh" ]; then
    error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

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

if ! command -v jq >/dev/null 2>&1; then
    warning "jq no está instalado - algunas funciones pueden no funcionar"
fi

success "Dependencias verificadas"

# Verificar estructura consolidada
log "Verificando estructura consolidada..."
REQUIRED_FILES=(
    "versions/v3/consolidated-orchestrator.js"
    "versions/v3/mcp-server-consolidated.js"
    "versions/v3/context-agent.js"
    "versions/v3/prompting-agent.js"
    "versions/v3/rules-agent.js"
    "shared/contracts/handshake.js"
    "shared/contracts/schema.js"
    "shared/contracts/threadstate.js"
    "shared/utils/security.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Archivo requerido no encontrado: $file"
        exit 1
    fi
done

success "Estructura consolidada verificada"

# Crear directorio de logs
log "Preparando directorio de logs..."
mkdir -p logs
success "Directorio de logs preparado"

# Limpiar procesos anteriores
log "Limpiando procesos anteriores..."
pkill -f "consolidated-orchestrator" 2>/dev/null || true
pkill -f "mcp-server-consolidated" 2>/dev/null || true
sleep 2

# Iniciar Orchestrator Consolidado
log "Iniciando Orchestrator Consolidado V3..."
node versions/v3/consolidated-orchestrator.js status > logs/orchestrator-status.log 2>&1 &
ORCHESTRATOR_PID=$!
echo $ORCHESTRATOR_PID > logs/orchestrator.pid

# Esperar un momento para que se inicie
sleep 3

if ps -p $ORCHESTRATOR_PID > /dev/null; then
    success "Orchestrator Consolidado iniciado (PID: $ORCHESTRATOR_PID)"
else
    error "Error iniciando Orchestrator Consolidado"
    exit 1
fi

# Verificar estado de agentes con timeout
log "Verificando estado de agentes..."
HEALTHY_AGENTS=0
TOTAL_AGENTS=3

# Función para verificar agente con timeout
check_agent() {
    local agent_name=$1
    local capability=$2
    local payload=$3
    
    local request='{"requestId":"health-check","agent":"'$agent_name'","capability":"'$capability'","payload":'$payload',"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}'
    
    # Timeout de 10 segundos
    if timeout 10s node versions/v3/consolidated-orchestrator.js call_agent --agent "$agent_name" --capability "$capability" --payload "$payload" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Verificar context agent
if check_agent "context" "context.resolve" '{}'; then
    ((HEALTHY_AGENTS++))
    success "Context Agent: Saludable"
else
    warning "Context Agent: No responde"
fi

# Verificar prompting agent
if check_agent "prompting" "prompting.buildPrompt" '{"context":"test","intent":"test"}'; then
    ((HEALTHY_AGENTS++))
    success "Prompting Agent: Saludable"
else
    warning "Prompting Agent: No responde"
fi

# Verificar rules agent
if check_agent "rules" "rules.validate" '{"code":"test","rules":[]}'; then
    ((HEALTHY_AGENTS++))
    success "Rules Agent: Saludable"
else
    warning "Rules Agent: No responde"
fi

# Mostrar resumen
echo ""
echo "📊 RESUMEN DEL SISTEMA CONSOLIDADO V3"
echo "====================================="
echo "Orchestrator: PID $ORCHESTRATOR_PID"
echo "Agentes saludables: $HEALTHY_AGENTS/$TOTAL_AGENTS"
echo "Configuración MCP: quannex-v3"

if [ $HEALTHY_AGENTS -eq $TOTAL_AGENTS ]; then
    success "¡Todos los agentes están saludables!"
    echo ""
    echo "🎉 StartKit QuanNex V3 CONSOLIDADO iniciado exitosamente"
    echo ""
    echo "📋 Comandos disponibles:"
    echo "  ./versions/v3/stop-consolidated.sh     # Detener sistema"
    echo "  tail -f logs/orchestrator-status.log   # Ver logs"
    echo "  ps aux | grep consolidated             # Ver procesos"
    echo ""
    echo "🔧 MCP Server: quannex-v3"
    echo "📁 Archivos consolidados:"
    echo "  - consolidated-orchestrator.js"
    echo "  - mcp-server-consolidated.js"
    echo ""
    echo "✅ Sistema listo para usar con MCP"
else
    warning "Algunos agentes no están respondiendo correctamente"
    echo "Revisa los logs en logs/orchestrator-status.log"
    echo "El sistema puede funcionar parcialmente"
fi

# Crear script de parada
cat > versions/v3/stop-consolidated.sh << 'EOF'
#!/bin/bash
echo "🛑 Deteniendo StartKit QuanNex V3 CONSOLIDADO..."

# Detener orchestrator
if [ -f "logs/orchestrator.pid" ]; then
    ORCHESTRATOR_PID=$(cat logs/orchestrator.pid)
    if ps -p $ORCHESTRATOR_PID > /dev/null; then
        kill $ORCHESTRATOR_PID
        echo "✅ Orchestrator detenido"
    fi
    rm -f logs/orchestrator.pid
fi

# Limpiar procesos
pkill -f "consolidated-orchestrator" 2>/dev/null || true
pkill -f "mcp-server-consolidated" 2>/dev/null || true

echo "✅ Sistema detenido"
EOF

chmod +x versions/v3/stop-consolidated.sh
success "Script de parada creado"

echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "1. Reinicia Cursor para cargar la nueva configuración MCP"
echo "2. Verifica que 'quannex-v3' aparezca en los servidores MCP"
echo "3. Prueba los comandos MCP desde Cursor"
echo ""
echo "🔧 Para probar manualmente:"
echo "  node versions/v3/consolidated-orchestrator.js status"
echo "  node versions/v3/mcp-server-consolidated.js"
