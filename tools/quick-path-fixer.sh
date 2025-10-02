#!/bin/bash
# tools/quick-path-fixer.sh
# Herramienta rápida para arreglar imports rotos

set -euo pipefail

echo "🔧 Quick Path Fixer - Arreglando imports rotos"

# Función para arreglar imports en un archivo
fix_file() {
    local file="$1"
    echo "Arreglando: $file"
    
    # Crear backup
    cp "$file" "$file.backup"
    
    # Arreglar imports comunes
    sed -i.tmp 's|from '\''../../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.tmp 's|from '\''../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.tmp 's|from '\''./contracts/|from '\''../../shared/contracts/|g' "$file"
    
    sed -i.tmp 's|from '\''../../orchestration/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''../orchestration/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''./orchestration/|from '\''./|g' "$file"
    
    sed -i.tmp 's|from '\''../../agents/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''../agents/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''./agents/|from '\''./|g' "$file"
    
    # Limpiar archivos temporales
    rm -f "$file.tmp"
}

# Arreglar archivos en versions/
echo "Arreglando archivos en versions/..."
find versions -name "*.js" -type f | while read -r file; do
    fix_file "$file"
done

# Arreglar archivos en orchestration/
echo "Arreglando archivos en orchestration/..."
find orchestration -name "*.js" -type f | while read -r file; do
    fix_file "$file"
done

# Arreglar archivos en agents/
echo "Arreglando archivos en agents/..."
find agents -name "*.js" -type f | while read -r file; do
    fix_file "$file"
done

echo "✅ Imports arreglados"
