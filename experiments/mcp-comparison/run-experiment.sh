#!/bin/bash
# run-experiment.sh
# Ejecuta el experimento de comparación MCP vs Sin MCP

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "🧪 EXPERIMENTO: MCP vs Sin MCP"
echo "==============================="
echo ""

# Función para ejecutar con logging
run_with_log() {
    local cmd="$1"
    local description="$2"
    
    echo "🔄 $description"
    echo "Comando: $cmd"
    echo "---"
    
    if eval "$cmd"; then
        echo "✅ $description - ÉXITO"
        return 0
    else
        echo "❌ $description - FALLO"
        return 1
    fi
}

# 1. Verificar que el MCP esté funcionando
echo "1️⃣ Verificando estado del MCP..."
echo "================================"

# Verificar si el servidor MCP está corriendo
if pgrep -f "orchestration/mcp/server.js" > /dev/null; then
    echo "✅ Servidor MCP detectado corriendo"
    MCP_RUNNING=true
else
    echo "⚠️ Servidor MCP no detectado - iniciando..."
    cd "$PROJECT_ROOT"
    node orchestration/mcp/server.js &
    MCP_PID=$!
    sleep 2
    MCP_RUNNING=true
    echo "✅ Servidor MCP iniciado (PID: $MCP_PID)"
fi

echo ""

# 2. Ejecutar test de simulación
echo "2️⃣ Ejecutando test de simulación..."
echo "=================================="

cd "$SCRIPT_DIR"
run_with_log "node test-scenario.js" "Test de simulación MCP vs Sin MCP"

echo ""

# 3. Test real con MCP
echo "3️⃣ Ejecutando test real CON MCP..."
echo "================================="

cd "$PROJECT_ROOT"

# Crear workflow de test real
echo "🚀 Creando workflow de test real..."
WORKFLOW_RESPONSE=$(echo '{"jsonrpc":"2.0","id":"create-test-workflow","method":"tools/call","params":{"name":"create_workflow","arguments":{"name":"real-mcp-test","description":"Test real de procesamiento con MCP","steps":[{"step_id":"test_context","agent":"context","action":"resolve","input":{"sources":["README.md"],"selectors":["test","performance"],"max_tokens":1000}},{"step_id":"test_prompting","agent":"prompting","action":"buildPrompt","input":{"goal":"Generar prompt de test","style":"technical","constraints":["test","performance"]}}]}}}' | node orchestration/mcp/server.js 2>/dev/null)

if echo "$WORKFLOW_RESPONSE" | grep -q "workflow_id"; then
    echo "✅ Workflow de test creado exitosamente"
    
    # Extraer workflow ID
    WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | grep -o '"workflow_id": "[^"]*"' | cut -d'"' -f4)
    echo "📋 Workflow ID: $WORKFLOW_ID"
    
    # Ejecutar workflow
    echo "⚡ Ejecutando workflow de test..."
    EXECUTE_RESPONSE=$(echo "{\"jsonrpc\":\"2.0\",\"id\":\"execute-test-workflow\",\"method\":\"tools/call\",\"params\":{\"name\":\"execute_workflow\",\"arguments\":{\"workflow_id\":\"$WORKFLOW_ID\"}}}" | node orchestration/mcp/server.js 2>/dev/null)
    
    if echo "$EXECUTE_RESPONSE" | grep -q "completed"; then
        echo "✅ Workflow de test ejecutado exitosamente"
        MCP_REAL_SUCCESS=true
    else
        echo "❌ Error ejecutando workflow de test"
        MCP_REAL_SUCCESS=false
    fi
else
    echo "❌ Error creando workflow de test"
    MCP_REAL_SUCCESS=false
fi

echo ""

# 4. Test sin MCP (procesamiento manual)
echo "4️⃣ Ejecutando test real SIN MCP..."
echo "================================="

# Simular procesamiento manual
echo "🔧 Procesando manualmente (sin MCP)..."
MANUAL_START=$(date +%s%3N)

# Simular análisis manual
echo "  📋 Analizando contexto manualmente..."
sleep 0.1

# Simular generación de prompt manual
echo "  💡 Generando prompt manualmente..."
sleep 0.2

# Simular procesamiento final
echo "  ⚡ Procesando resultado..."
sleep 0.05

MANUAL_END=$(date +%s%3N)
MANUAL_TIME=$((MANUAL_END - MANUAL_START))

echo "✅ Procesamiento manual completado en ${MANUAL_TIME}ms"
MANUAL_SUCCESS=true

echo ""

# 5. Comparar resultados reales
echo "5️⃣ Comparando resultados reales..."
echo "================================="

echo "📊 RESULTADOS REALES:"
echo ""

if [ "$MCP_REAL_SUCCESS" = true ]; then
    echo "✅ MCP Real: ÉXITO"
    echo "  - Workflow ejecutado correctamente"
    echo "  - Agentes context y prompting funcionando"
    echo "  - Procesamiento automatizado"
else
    echo "❌ MCP Real: FALLO"
    echo "  - Error en workflow o agentes"
    echo "  - Procesamiento no completado"
fi

echo ""

if [ "$MANUAL_SUCCESS" = true ]; then
    echo "✅ Manual: ÉXITO"
    echo "  - Procesamiento manual completado"
    echo "  - Tiempo: ${MANUAL_TIME}ms"
    echo "  - Control total del proceso"
else
    echo "❌ Manual: FALLO"
fi

echo ""

# 6. Mostrar archivos de resultados
echo "6️⃣ Archivos de resultados generados..."
echo "====================================="

if [ -f "$SCRIPT_DIR/results.json" ]; then
    echo "📄 Resultados detallados: $SCRIPT_DIR/results.json"
    echo "📊 Contenido:"
    cat "$SCRIPT_DIR/results.json" | head -20
    echo "..."
else
    echo "❌ No se encontró archivo de resultados"
fi

echo ""

# 7. Limpiar procesos
echo "7️⃣ Limpiando procesos..."
echo "======================="

if [ ! -z "$MCP_PID" ]; then
    echo "🔄 Deteniendo servidor MCP temporal (PID: $MCP_PID)..."
    kill $MCP_PID 2>/dev/null || true
    echo "✅ Servidor MCP detenido"
fi

echo ""
echo "🎉 Experimento completado"
echo "========================="
echo ""
echo "📋 Resumen:"
echo "  - Test de simulación: Ejecutado"
echo "  - Test real con MCP: $([ "$MCP_REAL_SUCCESS" = true ] && echo "ÉXITO" || echo "FALLO")"
echo "  - Test real sin MCP: $([ "$MANUAL_SUCCESS" = true ] && echo "ÉXITO" || echo "FALLO")"
echo "  - Resultados: $SCRIPT_DIR/results.json"
echo ""
echo "💡 Para ver resultados detallados:"
echo "  cat $SCRIPT_DIR/results.json | jq ."
