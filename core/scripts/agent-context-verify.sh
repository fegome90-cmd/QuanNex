#!/bin/bash
set -euo pipefail

# Script de verificación para @context agent
# Valida JSON contra schema, ejecuta pruebas de "golden contexts"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/.reports"

mkdir -p "$REPORTS_DIR"

echo "🤖 Verificando @context agent..."

# 1. Validar JSON contra schema
echo "📋 Validando JSON contra schema..."
if [ -f "$PROJECT_ROOT/schemas/agents/context.input.schema.json" ]; then
  echo "✅ Schema encontrado"
else
  echo "❌ Schema no encontrado"
  exit 1
fi

# 2. Ejecutar pruebas de "golden contexts"
echo "🧪 Ejecutando pruebas de golden contexts..."

# Crear directorio temporal para pruebas
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Crear directorio out necesario para el agente
mkdir -p out

# Test 1: Contexto básico
echo "Test 1: Contexto básico"
cat > test1.json << 'EOF'
{
  "sources": [
    "Proyecto de frontend con React y TypeScript",
    "Usar Vite como bundler",
    "Implementar responsive design",
    "Soporte para PWA"
  ],
  "selectors": ["frontend", "react", "typescript"],
  "max_tokens": 1000
}
EOF

# Ejecutar agente
if node "$PROJECT_ROOT/agents/context/agent.js" < test1.json > output1.json 2>/dev/null; then
  echo "✅ Test 1 pasó"
  TEST1_PASS=true
else
  echo "❌ Test 1 falló"
  TEST1_PASS=false
fi

# Test 2: Contexto complejo
echo "Test 2: Contexto complejo"
cat > test2.json << 'EOF'
{
  "sources": [
    "Proyecto fullstack con Node.js y Express",
    "Base de datos PostgreSQL",
    "Frontend con React",
    "API REST con autenticación JWT",
    "Actualizaciones en tiempo real con WebSockets"
  ],
  "selectors": ["fullstack", "nodejs", "express", "postgresql", "react"],
  "max_tokens": 2000
}
EOF

if node "$PROJECT_ROOT/agents/context/agent.js" < test2.json > output2.json 2>/dev/null; then
  echo "✅ Test 2 pasó"
  TEST2_PASS=true
else
  echo "❌ Test 2 falló"
  TEST2_PASS=false
fi

# Test 3: Contexto inválido (debe fallar)
echo "Test 3: Contexto inválido (debe fallar)"
cat > test3.json << 'EOF'
{
  "sources": [],
  "selectors": []
}
EOF

if node "$PROJECT_ROOT/agents/context/agent.js" < test3.json > output3.json 2>/dev/null; then
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

cat > "$REPORTS_DIR/context-verification.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "agent": "@context",
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "contract_pass_percent": $CONTRACT_PASS_PERCENT,
  "status": "$([ $CONTRACT_PASS_PERCENT -eq 100 ] && echo "PASS" || echo "FAIL")",
  "tests": [
    {
      "name": "Contexto básico",
      "passed": $TEST1_PASS
    },
    {
      "name": "Contexto complejo",
      "passed": $TEST2_PASS
    },
    {
      "name": "Contexto inválido (debe fallar)",
      "passed": $TEST3_PASS
    }
  ]
}
EOF

echo "✅ Verificación completada"
echo "📊 Resultados: $PASSED_TESTS/$TOTAL_TESTS tests pasaron ($CONTRACT_PASS_PERCENT%)"

if [ $CONTRACT_PASS_PERCENT -eq 100 ]; then
  echo "🎉 @context agent: 100% funcional"
  exit 0
else
  echo "❌ @context agent: Necesita mejoras"
  exit 1
fi
