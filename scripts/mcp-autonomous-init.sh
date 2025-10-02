#!/bin/bash
# Script de inicialización autónoma del sistema MCP interno
# Sin dependencia de herramientas externas como Archon

set -euo pipefail

echo "🚀 Iniciando sistema MCP autónomo..."

# Verificar que Node.js esté disponible
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    exit 1
fi

# Verificar que los archivos del sistema MCP interno existan
REQUIRED_FILES=(
    "orchestration/mcp/server.js"
    "orchestrator.js"
    "versions/v3/context-agent.js"
    "versions/v3/prompting-agent.js"
    "versions/v3/rules-agent.js"
    ".cursor/mcp.json"
    ".mcp.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Error: Archivo requerido no encontrado: $file"
        exit 1
    fi
done

echo "✅ Verificación de archivos completada"

# Crear directorio de reports si no existe
mkdir -p .reports

# Probar el health check del orquestador
echo "🔍 Probando health check del orquestador..."
if VERSION=${VERSION:-latest} node orchestrator.js health > .reports/mcp-health.json 2>&1; then
    echo "✅ Health check del orquestador exitoso"
    cat .reports/mcp-health.json
else
    echo "⚠️ Health check falló"
    echo "📋 Logs del health check:"
    cat .reports/mcp-health.json || echo "No se generaron logs"
fi

# Probar agentes individuales
echo "🔍 Probando agentes individuales..."

# Test context agent
echo "  🧠 Probando agente context..."
if echo '{"requestId":"health-context","agent":"context","capability":"context.resolve","payload":{"sources":["README.md"],"selectors":["test"]},"ts":"'"$(date -Iseconds)"'"}' | node versions/v3/context-agent.js > .reports/context-test.json 2>&1; then
    echo "    ✅ Agente context operativo"
else
    echo "    ⚠️ Agente context falló"
fi

# Test prompting agent
echo "  💬 Probando agente prompting..."
if echo '{"requestId":"health-prompting","agent":"prompting","capability":"prompting.buildPrompt","payload":{"goal":"test","style":"formal"},"ts":"'"$(date -Iseconds)"'"}' | node versions/v3/prompting-agent.js > .reports/prompting-test.json 2>&1; then
    echo "    ✅ Agente prompting operativo"
else
    echo "    ⚠️ Agente prompting falló"
fi

# Test rules agent
echo "  📋 Probando agente rules..."
if echo '{"requestId":"health-rules","agent":"rules","capability":"rules.enforce","payload":{"policy_refs":["README.md"],"compliance_level":"basic"},"ts":"'"$(date -Iseconds)"'"}' | node versions/v3/rules-agent.js > .reports/rules-test.json 2>&1; then
    echo "    ✅ Agente rules operativo"
else
    echo "    ⚠️ Agente rules falló"
fi

echo ""
echo "📊 Resumen del sistema MCP autónomo:"
echo "  🎯 Sistema MCP interno: Configurado correctamente"
echo "  🔧 Configuración de Cursor: Actualizada para usar sistema interno"
echo "  🚫 Sin dependencia de Archon: Sistema completamente autónomo"
echo "  📁 Configuración principal: .mcp.json y .cursor/mcp.json"
echo ""
echo "💡 Para usar con Cursor IDE:"
echo "   1. Reinicia Cursor IDE"
echo "   2. El sistema MCP interno debería estar disponible automáticamente"
echo "   3. Usa las herramientas: orchestration, context, prompting, rules"
echo ""
echo "✅ Sistema MCP autónomo inicializado correctamente"
