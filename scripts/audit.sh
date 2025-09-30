#!/bin/bash
set -euo pipefail

# Script de auditoría objetiva para startkit
# Genera reportes JSON con inventario completo del proyecto

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/.reports"

# Crear directorio de reportes
mkdir -p "$REPORTS_DIR"

echo "🔍 Iniciando auditoría objetiva del proyecto..."

# 1. Inventario Node/npm
echo "📦 Inventariando dependencias Node.js..."
{
  echo "{"
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"node_version\": \"$(node --version 2>/dev/null || echo 'not_found')\","
  echo "  \"npm_version\": \"$(npm --version 2>/dev/null || echo 'not_found')\","
  echo "  \"package_json_exists\": $(test -f "$PROJECT_ROOT/package.json" && echo 'true' || echo 'false'),"
  echo "  \"package_lock_exists\": $(test -f "$PROJECT_ROOT/package-lock.json" && echo 'true' || echo 'false')"
  echo "}"
} > "$REPORTS_DIR/node-inventory.json"

# 2. Dependencias desactualizadas
echo "🔄 Verificando dependencias desactualizadas..."
if command -v npm >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/package.json" ]; then
  cd "$PROJECT_ROOT"
  npm outdated --json > "$REPORTS_DIR/outdated.json" 2>/dev/null || echo '{}' > "$REPORTS_DIR/outdated.json"
else
  echo '{}' > "$REPORTS_DIR/outdated.json"
fi

# 3. Vulnerabilidades de seguridad
echo "🔒 Escaneando vulnerabilidades..."
if command -v npm >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/package.json" ]; then
  cd "$PROJECT_ROOT"
  npm audit --audit-level=high --json > "$REPORTS_DIR/audit.json" 2>/dev/null || echo '{}' > "$REPORTS_DIR/audit.json"
else
  echo '{}' > "$REPORTS_DIR/audit.json"
fi

# 4. Búsqueda de APIs deprecadas
echo "⚠️ Buscando APIs deprecadas..."
if command -v rg >/dev/null 2>&1; then
  # Patrones comunes de APIs deprecadas
  rg -i --json "deprecated|deprecation|obsolete|legacy" "$PROJECT_ROOT" --type js --type ts --type json > "$REPORTS_DIR/deprecated-apis.json" 2>/dev/null || echo '[]' > "$REPORTS_DIR/deprecated-apis.json"
else
  echo '[]' > "$REPORTS_DIR/deprecated-apis.json"
fi

# 5. Inventario Docker
echo "🐳 Inventariando configuración Docker..."
{
  echo "{"
  echo "  \"dockerfiles\": ["
  find "$PROJECT_ROOT" -name "Dockerfile*" -type f | while read -r file; do
    echo "    \"$(basename "$file")\","
  done | sed '$ s/,$//'
  echo "  ],"
  echo "  \"docker_compose_files\": ["
  find "$PROJECT_ROOT" -name "docker-compose*.yml" -o -name "docker-compose*.yaml" | while read -r file; do
    echo "    \"$(basename "$file")\","
  done | sed '$ s/,$//'
  echo "  ]"
  echo "}"
} > "$REPORTS_DIR/docker-inventory.json"

# 6. Resumen consolidado
echo "📊 Generando resumen consolidado..."
{
  echo "{"
  echo "  \"audit_timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"reports_generated\": ["
  echo "    \"node-inventory.json\","
  echo "    \"outdated.json\","
  echo "    \"audit.json\","
  echo "    \"deprecated-apis.json\","
  echo "    \"docker-inventory.json\""
  echo "  ],"
  echo "  \"status\": \"completed\""
  echo "}"
} > "$REPORTS_DIR/AUDIT.md"

echo "✅ Auditoría completada. Reportes generados en $REPORTS_DIR"
echo "📁 Archivos generados:"
ls -la "$REPORTS_DIR"
