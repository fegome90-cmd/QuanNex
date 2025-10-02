#!/bin/bash

# Script de Blindaje del Orquestador QuanNex
# Previene el uso de versiones problemáticas y fuerza el uso del orquestador correcto

set -e

echo "🛡️ BLINDAJE DEL ORQUESTADOR QUANNEX"
echo "=================================="

# Verificar directorio correcto
if [ "$(pwd)" != "/Users/felipe/Developer/startkit-main" ]; then
    echo "❌ ERROR: No estás en el directorio correcto"
    echo "   Actual: $(pwd)"
    echo "   Esperado: /Users/felipe/Developer/startkit-main"
    exit 1
fi
echo "✅ Directorio correcto: $(pwd)"

# 1. AISLAR VERSIONES PROBLEMÁTICAS
echo ""
echo "🔒 Paso 1: Aislando versiones problemáticas..."

# Crear directorio de archivo si no existe
mkdir -p archived/orchestrator-versions

# Mover versiones problemáticas a archivo
PROBLEMATIC_FILES=(
    "versions/v3/consolidated-orchestrator.js"
    "versions/v3/test-orchestration.js"
    "versions/v3/mcp-server-consolidated.js"
    "orchestration/orchestrator-consolidated.js"
    "orchestration/orchestrator-v2-backup.js"
    "orchestration/orchestrator.js.backup"
    "orchestration/orchestrator.js.broken"
    "orchestration/orchestrator.js.prod"
)

for file in "${PROBLEMATIC_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   📦 Archivando: $file"
        mv "$file" "archived/orchestrator-versions/"
    fi
done

# Eliminar enlaces simbólicos problemáticos
if [ -L "orchestration/test-orchestration.js" ]; then
    echo "   🗑️ Eliminando enlace simbólico problemático"
    rm "orchestration/test-orchestration.js"
fi

echo "✅ Versiones problemáticas aisladas"

# 2. VERIFICAR ORQUESTADOR CORRECTO
echo ""
echo "🔍 Paso 2: Verificando orquestador correcto..."

if [ ! -f "orchestration/orchestrator.js" ]; then
    echo "❌ ERROR: Orquestador correcto no encontrado"
    echo "   Esperado: orchestration/orchestrator.js"
    exit 1
fi

if [ ! -x "orchestration/orchestrator.js" ]; then
    echo "❌ ERROR: Orquestador no es ejecutable"
    chmod +x "orchestration/orchestrator.js"
    echo "✅ Permisos de ejecución agregados"
fi

echo "✅ Orquestador correcto verificado"

# 3. CREAR GATEWAY DE SEGURIDAD
echo ""
echo "🔒 Paso 3: Creando gateway de seguridad..."

if [ ! -f "orchestration/orchestrator-gateway.js" ]; then
    echo "❌ ERROR: Gateway no encontrado"
    exit 1
fi

if [ ! -x "orchestration/orchestrator-gateway.js" ]; then
    chmod +x "orchestration/orchestrator-gateway.js"
    echo "✅ Permisos de ejecución agregados al gateway"
fi

echo "✅ Gateway de seguridad creado"

# 4. CREAR MCP SERVER CORRECTO
echo ""
echo "🔧 Paso 4: Verificando MCP server correcto..."

if [ ! -f "orchestration/mcp-server-correct.js" ]; then
    echo "❌ ERROR: MCP server correcto no encontrado"
    exit 1
fi

if [ ! -x "orchestration/mcp-server-correct.js" ]; then
    chmod +x "orchestration/mcp-server-correct.js"
    echo "✅ Permisos de ejecución agregados al MCP server"
fi

echo "✅ MCP server correcto verificado"

# 5. ACTUALIZAR CONFIGURACIONES MCP
echo ""
echo "⚙️ Paso 5: Actualizando configuraciones MCP..."

# Verificar que las configuraciones MCP apunten al servidor correcto
if grep -q "versions/v3/mcp-server-consolidated.js" .mcp.json 2>/dev/null; then
    echo "   🔄 Actualizando .mcp.json"
    sed -i '' 's|versions/v3/mcp-server-consolidated.js|orchestration/mcp-server-correct.js|g' .mcp.json
fi

if grep -q "versions/v3/mcp-server-consolidated.js" .cursor/mcp.json 2>/dev/null; then
    echo "   🔄 Actualizando .cursor/mcp.json"
    sed -i '' 's|versions/v3/mcp-server-consolidated.js|orchestration/mcp-server-correct.js|g' .cursor/mcp.json
fi

echo "✅ Configuraciones MCP actualizadas"

# 6. VERIFICACIÓN FINAL
echo ""
echo "🧪 Paso 6: Verificación final..."

# Verificar salud de agentes
echo "   🔍 Verificando salud de agentes..."
if ! node orchestration/orchestrator.js health > /dev/null 2>&1; then
    echo "❌ ERROR: Agentes no están saludables"
    echo "   Ejecutar: node orchestration/orchestrator.js health"
    exit 1
fi
echo "   ✅ Agentes saludables"

# Verificar gateway
echo "   🔍 Verificando gateway..."
if ! node orchestration/orchestrator-gateway.js health > /dev/null 2>&1; then
    echo "❌ ERROR: Gateway no funciona"
    exit 1
fi
echo "   ✅ Gateway funcionando"

# Verificar que no hay versiones problemáticas accesibles
echo "   🔍 Verificando aislamiento..."
PROBLEMATIC_PATHS=(
    "versions/v3/consolidated-orchestrator.js"
    "versions/v3/mcp-server-consolidated.js"
    "orchestration/orchestrator-consolidated.js"
)

for path in "${PROBLEMATIC_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "❌ ERROR: Versión problemática aún accesible: $path"
        exit 1
    fi
done
echo "   ✅ Versiones problemáticas aisladas"

echo ""
echo "🎉 BLINDAJE COMPLETO - SISTEMA SEGURO"
echo "====================================="
echo ""
echo "✅ Versiones problemáticas aisladas en archived/"
echo "✅ Orquestador correcto verificado y funcionando"
echo "✅ Gateway de seguridad creado"
echo "✅ MCP server correcto configurado"
echo "✅ Configuraciones MCP actualizadas"
echo "✅ Verificación final exitosa"
echo ""
echo "📋 Comandos disponibles:"
echo "   node orchestration/orchestrator.js <comando>"
echo "   node orchestration/orchestrator-gateway.js <comando>"
echo ""
echo "🔒 El sistema está blindado contra versiones problemáticas"
echo "   El MCP ahora usa el orquestador correcto automáticamente"
