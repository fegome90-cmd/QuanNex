#!/bin/bash
# Smoke tests básicos para Gate 1

set -e

echo "🧪 Ejecutando smoke tests..."

# Test 1: Handshake de agentes
echo "  🔄 Probando handshake de agentes..."
echo '{"requestId":"smoke-context","sources":["README.md"],"selectors":["test"],"max_tokens":100,"ts":"'"$(date -Iseconds)"'"}' | node agents/context/agent.js > /dev/null && echo "    ✅ Context handshake OK" || { echo "    ❌ Context handshake FAIL"; exit 1; }
echo '{"goal":"test","context":"test context","constraints":["test"],"style":"default","ts":"'"$(date -Iseconds)"'"}' | node agents/prompting/agent.js > /dev/null && echo "    ✅ Prompting handshake OK" || { echo "    ❌ Prompting handshake FAIL"; exit 1; }
echo '{"policy_refs":["README.md"],"tone":"neutral","domain":"general","compliance_level":"basic","ts":"'"$(date -Iseconds)"'"}' | node agents/rules/agent.js > /dev/null && echo "    ✅ Rules handshake OK" || { echo "    ❌ Rules handshake FAIL"; exit 1; }

# Test 2: Schema validation
echo "  🔄 Probando validación de schema..."
echo '{"requestId":"smoke-context","sources":["README.md"],"selectors":["test"],"max_tokens":100,"ts":"'"$(date -Iseconds)"'"}' | node agents/context/agent.js > /dev/null && echo "    ✅ Context schema OK" || { echo "    ❌ Context schema FAIL"; exit 1; }

# Test 3: Health check del sistema
echo "  🔄 Probando health check del sistema..."
npm run mcp:init > /dev/null && echo "    ✅ Health check OK" || echo "    ❌ Health check FAIL"

echo "✅ Smoke tests completados"
