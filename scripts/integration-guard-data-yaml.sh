#!/usr/bin/env bash
set -euo pipefail

# Script de integración anti-data.yaml
# Propósito: Fallar si OPA se invoca con -d data.yaml sin validación de esquema previa
# Fecha: 2025-10-04

echo "🔍 Verificando uso no autorizado de data.yaml..."

# Busca invocaciones de OPA con data externa
if grep -R -- '-d data.yaml' .github/workflows | grep -v 'validate-data-yaml'; then
  echo "❌ Uso de data.yaml detectado sin validación de esquema previa."
  echo "   Ubicaciones encontradas:"
  grep -R -- '-d data.yaml' .github/workflows | grep -v 'validate-data-yaml' || true
  echo ""
  echo "   Solución: Añadir step 'validate-data-yaml' antes de usar -d data.yaml"
  echo "   O eliminar -d data.yaml hasta que la validación esté implementada."
  exit 1
fi

echo "✅ Sin uso no autorizado de data.yaml"
echo "✅ Todas las invocaciones de OPA con data externa tienen validación previa"
