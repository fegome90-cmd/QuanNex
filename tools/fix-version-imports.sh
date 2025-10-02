#!/bin/bash
# tools/fix-version-imports.sh
# Arregla los imports en las versiones para que apunten a shared/

set -euo pipefail

echo "🔧 Arreglando imports de versiones..."

# Función para arreglar imports en un archivo
fix_imports() {
    local file="$1"
    local version_dir="$2"
    
    echo "  Arreglando imports en $file..."
    
    # Reemplazar imports relativos por imports a shared/
    sed -i.bak 's|from '\''../../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.bak 's|from '\''../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.bak 's|from '\''./contracts/|from '\''../../shared/contracts/|g' "$file"
    
    # Limpiar archivos .bak
    rm -f "$file.bak"
}

# Arreglar imports en cada versión
for version in v1 v2 v3; do
    if [ -d "versions/$version" ]; then
        echo "Arreglando imports en versions/$version..."
        
        # Buscar archivos .js y arreglar imports
        find "versions/$version" -name "*.js" -type f | while read -r file; do
            fix_imports "$file" "versions/$version"
        done
    fi
done

echo "✅ Imports arreglados"
