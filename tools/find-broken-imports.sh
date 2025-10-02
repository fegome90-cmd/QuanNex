#!/bin/bash
# FIND BROKEN IMPORTS
# Verifica que no hay imports relativos problemáticos

set -e

echo "🔍 Verificando imports rotos..."

# Buscar imports relativos en core/
echo "Verificando core/..."
if grep -RhoE "from ['\"][./].+['\"]" core/ 2>/dev/null | grep -v "@quannex/"; then
    echo "❌ Imports relativos encontrados en core/"
    exit 1
fi

# Buscar imports relativos en agents/
echo "Verificando agents/..."
if grep -RhoE "from ['\"][./].+['\"]" agents/ 2>/dev/null | grep -v "@quannex/"; then
    echo "❌ Imports relativos encontrados en agents/"
    exit 1
fi

# Buscar imports relativos en orchestration/
echo "Verificando orchestration/..."
if grep -RhoE "from ['\"][./].+['\"]" orchestration/ 2>/dev/null | grep -v "@quannex/"; then
    echo "❌ Imports relativos encontrados en orchestration/"
    exit 1
fi

echo "✅ Imports canónicos verificados"
echo "✅ No se encontraron imports relativos problemáticos"
