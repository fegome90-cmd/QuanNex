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
    if [ -L "$dup" ]; then
        echo "✅ $dup - ENLACE SIMBÓLICO CORRECTO"
    elif [ -f "$dup" ]; then
        echo "❌ $dup - AÚN EXISTE COMO ARCHIVO (debería ser enlace simbólico)"
    else
        echo "✅ $dup - ELIMINADO CORRECTAMENTE"
    fi
done

echo ""
echo "📊 Resumen de consolidación:"
echo "  - Archivos consolidados: ${#CONSOLIDATED_FILES[@]}"
echo "  - Enlaces simbólicos: ${#SYMLINKS[@]}"
echo "  - Duplicados eliminados: ${#DUPLICATES[@]}"
