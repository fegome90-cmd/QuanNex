#!/bin/bash
# tools/complete-organization.sh
# Organización completa del proyecto StartKit QuanNex

set -euo pipefail

echo "🚀 StartKit QuanNex - Organización Completa"
echo "==========================================="

# Mover archivos necesarios a shared
echo "📦 Moviendo archivos compartidos..."

# Mover contratos
cp -r contracts/* shared/contracts/ 2>/dev/null || true

# Mover task-runner y otros archivos necesarios
if [ -f "orchestration/task-runner.js" ]; then
    cp orchestration/task-runner.js shared/utils/
fi

# Crear archivos de utilidades compartidas
cat > shared/utils/logger.js << 'EOF'
/**
 * shared/utils/logger.js
 * Logger compartido para todas las versiones
 */
export class Logger {
  constructor(prefix = 'QuanNex') {
    this.prefix = prefix;
  }

  log(message) {
    console.log(`[${this.prefix}] ${message}`);
  }

  error(message) {
    console.error(`[${this.prefix}] ❌ ${message}`);
  }

  success(message) {
    console.log(`[${this.prefix}] ✅ ${message}`);
  }

  warning(message) {
    console.warn(`[${this.prefix}] ⚠️  ${message}`);
  }
}

export const logger = new Logger();
EOF

# Crear tipos compartidos
cat > shared/types/index.js << 'EOF'
/**
 * shared/types/index.js
 * Tipos y constantes compartidas
 */
export const ROLES = {
  ENGINEER: 'engineer',
  TEACHER: 'teacher',
  TESTER: 'tester',
  DOC: 'doc',
  RULES: 'rules'
};

export const FSM_STATES = {
  PLAN: 'plan',
  EXEC: 'exec',
  CRITIC: 'critic',
  POLICY: 'policy',
  DONE: 'done'
};

export const ROUTER_TYPES = {
  DECLARATIVE: 'declarative',
  FALLBACK: 'fallback'
};
EOF

# Crear constantes compartidas
cat > shared/constants/index.js << 'EOF'
/**
 * shared/constants/index.js
 * Constantes compartidas
 */
export const DEFAULT_TIMEOUT_MS = 30000;
export const MAX_HOPS = 6;
export const CANARY_PERCENTAGE = 20;
export const CACHE_TTL_MS = 30000;

export const FEATURE_FLAGS = {
  ROUTER_V2: 'FEATURE_ROUTER_V2',
  FSM_V2: 'FEATURE_FSM_V2',
  CANARY: 'FEATURE_CANARY',
  MONITORING: 'FEATURE_MONITORING',
  CONTEXT_V2: 'FEATURE_CONTEXT_V2',
  HANDOFF: 'FEATURE_HANDOFF'
};
EOF

echo "✅ Archivos compartidos creados"

# Arreglar imports en todas las versiones
echo "🔧 Arreglando imports en versiones..."

for version in v1 v2 v3; do
    if [ -d "versions/$version" ]; then
        echo "  Arreglando versions/$version..."
        
        # Buscar y reemplazar imports
        find "versions/$version" -name "*.js" -type f | while read -r file; do
            # Reemplazar imports relativos por imports a shared/
            sed -i.bak 's|from '\''../../contracts/|from '\''../../shared/contracts/|g' "$file"
            sed -i.bak 's|from '\''../contracts/|from '\''../../shared/contracts/|g' "$file"
            sed -i.bak 's|from '\''./contracts/|from '\''../../shared/contracts/|g' "$file"
            sed -i.bak 's|from '\''../../orchestration/task-runner|from '\''../../shared/utils/task-runner|g' "$file"
            sed -i.bak 's|from '\''../orchestration/task-runner|from '\''../../shared/utils/task-runner|g' "$file"
            sed -i.bak 's|from '\''./task-runner|from '\''../../shared/utils/task-runner|g' "$file"
            
            # Limpiar archivos .bak
            rm -f "$file.bak"
        done
    fi
done

echo "✅ Imports arreglados"

# Crear README para la nueva estructura
cat > README-ORGANIZATION.md << 'EOF'
# StartKit QuanNex - Estructura Organizada

## 📁 Estructura del Proyecto

```
startkit-main/
├── orchestrator.js              # Punto de entrada principal
├── versions/                    # Versiones del sistema
│   ├── v1/                     # Baseline estable
│   ├── v2/                     # Router + Handoffs
│   ├── v3/                     # Optimizations
│   ├── latest/                 # Symlink a versión actual
│   └── manifest.json           # Metadatos de versiones
├── shared/                      # Código compartido
│   ├── contracts/              # Contratos y esquemas
│   ├── utils/                  # Utilidades compartidas
│   ├── types/                  # Tipos y constantes
│   └── constants/              # Constantes del sistema
├── tools/                       # Herramientas de desarrollo
│   ├── scripts/                # Scripts de automatización
│   ├── organizers/             # Scripts de organización
│   └── validators/             # Scripts de validación
├── docs/                        # Documentación
│   ├── versions/               # Docs por versión
│   ├── api/                    # Documentación de API
│   └── guides/                 # Guías de uso
└── tests/                       # Testing
    ├── unit/                   # Tests unitarios
    ├── integration/            # Tests de integración
    └── e2e/                    # Tests end-to-end
```

## 🚀 Comandos Disponibles

### Usar Versión Específica
```bash
VERSION=v2 node orchestrator.js
VERSION=v3 node orchestrator.js
VERSION=latest node orchestrator.js
```

### Testing por Versión
```bash
./tools/test-version.sh v2 unit
./tools/test-version.sh v3 integration
./tools/test-version.sh latest e2e
```

### Limpieza del Proyecto
```bash
./tools/clean-project.sh
./tools/clean-project.sh CLEAN_NODE_MODULES=true
```

### Organización
```bash
./tools/organize-project.sh
./tools/complete-organization.sh
```

## 📋 Versiones Disponibles

- **v1**: Baseline - Versión original estable
- **v2**: Router + Handoffs - Router declarativo + Handoffs estructurados  
- **v3**: Optimizations - Performance tuning + Memory optimization
- **latest**: Symlink a v3 (versión actual)

## 🔧 Desarrollo

### Agregar Nueva Versión
1. Crear directorio `versions/v4/`
2. Copiar archivos base de `versions/v3/`
3. Implementar mejoras
4. Actualizar `versions/manifest.json`
5. Actualizar symlink `latest/` si es necesario

### Modificar Código Compartido
- Los cambios en `shared/` afectan todas las versiones
- Usar con precaución en producción
- Considerar crear nueva versión para cambios breaking

## ✅ Beneficios

- **Versionado limpio**: Cada versión en su directorio
- **Separación clara**: Código agrupado por responsabilidad
- **Fácil navegación**: Estructura intuitiva
- **Mantenimiento simple**: Cambios aislados por versión
- **Testing organizado**: Tests por versión
- **Documentación clara**: Docs separadas por propósito
EOF

echo "✅ README de organización creado"

# Mostrar resumen final
echo ""
echo "🎉 StartKit QuanNex Completamente Organizado"
echo "============================================="
echo ""
echo "📁 Estructura creada:"
echo "  versions/          - Versiones del sistema (v1, v2, v3, latest)"
echo "  shared/            - Código compartido (contracts, utils, types, constants)"
echo "  tools/             - Herramientas de desarrollo"
echo "  docs/              - Documentación organizada"
echo "  tests/             - Tests por versión"
echo ""
echo "🚀 Comandos disponibles:"
echo "  VERSION=v2 node orchestrator.js     # Usar versión específica"
echo "  ./tools/clean-project.sh            # Limpiar proyecto"
echo "  ./tools/test-version.sh v2 unit     # Test versión específica"
echo ""
echo "📚 Documentación:"
echo "  README-ORGANIZATION.md              # Guía de la nueva estructura"
echo "  versions/manifest.json              # Metadatos de versiones"
echo ""
echo "✅ ¡Proyecto completamente organizado y listo para desarrollo escalable!"
