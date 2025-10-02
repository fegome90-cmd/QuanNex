#!/usr/bin/env bash
# Gate 0: Verificador de Integridad & Layout
# Valida imports canónicos y entry points únicos

set -euo pipefail

echo "🚦 Gate 0: Verificando Integridad & Layout..."

ERRORS=0
TOTAL_FILES=0

# Función para verificar imports relativos problemáticos
check_relative_imports() {
    local file="$1"
    
    # Excluir archivos de test, versiones, archivados y backups de la verificación estricta
    if [[ "$file" == *"/tests/"* ]] || [[ "$file" == *"/versions/"* ]] || [[ "$file" == *"/archived/"* ]] || [[ "$file" == *"/backups/"* ]]; then
        return 0
    fi
    
    local relative_imports=$(grep -n "import.*from.*['\"]\.\./\.\./" "$file" 2>/dev/null || true)
    
    if [ -n "$relative_imports" ]; then
        echo "❌ $file: Imports relativos quebradizos encontrados:"
        echo "$relative_imports"
        ((ERRORS++))
    fi
}

# Función para verificar imports canónicos
check_canonical_imports() {
    local file="$1"
    local broken_imports=$(grep -n "import.*from.*['\"]@quannex/" "$file" 2>/dev/null || true)
    
    if [ -n "$broken_imports" ]; then
        echo "❌ $file: Imports canónicos @quannex/* encontrados (deben usar paths relativos):"
        echo "$broken_imports"
        ((ERRORS++))
    fi
}

# Función para verificar archivos fantasma
check_ghost_files() {
    local ghost_patterns=(
        "versions/v1/*"
        "versions/v2/*"
        "versions/v3/*"
        "legacy/*"
        "*.old"
        "*.backup"
        "*.tmp"
    )
    
    for pattern in "${ghost_patterns[@]}"; do
        if ls $pattern 2>/dev/null; then
            echo "❌ Archivos fantasma encontrados: $pattern"
            ((ERRORS++))
        fi
    done
}

# Verificar todos los archivos JavaScript/TypeScript
echo "📁 Escaneando archivos para imports..."

for file in $(find . -name "*.js" -o -name "*.mjs" -o -name "*.ts" | grep -v node_modules | grep -v ".git"); do
    ((TOTAL_FILES++))
    check_relative_imports "$file"
    check_canonical_imports "$file"
done

# Verificar archivos fantasma
echo "👻 Verificando archivos fantasma..."
check_ghost_files

# Verificar entry points únicos
echo "🎯 Verificando entry points únicos..."
if [ -f "config/agents.registry.json" ]; then
    echo "✅ Registry de agentes encontrado"
else
    echo "❌ config/agents.registry.json no encontrado"
    ((ERRORS++))
fi

# Resumen
echo ""
echo "📊 Resumen Gate 0:"
echo "   Archivos escaneados: $TOTAL_FILES"
echo "   Errores encontrados: $ERRORS"

if [ $ERRORS -eq 0 ]; then
    echo "🟢 Gate 0: INTEGRIDAD & LAYOUT - PASÓ"
    exit 0
else
    echo "🔴 Gate 0: INTEGRIDAD & LAYOUT - FALLÓ"
    exit 1
fi
