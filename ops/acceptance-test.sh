#!/usr/bin/env bash
set -euo pipefail

# Acceptance Test de 2 minutos antes del merge
# Valida que toda la estructura /ops esté lista para producción

echo "🧪 [ACCEPTANCE-TEST] Iniciando validación de estructura /ops..."

# Función de error
fail() {
    echo "❌ [ACCEPTANCE-TEST] $1"
    exit 1
}

# Función de éxito
ok() {
    echo "✅ [ACCEPTANCE-TEST] $1"
}

echo ""
echo "🎯 TEST 1: Smoke Local (30s)"
echo "============================"

# Verificar que el servidor esté corriendo
if ! curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
    echo "⚠️ Servidor no está corriendo, iniciando..."
    node src/server.mjs &
    SERVER_PID=$!
    sleep 3
    
    # Verificar que arrancó
    if ! curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
        fail "No se pudo iniciar el servidor para el test"
    fi
else
    SERVER_PID=""
fi

# Ejecutar smoke pack
echo "💨 Ejecutando smoke pack..."
bash ops/scripts/smoke-pack.sh http://localhost:3000/metrics || fail "Smoke pack falló"
ok "Smoke pack completado"

echo ""
echo "🎯 TEST 2: Rules Prometheus Válidas (30s)"
echo "=========================================="

# Verificar que promtool esté disponible
if command -v promtool >/dev/null 2>&1; then
    echo "🔍 Validando reglas de Prometheus..."
    promtool check rules ops/prometheus/quannex-metrics.rules.yaml || fail "Reglas de Prometheus inválidas"
    ok "Reglas de Prometheus válidas"
else
    echo "⚠️ promtool no disponible, validando sintaxis básica..."
    # Validación básica: debe contener 'groups:' y 'rules:'
    grep -q 'groups:' ops/prometheus/quannex-metrics.rules.yaml || fail "Falta 'groups:' en reglas"
    grep -q 'rules:' ops/prometheus/quannex-metrics.rules.yaml || fail "Falta 'rules:' en reglas"
    grep -q 'QuanNexMetricsMissing' ops/prometheus/quannex-metrics.rules.yaml || fail "Falta alerta QuanNexMetricsMissing"
    ok "Sintaxis básica válida"
fi

echo ""
echo "🎯 TEST 3: Dashboard Importable (30s)"
echo "======================================"

# Verificar que el dashboard sea JSON válido
echo "🔍 Validando JSON del dashboard..."
if command -v jq >/dev/null 2>&1; then
    jq empty ops/dashboards/quannex-operator-golden.json || fail "Dashboard JSON inválido"
    PANELS=$(jq '.panels | length' ops/dashboards/quannex-operator-golden.json)
    if [ "$PANELS" -lt 8 ]; then
        fail "Dashboard debe tener al menos 8 paneles, tiene $PANELS"
    fi
    ok "Dashboard tiene $PANELS paneles"
else
    echo "⚠️ jq no disponible, validando sintaxis básica..."
    grep -q '"panels"' ops/dashboards/quannex-operator-golden.json || fail "Falta 'panels' en dashboard"
    grep -q '"title"' ops/dashboards/quannex-operator-golden.json || fail "Falta 'title' en dashboard"
    ok "Sintaxis básica válida"
fi

echo ""
echo "🎯 TEST 4: Scripts Ejecutables (30s)"
echo "===================================="

# Verificar que todos los scripts sean ejecutables
for script in ops/scripts/*.sh ops/canary/*.sh; do
    if [ -f "$script" ]; then
        if [ ! -x "$script" ]; then
            fail "Script $script no es ejecutable"
        fi
    fi
done
ok "Todos los scripts son ejecutables"

# Verificar que los scripts tengan shebang
for script in ops/scripts/*.sh ops/canary/*.sh; do
    if [ -f "$script" ]; then
        if ! head -1 "$script" | grep -q '#!/bin/bash\|#!/usr/bin/env bash'; then
            fail "Script $script no tiene shebang correcto"
        fi
    fi
done
ok "Todos los scripts tienen shebang correcto"

echo ""
echo "🎯 TEST 5: Estructura Completa (30s)"
echo "===================================="

# Verificar que todos los archivos esperados existan
REQUIRED_FILES=(
    "ops/RUNBOOK.md"
    "ops/SLOs.md"
    "ops/prometheus/quannex-metrics.rules.yaml"
    "ops/dashboards/quannex-operator-golden.json"
    "ops/ci/metrics_integrity_gate.yml"
    "ops/scripts/metrics-validate.sh"
    "ops/scripts/smoke-pack.sh"
    "ops/canary/rollout-policy.md"
    "ops/canary/abort-canary.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        fail "Archivo requerido no encontrado: $file"
    fi
done
ok "Todos los archivos requeridos presentes"

# Verificar que los archivos no estén vacíos
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -s "$file" ]; then
        fail "Archivo vacío: $file"
    fi
done
ok "Ningún archivo está vacío"

echo ""
echo "🎉 ACCEPTANCE TEST COMPLETADO"
echo "============================="
echo "✅ Smoke local: OK"
echo "✅ Rules Prometheus: OK"
echo "✅ Dashboard importable: OK"
echo "✅ Scripts ejecutables: OK"
echo "✅ Estructura completa: OK"
echo ""
echo "🚀 Estructura /ops lista para producción"
echo "⏱️ Tiempo total: ~2 minutos"
echo "🔒 Validación completa antes del merge"

# Limpiar servidor si lo iniciamos
if [ -n "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null || true
fi
