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
