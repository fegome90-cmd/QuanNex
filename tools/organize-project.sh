#!/bin/bash
# tools/organize-project.sh
# Organiza el proyecto StartKit QuanNex de forma limpia y escalable

set -euo pipefail

echo "🚀 StartKit QuanNex - Organización del Proyecto"
echo "================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    error "No se encontró claude-project-init.sh. Ejecuta desde la raíz del proyecto."
    exit 1
fi

log "Creando estructura de directorios..."

# Crear estructura principal
mkdir -p versions/{v1,v2,v3,latest}
mkdir -p shared/{utils,types,constants,contracts}
mkdir -p tools/{scripts,generators,validators,organizers}
mkdir -p docs/{api,guides,changelog,versions}
mkdir -p tests/{unit,integration,e2e,versions}
mkdir -p orchestration/{routing,fsm,handoffs,monitoring,optimization}

success "Estructura de directorios creada"

# Crear manifest de versiones
log "Creando manifest de versiones..."
cat > versions/manifest.json << 'EOF'
{
  "v1": {
    "name": "Baseline",
    "description": "Versión original estable",
    "features": ["basic-routing", "simple-fsm"],
    "status": "stable",
    "deprecated": false,
    "hash": "",
    "created": "2025-10-01T18:00:00Z"
  },
  "v2": {
    "name": "Router + Handoffs",
    "description": "Router declarativo + Handoffs estructurados",
    "features": ["router-v2", "fsm-v2", "handoffs", "threadstate"],
    "status": "stable",
    "deprecated": false,
    "hash": "",
    "created": "2025-10-01T18:00:00Z"
  },
  "v3": {
    "name": "Optimizations",
    "description": "Performance tuning + Memory optimization",
    "features": ["performance-tuning", "memory-pool", "circuit-breaker"],
    "status": "development",
    "deprecated": false,
    "hash": "",
    "created": "2025-10-01T18:00:00Z"
  }
}
EOF

success "Manifest de versiones creado"

# Mover archivos a versiones
log "Organizando archivos por versiones..."

# v1 - Baseline (archivos originales)
log "Creando v1 (Baseline)..."
if [ -f "orchestration/orchestrator.js" ]; then
    cp orchestration/orchestrator.js versions/v1/
    success "v1/orchestrator.js"
fi

# v2 - Router + Handoffs
log "Creando v2 (Router + Handoffs)..."
if [ -f "orchestration/orchestrator.js" ]; then
    cp orchestration/orchestrator.js versions/v2/
    success "v2/orchestrator.js"
fi
if [ -f "orchestration/router-v2.js" ]; then
    cp orchestration/router-v2.js versions/v2/router.js
    success "v2/router.js"
fi
if [ -f "orchestration/fsm-v2.js" ]; then
    cp orchestration/fsm-v2.js versions/v2/fsm.js
    success "v2/fsm.js"
fi
if [ -f "orchestration/handoff.js" ]; then
    cp orchestration/handoff.js versions/v2/
    success "v2/handoff.js"
fi

# v3 - Optimizations (por ahora copia de v2, se mejorará)
log "Creando v3 (Optimizations)..."
cp -r versions/v2/* versions/v3/
success "v3/ (copia de v2, lista para optimizaciones)"

# Crear symlink a versión actual
log "Creando symlink latest..."
ln -sf v3 versions/latest
success "latest -> v3"

# Mover archivos compartidos
log "Organizando archivos compartidos..."
if [ -f "contracts/threadstate.js" ]; then
    cp contracts/threadstate.js shared/contracts/
    success "shared/contracts/threadstate.js"
fi

# Mover herramientas
log "Organizando herramientas..."
mv tools/*.mjs tools/scripts/ 2>/dev/null || true
mv tools/*.js tools/scripts/ 2>/dev/null || true
success "Herramientas organizadas"

# Mover documentación
log "Organizando documentación..."
if [ -f "docs/SEMANA-2-CONTEXT-HANDOFFS.md" ]; then
    cp docs/SEMANA-2-CONTEXT-HANDOFFS.md docs/versions/
    success "docs/versions/SEMANA-2-CONTEXT-HANDOFFS.md"
fi

# Crear punto de entrada limpio
log "Creando punto de entrada limpio..."
cat > orchestrator.js << 'EOF'
#!/usr/bin/env node
/**
 * orchestrator.js - Punto de entrada StartKit QuanNex
 * Selecciona la versión correcta basada en VERSION env var
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detectar versión
const version = process.env.VERSION || process.env.FEATURE_VERSION || 'latest';
const versionPath = join(__dirname, 'versions', version);

console.log(`🚀 StartKit QuanNex Orchestrator ${version}`);
console.log(`📁 Cargando desde: ${versionPath}`);

// Importar la versión correcta
try {
  const { Orchestrator } = await import(join(versionPath, 'orchestrator.js'));
  const orchestrator = new Orchestrator();
  await orchestrator.start();
} catch (error) {
  console.error(`❌ Error cargando versión ${version}:`, error.message);
  console.error(`💡 Versiones disponibles: v1, v2, v3, latest`);
  process.exit(1);
}
EOF

chmod +x orchestrator.js
success "orchestrator.js (punto de entrada)"

# Crear .gitignore mejorado
log "Actualizando .gitignore..."
cat >> .gitignore << 'EOF'

# StartKit QuanNex - Organización
versions/v4/
versions/v5/
versions/experimental/
versions/*/node_modules/
versions/*/dist/
versions/*/build/

# Archivos temporales
*.tmp
*.log
*.swp
.DS_Store

# Cache y artifacts
.cache/
.quannex/cache/
.quannex/artifacts/

# Logs
logs/
*.log
EOF

success ".gitignore actualizado"

# Crear script de limpieza
log "Creando script de limpieza..."
cat > tools/clean-project.sh << 'EOF'
#!/bin/bash
# tools/clean-project.sh
# Limpia el proyecto StartKit QuanNex

set -euo pipefail

echo "🧹 Limpiando StartKit QuanNex..."

# Limpiar archivos temporales
find . -name "*.tmp" -delete
find . -name "*.log" -delete
find . -name ".DS_Store" -delete

# Limpiar directorios vacíos
find . -type d -empty -delete

# Limpiar cache de QuanNex
rm -rf .quannex/cache/ 2>/dev/null || true
rm -rf .quannex/artifacts/ 2>/dev/null || true

# Limpiar node_modules si es necesario
if [ "${CLEAN_NODE_MODULES:-false}" = "true" ]; then
  echo "🗑️  Limpiando node_modules..."
  rm -rf node_modules
  npm install
fi

echo "✅ Proyecto limpio"
EOF

chmod +x tools/clean-project.sh
success "tools/clean-project.sh"

# Crear script de testing por versión
log "Creando script de testing por versión..."
cat > tools/test-version.sh << 'EOF'
#!/bin/bash
# tools/test-version.sh
# Ejecuta tests para una versión específica

set -euo pipefail

VERSION=${1:-latest}
TEST_TYPE=${2:-all}

echo "🧪 Testing versión ${VERSION} (${TEST_TYPE})"

case $TEST_TYPE in
  "unit")
    echo "Running unit tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/unit/${VERSION}/"
    ;;
  "integration")
    echo "Running integration tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/integration/${VERSION}/"
    ;;
  "e2e")
    echo "Running e2e tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/e2e/"
    ;;
  "all")
    echo "Running all tests for ${VERSION}..."
    npm test -- --testPathPattern="tests/.*/${VERSION}/"
    ;;
  *)
    echo "Usage: $0 <version> <test_type>"
    echo "Test types: unit, integration, e2e, all"
    exit 1
    ;;
esac

echo "✅ Tests completados para ${VERSION}"
EOF

chmod +x tools/test-version.sh
success "tools/test-version.sh"

# Generar hash de versiones
log "Generando hashes de versiones..."
for version in v1 v2 v3; do
    if [ -d "versions/${version}" ]; then
        hash=$(find "versions/${version}" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
        # Actualizar manifest.json con el hash
        if command -v jq >/dev/null 2>&1; then
            jq --arg v "$version" --arg h "$hash" '.[$v].hash = $h' versions/manifest.json > tmp.json && mv tmp.json versions/manifest.json
        fi
        success "Hash generado para ${version}: ${hash:0:16}..."
    fi
done

# Mostrar resumen
echo ""
echo "🎉 StartKit QuanNex Organizado Exitosamente"
echo "============================================="
echo ""
echo "📁 Estructura creada:"
echo "  versions/          - Versiones del sistema"
echo "  shared/            - Código compartido"
echo "  tools/             - Herramientas de desarrollo"
echo "  docs/              - Documentación organizada"
echo "  tests/             - Tests por versión"
echo ""
echo "🚀 Comandos disponibles:"
echo "  VERSION=v2 node orchestrator.js     # Usar versión específica"
echo "  ./tools/clean-project.sh            # Limpiar proyecto"
echo "  ./tools/test-version.sh v2 unit     # Test versión específica"
echo ""
echo "📋 Versiones disponibles:"
if command -v jq >/dev/null 2>&1; then
    jq -r 'to_entries[] | "  \(.key): \(.value.name) - \(.value.description)"' versions/manifest.json
else
    echo "  v1: Baseline - Versión original estable"
    echo "  v2: Router + Handoffs - Router declarativo + Handoffs estructurados"
    echo "  v3: Optimizations - Performance tuning + Memory optimization"
fi
echo ""
echo "✅ ¡Proyecto organizado y listo para desarrollo escalable!"
EOF

chmod +x tools/organize-project.sh
