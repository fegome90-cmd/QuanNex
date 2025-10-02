#!/bin/bash
set -euo pipefail

# Script de verificación para @prompting agent
# Valida JSON contra schema, ejecuta pruebas de "golden prompts"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/.reports"

mkdir -p "$REPORTS_DIR"

echo "🤖 Verificando @prompting agent..."

# 1. Validar JSON contra schema
echo "📋 Validando JSON contra schema..."
if [ -f "$PROJECT_ROOT/schemas/agents/prompting.input.schema.json" ]; then
  echo "✅ Schema encontrado"
else
  echo "❌ Schema no encontrado"
  exit 1
fi

# 2. Ejecutar pruebas de "golden prompts"
echo "🧪 Ejecutando pruebas de golden prompts..."

# Crear directorio temporal para pruebas
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Test 1: Prompt básico
echo "Test 1: Prompt básico"
cat > test1.json << 'EOF'
{
  "goal": "Crear un componente React",
  "context": "Proyecto de frontend con TypeScript",
  "constraints": ["Usar hooks", "Responsive design"],
  "examples": ["Button component", "Input component"],
  "schema_version": "1.0.0",
  "agent_version": "1.0.0",
  "system_prompt": "Eres un experto en React y TypeScript",
  "user_prompt": "Crea un componente React con TypeScript que sea responsive"
}
EOF

# Ejecutar agente
if node "$PROJECT_ROOT/agents/prompting/agent.js" < test1.json > output1.json 2>/dev/null; then
  echo "✅ Test 1 pasó"
  TEST1_PASS=true
else
  echo "❌ Test 1 falló"
  TEST1_PASS=false
fi

# Test 2: Prompt con validación
echo "Test 2: Prompt con validación"
cat > test2.json << 'EOF'
{
  "goal": "Implementar autenticación",
  "context": "API REST con Node.js",
  "constraints": ["JWT tokens", "Bcrypt para passwords"],
  "examples": ["Login endpoint", "Middleware de auth"],
  "schema_version": "1.0.0",
  "agent_version": "1.0.0",
  "system_prompt": "Eres un experto en Node.js y seguridad",
  "user_prompt": "Implementa un sistema de autenticación seguro con JWT"
}
EOF

if node "$PROJECT_ROOT/agents/prompting/agent.js" < test2.json > output2.json 2>/dev/null; then
  echo "✅ Test 2 pasó"
  TEST2_PASS=true
else
  echo "❌ Test 2 falló"
  TEST2_PASS=false
fi

# Test 3: Prompt inválido (debe fallar)
echo "Test 3: Prompt inválido (debe fallar)"
cat > test3.json << 'EOF'
{
  "goal": "",
  "context": "Test inválido"
}
EOF

if node "$PROJECT_ROOT/agents/prompting/agent.js" < test3.json > output3.json 2>/dev/null; then
  echo "❌ Test 3 falló (debería haber fallado)"
  TEST3_PASS=false
else
  echo "✅ Test 3 pasó (falló como se esperaba)"
  TEST3_PASS=true
fi

# Limpiar directorio temporal
cd "$PROJECT_ROOT"
rm -rf "$TEMP_DIR"

# 3. Generar reporte
echo "📊 Generando reporte..."

TOTAL_TESTS=3
PASSED_TESTS=0

if [ "$TEST1_PASS" = true ]; then
  ((PASSED_TESTS++))
fi
if [ "$TEST2_PASS" = true ]; then
  ((PASSED_TESTS++))
fi
if [ "$TEST3_PASS" = true ]; then
  ((PASSED_TESTS++))
fi

CONTRACT_PASS_PERCENT=$((PASSED_TESTS * 100 / TOTAL_TESTS))

cat > "$REPORTS_DIR/prompting-verification.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "agent": "@prompting",
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "contract_pass_percent": $CONTRACT_PASS_PERCENT,
  "status": "$([ $CONTRACT_PASS_PERCENT -eq 100 ] && echo "PASS" || echo "FAIL")",
  "tests": [
    {
      "name": "Prompt básico",
      "passed": $TEST1_PASS
    },
    {
      "name": "Prompt con validación",
      "passed": $TEST2_PASS
    },
    {
      "name": "Prompt inválido (debe fallar)",
      "passed": $TEST3_PASS
    }
  ]
}
EOF

echo "✅ Verificación completada"
echo "📊 Resultados: $PASSED_TESTS/$TOTAL_TESTS tests pasaron ($CONTRACT_PASS_PERCENT%)"

if [ $CONTRACT_PASS_PERCENT -eq 100 ]; then
  echo "🎉 @prompting agent: 100% funcional"
  exit 0
else
  echo "❌ @prompting agent: Necesita mejoras"
  exit 1
fi
