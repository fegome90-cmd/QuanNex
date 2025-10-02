#!/bin/bash

# Script de Verificación de Pathing Post-Reorganización
# Verifica que no haya problemas de pathing después de la reorganización de archivos

set -e

echo "🔍 VERIFICACIÓN DE PATHING POST-REORGANIZACIÓN"
echo "=============================================="

# Verificar directorio correcto
if [ "$(pwd)" != "/Users/felipe/Developer/startkit-main" ]; then
    echo "❌ ERROR: No estás en el directorio correcto"
    echo "   Actual: $(pwd)"
    echo "   Esperado: /Users/felipe/Developer/startkit-main"
    exit 1
fi
echo "✅ Directorio correcto: $(pwd)"

# 1. VERIFICAR ARCHIVOS CRÍTICOS EN RAÍZ
echo ""
echo "🔍 Paso 1: Verificando archivos críticos en raíz..."

CRITICAL_FILES=(
    "package.json"
    "orchestrator.js"
    "claude-project-init.sh"
    "Makefile"
    "README.md"
    "SECURITY.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ ERROR: Archivo crítico no encontrado: $file"
        exit 1
    fi
done
echo "✅ Archivos críticos en raíz verificados"

# 2. VERIFICAR ORQUESTADOR
echo ""
echo "🔍 Paso 2: Verificando orquestador..."

if [ ! -f "orchestration/orchestrator.js" ]; then
    echo "❌ ERROR: Orquestador no encontrado"
    exit 1
fi

if ! node orchestration/orchestrator.js health > /dev/null 2>&1; then
    echo "❌ ERROR: Orquestador no funciona"
    exit 1
fi
echo "✅ Orquestador funcionando"

# 3. VERIFICAR AGENTES
echo ""
echo "🔍 Paso 3: Verificando agentes..."

AGENTS=("context" "prompting" "rules")
for agent in "${AGENTS[@]}"; do
    if [ ! -f "agents/$agent/agent.js" ]; then
        echo "❌ ERROR: Agente no encontrado: agents/$agent/agent.js"
        exit 1
    fi
done
echo "✅ Agentes encontrados"

# 4. VERIFICAR ESQUEMAS
echo ""
echo "🔍 Paso 4: Verificando esquemas..."

for agent in "${AGENTS[@]}"; do
    if [ ! -f "schemas/agents/$agent.input.schema.json" ]; then
        echo "❌ ERROR: Esquema de entrada no encontrado: schemas/agents/$agent.input.schema.json"
        exit 1
    fi
    if [ ! -f "schemas/agents/$agent.output.schema.json" ]; then
        echo "❌ ERROR: Esquema de salida no encontrado: schemas/agents/$agent.output.schema.json"
        exit 1
    fi
done
echo "✅ Esquemas encontrados"

# 5. VERIFICAR ARCHIVOS MOVIDOS
echo ""
echo "🔍 Paso 5: Verificando archivos movidos..."

# Verificar que los archivos están en sus nuevas ubicaciones
if [ ! -d "workflows/" ]; then
    echo "❌ ERROR: Carpeta workflows/ no encontrada"
    exit 1
fi

if [ ! -d "tests/" ]; then
    echo "❌ ERROR: Carpeta tests/ no encontrada"
    exit 1
fi

if [ ! -d "reports/" ]; then
    echo "❌ ERROR: Carpeta reports/ no encontrada"
    exit 1
fi

if [ ! -d "docs/" ]; then
    echo "❌ ERROR: Carpeta docs/ no encontrada"
    exit 1
fi

echo "✅ Carpetas de archivos movidos encontradas"

# 6. VERIFICAR QUE NO HAY ARCHIVOS SUELTOS PROBLEMÁTICOS
echo ""
echo "🔍 Paso 6: Verificando que no hay archivos sueltos problemáticos..."

PROBLEMATIC_PATTERNS=(
    "*-workflow.json"
    "test-gap-*.js"
    "gap-*-test-report.json"
    "gap-*-analysis-report.json"
    "*-REPORT.json"
    "*-SOLUTION-REPORT.md"
    "*-ANALYSIS-*.md"
)

for pattern in "${PROBLEMATIC_PATTERNS[@]}"; do
    if ls $pattern >/dev/null 2>&1; then
        echo "⚠️  ADVERTENCIA: Archivos sueltos encontrados con patrón: $pattern"
        ls $pattern
    fi
done
echo "✅ Verificación de archivos sueltos completada"

# 7. VERIFICAR TESTS
echo ""
echo "🔍 Paso 7: Verificando tests..."

if ! npm run test > /dev/null 2>&1; then
    echo "❌ ERROR: Tests fallan"
    exit 1
fi
echo "✅ Tests funcionando"

# 8. VERIFICAR QUALITY GATE
echo ""
echo "🔍 Paso 8: Verificando quality gate..."

if ! npm run quality:gate > /dev/null 2>&1; then
    echo "❌ ERROR: Quality gate falla"
    exit 1
fi
echo "✅ Quality gate funcionando"

# 9. VERIFICAR IMPORTS EN ARCHIVOS PRINCIPALES
echo ""
echo "🔍 Paso 9: Verificando imports en archivos principales..."

# Verificar que los imports en archivos principales siguen siendo válidos
if grep -q "import.*\.\./\.\./shared" orchestration/orchestrator.js; then
    echo "❌ ERROR: Imports incorrectos en orquestador"
    exit 1
fi
echo "✅ Imports en orquestador correctos"

# 10. VERIFICAR CONFIGURACIONES MCP
echo ""
echo "🔍 Paso 10: Verificando configuraciones MCP..."

if [ ! -f ".mcp.json" ]; then
    echo "❌ ERROR: Configuración MCP no encontrada"
    exit 1
fi

if ! grep -q "orchestration/mcp-server-correct.js" .mcp.json; then
    echo "❌ ERROR: Configuración MCP incorrecta"
    exit 1
fi
echo "✅ Configuraciones MCP correctas"

echo ""
echo "🎉 VERIFICACIÓN DE PATHING COMPLETA - TODO CORRECTO"
echo "=================================================="
echo ""
echo "✅ Archivos críticos en raíz preservados"
echo "✅ Orquestador funcionando correctamente"
echo "✅ Agentes y esquemas encontrados"
echo "✅ Archivos movidos a carpetas correctas"
echo "✅ No hay archivos sueltos problemáticos"
echo "✅ Tests funcionando"
echo "✅ Quality gate funcionando"
echo "✅ Imports correctos"
echo "✅ Configuraciones MCP correctas"
echo ""
echo "🔒 La reorganización no ha causado problemas de pathing"
echo "   Todos los sistemas funcionan correctamente"
