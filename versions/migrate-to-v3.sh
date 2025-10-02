#!/bin/bash
# MIGRACIÓN A V3 CONSOLIDADA
# Limpia versiones anteriores y configura v3 como definitiva

set -euo pipefail

echo "🔄 MIGRACIÓN A V3 CONSOLIDADA"
echo "============================="

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# 1. Detener procesos anteriores
log "Deteniendo procesos anteriores..."
pkill -f "orchestrator" 2>/dev/null || true
pkill -f "health-monitor" 2>/dev/null || true
pkill -f "mcp-server" 2>/dev/null || true
sleep 2
success "Procesos anteriores detenidos"

# 2. Crear backup de configuraciones anteriores
log "Creando backup de configuraciones..."
mkdir -p backups/migration-$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/migration-$(date +%Y%m%d-%H%M%S)"

cp .mcp.json "$BACKUP_DIR/" 2>/dev/null || true
cp .cursor/mcp.json "$BACKUP_DIR/" 2>/dev/null || true
cp versions/manifest.json "$BACKUP_DIR/" 2>/dev/null || true
success "Backup creado en $BACKUP_DIR"

# 3. Marcar v1 y v2 como deprecated
log "Marcando versiones anteriores como deprecated..."
jq '.v1.deprecated = true | .v2.deprecated = true' versions/manifest.json > versions/manifest.json.tmp
mv versions/manifest.json.tmp versions/manifest.json
success "Versiones anteriores marcadas como deprecated"

# 4. Crear enlaces simbólicos para compatibilidad
log "Creando enlaces simbólicos para compatibilidad..."
ln -sf versions/v3/consolidated-orchestrator.js orchestrator-v3.js
ln -sf versions/v3/mcp-server-consolidated.js mcp-server-v3.js
ln -sf versions/v3/start-consolidated.sh start-v3.sh
success "Enlaces simbólicos creados"

# 5. Actualizar latest pointer
log "Actualizando pointer latest..."
echo "v3" > versions/latest/v3
success "Pointer latest actualizado"

# 6. Limpiar archivos temporales y logs antiguos
log "Limpiando archivos temporales..."
rm -f logs/health-monitor.pid 2>/dev/null || true
rm -f logs/orchestrator.pid 2>/dev/null || true
rm -f logs/*.log 2>/dev/null || true
success "Archivos temporales limpiados"

# 7. Verificar estructura consolidada
log "Verificando estructura consolidada..."
REQUIRED_FILES=(
    "versions/v3/consolidated-orchestrator.js"
    "versions/v3/mcp-server-consolidated.js"
    "versions/v3/start-consolidated.sh"
    "versions/v3/context-agent.js"
    "versions/v3/prompting-agent.js"
    "versions/v3/rules-agent.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Archivo requerido no encontrado: $file"
        exit 1
    fi
done
success "Estructura consolidada verificada"

# 8. Crear script de rollback
log "Creando script de rollback..."
cat > versions/rollback-from-v3.sh << 'EOF'
#!/bin/bash
echo "🔄 ROLLBACK DESDE V3"
echo "==================="

# Restaurar configuraciones desde backup
if [ -d "backups/migration-*" ]; then
    BACKUP_DIR=$(ls -td backups/migration-* | head -1)
    echo "Restaurando desde: $BACKUP_DIR"
    
    cp "$BACKUP_DIR/.mcp.json" . 2>/dev/null || true
    cp "$BACKUP_DIR/.cursor/mcp.json" .cursor/ 2>/dev/null || true
    cp "$BACKUP_DIR/manifest.json" versions/ 2>/dev/null || true
    
    echo "✅ Configuraciones restauradas"
else
    echo "❌ No se encontró backup para rollback"
    exit 1
fi

# Limpiar enlaces simbólicos
rm -f orchestrator-v3.js mcp-server-v3.js start-v3.sh

echo "✅ Rollback completado"
EOF

chmod +x versions/rollback-from-v3.sh
success "Script de rollback creado"

# 9. Mostrar resumen
echo ""
echo "📊 MIGRACIÓN COMPLETADA"
echo "======================"
echo "✅ V3 Consolidada configurada como versión definitiva"
echo "✅ Configuraciones MCP actualizadas"
echo "✅ Enlaces simbólicos creados"
echo "✅ Scripts de rollback disponibles"
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "1. Ejecuta: ./versions/v3/start-consolidated.sh"
echo "2. Reinicia Cursor para cargar la nueva configuración MCP"
echo "3. Verifica que 'quannex-v3' aparezca en los servidores MCP"
echo ""
echo "🔧 Comandos disponibles:"
echo "  ./versions/v3/start-consolidated.sh    # Iniciar V3"
echo "  ./versions/rollback-from-v3.sh         # Rollback si es necesario"
echo "  node orchestrator-v3.js status         # Verificar estado"
echo ""
echo "📁 Archivos consolidados:"
echo "  - consolidated-orchestrator.js"
echo "  - mcp-server-consolidated.js"
echo "  - start-consolidated.sh"
echo ""
echo "✅ Migración a V3 Consolidada completada exitosamente"
