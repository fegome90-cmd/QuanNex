#!/bin/bash

# Script de verificación del orquestador QuanNex
# Ejecutar en cada nuevo chat para evitar problemas recurrentes

set -e

echo "🔍 Verificando Orquestador QuanNex..."

# Verificar directorio correcto
if [ "$(pwd)" != "/Users/felipe/Developer/startkit-main" ]; then
    echo "❌ ERROR: No estás en el directorio correcto"
    echo "   Actual: $(pwd)"
    echo "   Esperado: /Users/felipe/Developer/startkit-main"
    echo "   Solución: cd /Users/felipe/Developer/startkit-main"
    exit 1
fi
echo "✅ Directorio correcto: $(pwd)"

# Verificar que el orquestador correcto existe
if [ ! -f "orchestration/orchestrator.js" ]; then
    echo "❌ ERROR: Orquestador principal no encontrado"
    echo "   Archivo esperado: orchestration/orchestrator.js"
    exit 1
fi
echo "✅ Orquestador principal encontrado: orchestration/orchestrator.js"

# Verificar que es ejecutable
if [ ! -x "orchestration/orchestrator.js" ]; then
    echo "❌ ERROR: Orquestador no es ejecutable"
    echo "   Solución: chmod +x orchestration/orchestrator.js"
    exit 1
fi
echo "✅ Orquestador es ejecutable"

# Verificar salud de agentes
echo "🔍 Verificando salud de agentes..."
if ! node orchestration/orchestrator.js health > /dev/null 2>&1; then
    echo "❌ ERROR: Agentes no están saludables"
    echo "   Ejecutar: node orchestration/orchestrator.js health"
    exit 1
fi
echo "✅ Agentes saludables"

# Verificar que no hay enlaces simbólicos problemáticos
if [ -L "orchestration/test-orchestration.js" ]; then
    echo "⚠️  ADVERTENCIA: Enlace simbólico problemático encontrado"
    echo "   Archivo: orchestration/test-orchestration.js"
    echo "   Recomendación: rm orchestration/test-orchestration.js"
fi

# Verificar imports del orquestador principal
echo "🔍 Verificando imports del orquestador..."
if grep -q "../../shared/contracts" orchestration/orchestrator.js; then
    echo "❌ ERROR: Imports incorrectos en orquestador principal"
    echo "   Problema: Rutas relativas incorrectas"
    exit 1
fi
echo "✅ Imports correctos en orquestador principal"

# Verificar que shared/contracts existe
if [ ! -d "shared/contracts" ]; then
    echo "❌ ERROR: Carpeta shared/contracts no encontrada"
    exit 1
fi
echo "✅ Carpeta shared/contracts encontrada"

# Verificar archivos de contratos
for file in handshake.js schema.js threadstate.js; do
    if [ ! -f "shared/contracts/$file" ]; then
        echo "❌ ERROR: Archivo de contrato no encontrado: shared/contracts/$file"
        exit 1
    fi
done
echo "✅ Archivos de contratos encontrados"

# Verificar esquemas de agentes
echo "🔍 Verificando esquemas de agentes..."
for agent in context prompting rules; do
    if [ ! -f "schemas/agents/$agent.input.schema.json" ]; then
        echo "❌ ERROR: Esquema de entrada no encontrado: schemas/agents/$agent.input.schema.json"
        exit 1
    fi
    if [ ! -f "schemas/agents/$agent.output.schema.json" ]; then
        echo "❌ ERROR: Esquema de salida no encontrado: schemas/agents/$agent.output.schema.json"
        exit 1
    fi
done
echo "✅ Esquemas de agentes encontrados"

# Verificar agentes
echo "🔍 Verificando agentes..."
for agent in context prompting rules; do
    if [ ! -f "agents/$agent/agent.js" ]; then
        echo "❌ ERROR: Agente no encontrado: agents/$agent/agent.js"
        exit 1
    fi
done
echo "✅ Agentes encontrados"

echo ""
echo "🎉 VERIFICACIÓN COMPLETA - TODO CORRECTO"
echo ""
echo "📋 Comandos disponibles:"
echo "   node orchestration/orchestrator.js health"
echo "   node orchestration/orchestrator.js create workflow.json"
echo "   node orchestration/orchestrator.js execute <workflow_id>"
echo ""
echo "📚 Documentación:"
echo "   docs/orchestrator-troubleshooting.md"
echo "   docs/workflow-orchestrator-fix.md"
echo ""
echo "✅ El orquestador está listo para usar"
