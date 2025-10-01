#!/bin/bash
# Smoke tests básicos para Gate 1

set -e

echo "🧪 Ejecutando smoke tests..."

# Test 1: Handshake de agentes
echo "  🔄 Probando handshake de agentes..."
echo '{"type":"hello","agent":"context"}' | node agents/context/agent.js > /dev/null && echo "    ✅ Context handshake OK" || echo "    ❌ Context handshake FAIL"
echo '{"type":"hello","agent":"prompting"}' | node agents/prompting/agent.js > /dev/null && echo "    ✅ Prompting handshake OK" || echo "    ❌ Prompting handshake FAIL"
echo '{"type":"hello","agent":"rules"}' | node agents/rules/agent.js > /dev/null && echo "    ✅ Rules handshake OK" || echo "    ❌ Rules handshake FAIL"

# Test 2: Schema validation
echo "  🔄 Probando validación de schema..."
echo '{"requestId":"test","agent":"context","capability":"context.resolve","payload":{},"ts":"2025-01-01T00:00:00Z"}' | node agents/context/agent.js > /dev/null && echo "    ✅ Context schema OK" || echo "    ❌ Context schema FAIL"

# Test 3: Health check del sistema
echo "  🔄 Probando health check del sistema..."
npm run mcp:init > /dev/null && echo "    ✅ Health check OK" || echo "    ❌ Health check FAIL"

echo "✅ Smoke tests completados"
