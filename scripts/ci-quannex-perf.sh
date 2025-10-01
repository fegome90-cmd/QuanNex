#!/bin/bash
# ci-quannex-perf.sh
# CI job para performance gate QuanNex
# Ejecuta experimento A/B, genera snapshot y evalúa criterios

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 CI-QUANNEX-PERF"
echo "=================="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Project: $PROJECT_ROOT"
echo ""

# Función para logging con timestamp
log() {
    echo "[$(date -u +"%H:%M:%S")] $1"
}

# Función para manejo de errores
handle_error() {
    log "❌ Error en $1 - Código: $2"
    log "💾 Guardando artefactos de debug..."
    
    # Crear directorio de artefactos
    ARTIFACTS_DIR="$PROJECT_ROOT/.quannex/ci-artifacts"
    mkdir -p "$ARTIFACTS_DIR"
    
    # Guardar logs de error
    echo "Error en $1 - Código: $2" > "$ARTIFACTS_DIR/error.log"
    echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$ARTIFACTS_DIR/error.log"
    
    # Guardar estado del sistema
    ps aux > "$ARTIFACTS_DIR/processes.txt" 2>/dev/null || true
    df -h > "$ARTIFACTS_DIR/disk-usage.txt" 2>/dev/null || true
    
    exit $2
}

# Configurar trap para errores
trap 'handle_error "ci-quannex-perf" $?' ERR

# Paso 1: Verificar pre-requisitos
log "🔍 Verificando pre-requisitos..."

# Verificar que Node.js esté disponible
if ! command -v node &> /dev/null; then
    log "❌ Node.js no encontrado"
    exit 1
fi

# Verificar que los scripts existan
REQUIRED_SCRIPTS=(
    "tools/verify-perf.js"
    "tools/snapshot-perf.js"
    "tools/ab-experiment.mjs"
    "tools/performance-gate.mjs"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ ! -f "$PROJECT_ROOT/$script" ]; then
        log "❌ Script requerido no encontrado: $script"
        exit 1
    fi
done

log "✅ Pre-requisitos verificados"

# Paso 2: Limpiar artefactos anteriores
log "🧹 Limpiando artefactos anteriores..."
rm -rf "$PROJECT_ROOT/.quannex/ci-artifacts" || true
mkdir -p "$PROJECT_ROOT/.quannex/ci-artifacts"

# Paso 3: Ejecutar experimento A/B
log "🧪 Ejecutando experimento A/B..."
cd "$PROJECT_ROOT"

if ! node tools/ab-experiment.mjs run; then
    log "❌ Experimento A/B falló"
    exit 1
fi

log "✅ Experimento A/B completado"

# Paso 4: Generar snapshot de performance
log "📸 Generando snapshot de performance..."

if ! node tools/snapshot-perf.js generate; then
    log "❌ Generación de snapshot falló"
    exit 1
fi

log "✅ Snapshot generado"

# Paso 5: Ejecutar performance gate
log "🚪 Ejecutando performance gate..."

GATE_RESULT=0
if ! node tools/performance-gate.mjs run; then
    GATE_RESULT=1
    log "❌ Performance gate falló"
else
    log "✅ Performance gate pasó"
fi

# Paso 6: Recopilar artefactos
log "📦 Recopilando artefactos..."

ARTIFACTS_DIR="$PROJECT_ROOT/.quannex/ci-artifacts"

# Copiar snapshots
cp "$PROJECT_ROOT/.quannex/perf-snapshot.json" "$ARTIFACTS_DIR/" 2>/dev/null || true
cp "$PROJECT_ROOT/.quannex/ab-snapshot.json" "$ARTIFACTS_DIR/" 2>/dev/null || true
cp "$PROJECT_ROOT/.quannex/gate-results.json" "$ARTIFACTS_DIR/" 2>/dev/null || true

# Copiar resultados del experimento A/B
if [ -d "$PROJECT_ROOT/experiments/ab-results" ]; then
    cp -r "$PROJECT_ROOT/experiments/ab-results" "$ARTIFACTS_DIR/"
fi

# Generar reporte de CI
cat > "$ARTIFACTS_DIR/ci-report.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "job": "ci-quannex-perf",
  "project": "$PROJECT_ROOT",
  "gate_passed": $([ $GATE_RESULT -eq 0 ] && echo "true" || echo "false"),
  "artifacts": [
    "perf-snapshot.json",
    "ab-snapshot.json", 
    "gate-results.json",
    "ab-results/"
  ],
  "criteria": {
    "p95_improvement": 0.85,
    "error_rate_max": 1.0,
    "tokens_overhead": 1.10
  }
}
EOF

log "✅ Artefactos recopilados en: $ARTIFACTS_DIR"

# Paso 7: Mostrar resumen
log "📊 RESUMEN DEL CI"
echo "=================="
echo ""

if [ $GATE_RESULT -eq 0 ]; then
    echo "✅ CI-QUANNEX-PERF: ÉXITO"
    echo "🚀 Performance gate pasó - cambios aceptados"
    echo ""
    echo "📋 Criterios cumplidos:"
    echo "  ✅ P95 mejora ≥15%"
    echo "  ✅ Error rate ≤1.0%"
    echo "  ✅ Tokens overhead ≤10%"
else
    echo "❌ CI-QUANNEX-PERF: FALLO"
    echo "⚠️  Performance gate falló - cambios rechazados"
    echo ""
    echo "📋 Revisar criterios:"
    echo "  ❌ P95 mejora <15%"
    echo "  ❌ Error rate >1.0%"
    echo "  ❌ Tokens overhead >10%"
fi

echo ""
echo "📦 Artefactos disponibles en: $ARTIFACTS_DIR"
echo "📄 Reporte CI: $ARTIFACTS_DIR/ci-report.json"

if [ -f "$PROJECT_ROOT/.quannex/gate-results.json" ]; then
    echo ""
    echo "🔍 Detalles del gate:"
    echo "====================="
    cat "$PROJECT_ROOT/.quannex/gate-results.json" | jq -r '
        "P95: " + (.evaluation.p95_improvement.current | tostring) + "ms (" + 
        (.evaluation.p95_improvement.passed | if . then "✅" else "❌" end) + ")",
        "Error Rate: " + (.evaluation.error_rate_acceptable.current | tostring) + "% (" + 
        (.evaluation.error_rate_acceptable.passed | if . then "✅" else "❌" end) + ")",
        "Tokens: " + (.evaluation.tokens_overhead_acceptable.current | tostring) + " (" + 
        (.evaluation.tokens_overhead_acceptable.passed | if . then "✅" else "❌" end) + ")"
    ' 2>/dev/null || echo "  (Detalles no disponibles)"
fi

echo ""
log "🏁 CI-QUANNEX-PERF completado"

exit $GATE_RESULT
