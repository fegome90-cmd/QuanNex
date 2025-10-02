#!/bin/bash
# CONSOLIDACIÓN FINAL V3 - ELIMINAR DUPLICADOS Y APLICAR PARCHES
# Este script elimina archivos duplicados y deja solo las versiones consolidadas

set -euo pipefail

echo "🔧 CONSOLIDACIÓN FINAL V3 - ELIMINANDO DUPLICADOS"
echo "================================================"

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

# Crear backup antes de eliminar
log "Creando backup de seguridad..."
BACKUP_DIR="backups/consolidation-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup de archivos que se van a eliminar
cp -r versions/v3/server*.js "$BACKUP_DIR/" 2>/dev/null || true
cp -r versions/v3/router*.js "$BACKUP_DIR/" 2>/dev/null || true
cp -r versions/v3/handoff*.js "$BACKUP_DIR/" 2>/dev/null || true
cp -r versions/v3/fsm*.js "$BACKUP_DIR/" 2>/dev/null || true
cp -r versions/v3/orchestrator*.js "$BACKUP_DIR/" 2>/dev/null || true

success "Backup creado en $BACKUP_DIR"

# ============================================================================
# FASE 1: ELIMINAR ARCHIVOS DUPLICADOS
# ============================================================================

log "Fase 1: Eliminando archivos duplicados..."

# Eliminar servidores duplicados (mantener solo consolidated)
rm -f versions/v3/server.js
rm -f versions/v3/server-improved.js
rm -f versions/v3/server-simple.js
success "Servidores duplicados eliminados"

# Eliminar routers duplicados (mantener solo consolidated)
rm -f versions/v3/router.js
rm -f versions/v3/router-v2.js
success "Routers duplicados eliminados"

# Eliminar handoffs duplicados (mantener solo consolidated)
rm -f versions/v3/handoff.js
success "Handoffs duplicados eliminados"

# Eliminar FSM duplicados (mantener solo fsm.js)
rm -f versions/v3/fsm-v2.js
success "FSM duplicados eliminados"

# Eliminar orchestrators duplicados (mantener solo consolidated)
rm -f versions/v3/orchestrator.js
success "Orchestrators duplicados eliminados"

# ============================================================================
# FASE 2: CREAR ENLACES SIMBÓLICOS PARA COMPATIBILIDAD
# ============================================================================

log "Fase 2: Creando enlaces simbólicos para compatibilidad..."

# Enlaces para servidor
ln -sf server-consolidated.js versions/v3/server.js
ln -sf server-consolidated.js versions/v3/server-improved.js
ln -sf server-consolidated.js versions/v3/server-simple.js
success "Enlaces simbólicos de servidor creados"

# Enlaces para router
ln -sf router-consolidated.js versions/v3/router.js
ln -sf router-consolidated.js versions/v3/router-v2.js
success "Enlaces simbólicos de router creados"

# Enlaces para handoff
ln -sf handoff-consolidated.js versions/v3/handoff.js
success "Enlaces simbólicos de handoff creados"

# Enlaces para orchestrator
ln -sf consolidated-orchestrator.js versions/v3/orchestrator.js
success "Enlaces simbólicos de orchestrator creados"

# ============================================================================
# FASE 3: LIMPIAR ARCHIVOS .backup
# ============================================================================

log "Fase 3: Limpiando archivos .backup..."

find versions/v3/ -name "*.backup" -type f -delete
success "Archivos .backup eliminados"

# ============================================================================
# FASE 4: ACTUALIZAR MANIFEST
# ============================================================================

log "Fase 4: Actualizando manifest..."

# Marcar v1 y v2 como deprecated
jq '.v1.deprecated = true | .v2.deprecated = true' versions/manifest.json > versions/manifest.json.tmp
mv versions/manifest.json.tmp versions/manifest.json

# Actualizar v3 con información de consolidación
jq '.v3.consolidated_files = [
  "consolidated-orchestrator.js",
  "mcp-server-consolidated.js", 
  "server-consolidated.js",
  "router-consolidated.js",
  "handoff-consolidated.js"
] | .v3.removed_duplicates = [
  "server.js", "server-improved.js", "server-simple.js",
  "router.js", "router-v2.js", 
  "handoff.js",
  "fsm-v2.js",
  "orchestrator.js"
]' versions/manifest.json > versions/manifest.json.tmp
mv versions/manifest.json.tmp versions/manifest.json

success "Manifest actualizado"

# ============================================================================
# FASE 5: CREAR SCRIPT DE VERIFICACIÓN
# ============================================================================

log "Fase 5: Creando script de verificación..."

cat > versions/verify-consolidation.sh << 'EOF'
#!/bin/bash
echo "🔍 VERIFICACIÓN DE CONSOLIDACIÓN V3"
echo "==================================="

# Verificar archivos consolidados
CONSOLIDATED_FILES=(
    "versions/v3/consolidated-orchestrator.js"
    "versions/v3/mcp-server-consolidated.js"
    "versions/v3/server-consolidated.js"
    "versions/v3/router-consolidated.js"
    "versions/v3/handoff-consolidated.js"
    "versions/v3/fsm.js"
)

echo "📋 Verificando archivos consolidados..."
for file in "${CONSOLIDATED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - FALTANTE"
    fi
done

# Verificar enlaces simbólicos
echo ""
echo "🔗 Verificando enlaces simbólicos..."
SYMLINKS=(
    "versions/v3/server.js"
    "versions/v3/router.js"
    "versions/v3/handoff.js"
    "versions/v3/orchestrator.js"
)

for link in "${SYMLINKS[@]}"; do
    if [ -L "$link" ]; then
        echo "✅ $link -> $(readlink $link)"
    else
        echo "❌ $link - NO ES ENLACE SIMBÓLICO"
    fi
done

# Verificar que no hay duplicados
echo ""
echo "🚫 Verificando ausencia de duplicados..."
DUPLICATES=(
    "versions/v3/server-improved.js"
    "versions/v3/server-simple.js"
    "versions/v3/router-v2.js"
    "versions/v3/fsm-v2.js"
)

for dup in "${DUPLICATES[@]}"; do
    if [ -f "$dup" ]; then
        echo "❌ $dup - AÚN EXISTE (debería ser enlace simbólico)"
    else
        echo "✅ $dup - ELIMINADO CORRECTAMENTE"
    fi
done

echo ""
echo "📊 Resumen de consolidación:"
echo "  - Archivos consolidados: ${#CONSOLIDATED_FILES[@]}"
echo "  - Enlaces simbólicos: ${#SYMLINKS[@]}"
echo "  - Duplicados eliminados: ${#DUPLICATES[@]}"
EOF

chmod +x versions/verify-consolidation.sh
success "Script de verificación creado"

# ============================================================================
# FASE 6: CREAR DOCUMENTACIÓN DE CONSOLIDACIÓN
# ============================================================================

log "Fase 6: Creando documentación..."

cat > versions/CONSOLIDATION-REPORT.md << 'EOF'
# REPORTE DE CONSOLIDACIÓN V3

## 📊 ARCHIVOS CONSOLIDADOS

### Archivos Principales
- `consolidated-orchestrator.js` - Orchestrator principal con timeout management
- `mcp-server-consolidated.js` - Servidor MCP con paths corregidos
- `server-consolidated.js` - Servidor que combina Security + Metrics + Filters
- `router-consolidated.js` - Router con performance optimizations
- `handoff-consolidated.js` - Gestión de transferencias entre agentes

### Archivos de Soporte
- `fsm.js` - Máquina de estados (versión base)
- `start-consolidated.sh` - Script de inicio consolidado
- `stop-consolidated.sh` - Script de parada

## 🗑️ ARCHIVOS ELIMINADOS

### Duplicados Eliminados
- `server.js`, `server-improved.js`, `server-simple.js` → `server-consolidated.js`
- `router.js`, `router-v2.js` → `router-consolidated.js`
- `handoff.js` → `handoff-consolidated.js`
- `fsm-v2.js` → `fsm.js`
- `orchestrator.js` → `consolidated-orchestrator.js`

### Archivos .backup
- Todos los archivos `*.backup` eliminados

## 🔗 ENLACES SIMBÓLICOS

Para mantener compatibilidad, se crearon enlaces simbólicos:
- `server.js` → `server-consolidated.js`
- `router.js` → `router-consolidated.js`
- `handoff.js` → `handoff-consolidated.js`
- `orchestrator.js` → `consolidated-orchestrator.js`

## ✅ BENEFICIOS DE LA CONSOLIDACIÓN

1. **Eliminación de duplicados**: Reducción de ~50% en archivos
2. **Paths corregidos**: Todos los imports usan paths absolutos
3. **Timeout management**: Evita scripts que se quedan pegados
4. **Graceful shutdown**: Limpieza adecuada de recursos
5. **Métricas mejoradas**: Monitoreo y debugging mejorado
6. **Compatibilidad**: Enlaces simbólicos mantienen compatibilidad

## 🚀 USO

```bash
# Iniciar sistema consolidado
./versions/v3/start-consolidated.sh

# Verificar consolidación
./versions/verify-consolidation.sh

# Detener sistema
./versions/v3/stop-consolidated.sh
```

## 📋 PRÓXIMOS PASOS

1. Reiniciar Cursor para cargar nueva configuración MCP
2. Verificar que 'quannex-v3' aparezca en servidores MCP
3. Probar comandos MCP desde Cursor
4. Ejecutar tests de integración
EOF

success "Documentación creada"

# ============================================================================
# RESUMEN FINAL
# ============================================================================

echo ""
echo "📊 CONSOLIDACIÓN COMPLETADA"
echo "=========================="
echo "✅ Archivos duplicados eliminados"
echo "✅ Enlaces simbólicos creados"
echo "✅ Archivos .backup limpiados"
echo "✅ Manifest actualizado"
echo "✅ Scripts de verificación creados"
echo "✅ Documentación generada"
echo ""
echo "🎯 ARCHIVOS CONSOLIDADOS:"
echo "  - consolidated-orchestrator.js"
echo "  - mcp-server-consolidated.js"
echo "  - server-consolidated.js"
echo "  - router-consolidated.js"
echo "  - handoff-consolidated.js"
echo ""
echo "🔧 PRÓXIMOS PASOS:"
echo "1. Ejecutar: ./versions/verify-consolidation.sh"
echo "2. Ejecutar: ./versions/v3/start-consolidated.sh"
echo "3. Reiniciar Cursor para cargar configuración MCP"
echo "4. Verificar que 'quannex-v3' aparezca en servidores MCP"
echo ""
echo "✅ Consolidación V3 completada exitosamente"
