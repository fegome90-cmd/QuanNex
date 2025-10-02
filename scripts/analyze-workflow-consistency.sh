#!/bin/bash

# Script para analizar la consistencia del Workflow QuanNex Lab
# Ejecuta múltiples veces el workflow y compara resultados

set -e

echo "🔄 ANÁLISIS DE CONSISTENCIA - WORKFLOW QUANNEX LAB"
echo "=================================================="

# Verificar directorio correcto
if [ "$(pwd)" != "/Users/felipe/Developer/startkit-main" ]; then
    echo "❌ ERROR: No estás en el directorio correcto"
    exit 1
fi
echo "✅ Directorio correcto: $(pwd)"

# Crear directorio para resultados de consistencia
mkdir -p reports/consistency-analysis
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONSISTENCY_DIR="reports/consistency-analysis/$TIMESTAMP"
mkdir -p "$CONSISTENCY_DIR"

echo ""
echo "📊 Ejecutando análisis de consistencia..."
echo "   Directorio de resultados: $CONSISTENCY_DIR"
echo "   Ejecuciones programadas: 3"
echo ""

# Función para ejecutar workflow y extraer métricas
run_workflow_and_extract() {
    local run_number=$1
    local output_file="$CONSISTENCY_DIR/run_${run_number}.json"
    
    echo "🚀 Ejecutando workflow #$run_number..."
    
    # Crear workflow temporal
    cat > /tmp/quannex-consistency-workflow.json << 'EOF'
{
  "name": "workflow-quannex-consistency",
  "description": "Workflow para análisis de consistencia",
  "steps": [
    {
      "step_id": "context_analysis",
      "agent": "context",
      "input": {
        "sources": ["README.md", "package.json", "SECURITY.md"],
        "max_tokens": 2000
      }
    },
    {
      "step_id": "security_audit",
      "agent": "security",
      "input": {
        "target_path": ".",
        "scan_type": "full"
      },
      "depends_on": ["context_analysis"]
    },
    {
      "step_id": "metrics_analysis",
      "agent": "metrics",
      "input": {
        "metric_types": ["productivity", "quality", "performance"],
        "time_range": "7d",
        "analysis_depth": "basic"
      },
      "depends_on": ["context_analysis"]
    },
    {
      "step_id": "rules_compliance",
      "agent": "rules",
      "input": {
        "policy_refs": ["security", "quality", "performance"],
        "tone": "formal",
        "domain": "software_development",
        "compliance_level": "strict"
      },
      "depends_on": ["security_audit", "metrics_analysis"]
    },
    {
      "step_id": "fault_synthesis",
      "agent": "context",
      "input": {
        "sources": ["SECURITY.md", "package.json"],
        "max_tokens": 1500
      },
      "depends_on": ["security_audit", "metrics_analysis"]
    },
    {
      "step_id": "remediation_plan",
      "agent": "optimization",
      "input": {
        "analysis_type": "remediation",
        "target_areas": ["security", "performance", "quality"],
        "priority": "high"
      },
      "depends_on": ["fault_synthesis", "rules_compliance"]
    }
  ]
}
EOF

    # Crear workflow
    WORKFLOW_OUTPUT=$(node orchestration/orchestrator.js create /tmp/quannex-consistency-workflow.json)
    WORKFLOW_ID=$(echo "$WORKFLOW_OUTPUT" | grep -o '"workflow_id": "[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$WORKFLOW_ID" ]; then
        echo "❌ ERROR: No se pudo crear workflow #$run_number"
        return 1
    fi
    
    echo "   Workflow ID: $WORKFLOW_ID"
    
    # Ejecutar workflow
    EXECUTION_OUTPUT=$(node orchestration/orchestrator.js execute "$WORKFLOW_ID")
    
    # Guardar output completo
    echo "$EXECUTION_OUTPUT" > "$output_file"
    
    # Extraer métricas clave
    local duration=$(echo "$EXECUTION_OUTPUT" | grep -o '"duration_ms": [0-9]*' | head -1 | cut -d' ' -f2)
    local status=$(echo "$EXECUTION_OUTPUT" | grep -o '"status": "[^"]*"' | head -1 | cut -d'"' -f4)
    local completed_steps=$(echo "$EXECUTION_OUTPUT" | grep -o '"status": "completed"' | wc -l)
    local total_steps=$(echo "$EXECUTION_OUTPUT" | grep -o '"step_id"' | wc -l)
    
    echo "   Estado: $status"
    echo "   Pasos: $completed_steps/$total_steps"
    echo "   Duración: ${duration}ms"
    
    # Limpiar workflow
    node orchestration/orchestrator.js cleanup "$WORKFLOW_ID" > /dev/null 2>&1
    
    # Limpiar archivo temporal
    rm -f /tmp/quannex-consistency-workflow.json
    
    echo "   ✅ Ejecución #$run_number completada"
    echo ""
}

# Ejecutar múltiples veces
for i in {1..3}; do
    run_workflow_and_extract $i
    sleep 2  # Pausa entre ejecuciones
done

echo "📊 Generando análisis de consistencia..."

# Crear script de análisis
cat > "$CONSISTENCY_DIR/analyze_consistency.mjs" << 'EOF'
#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

// Leer resultados de las 3 ejecuciones
const runs = [];
for (let i = 1; i <= 3; i++) {
    try {
        const data = JSON.parse(readFileSync(`run_${i}.json`, 'utf8'));
        runs.push(data);
    } catch (error) {
        console.error(`Error reading run_${i}.json:`, error.message);
    }
}

if (runs.length === 0) {
    console.error('No se pudieron leer los resultados');
    process.exit(1);
}

// Análisis de consistencia
const analysis = {
    timestamp: new Date().toISOString(),
    total_runs: runs.length,
    consistency_analysis: {},
    performance_analysis: {},
    fault_detection_consistency: {}
};

// Análisis de rendimiento
const durations = runs.map(run => {
    const steps = run.steps || [];
    return steps.reduce((total, step) => total + (step.duration_ms || 0), 0);
});

analysis.performance_analysis = {
    durations: durations,
    average_duration: durations.reduce((a, b) => a + b, 0) / durations.length,
    min_duration: Math.min(...durations),
    max_duration: Math.max(...durations),
    variation_percentage: ((Math.max(...durations) - Math.min(...durations)) / Math.min(...durations)) * 100
};

// Análisis de consistencia de fallas
const securityResults = runs.map(run => {
    const securityStep = run.steps?.find(s => s.step_id === 'security_audit');
    return securityStep?.results?.results || {};
});

analysis.fault_detection_consistency = {
    security_vulnerabilities_consistent: securityResults.every(result => 
        result.vulnerability_scan?.vulnerabilities_found === securityResults[0].vulnerability_scan?.vulnerabilities_found
    ),
    metrics_consistent: runs.every(run => {
        const metricsStep = run.steps?.find(s => s.step_id === 'metrics_analysis');
        return metricsStep?.results?.response_time_avg === runs[0].steps?.find(s => s.step_id === 'metrics_analysis')?.results?.response_time_avg;
    })
};

// Generar reporte
const report = {
    summary: {
        total_executions: runs.length,
        all_successful: runs.every(run => run.status === 'completed'),
        average_duration_ms: analysis.performance_analysis.average_duration,
        duration_variation_percent: analysis.performance_analysis.variation_percentage,
        fault_detection_consistent: analysis.fault_detection_consistency.security_vulnerabilities_consistent && analysis.fault_detection_consistency.metrics_consistent
    },
    detailed_analysis: analysis,
    recommendations: []
};

// Agregar recomendaciones
if (analysis.performance_analysis.variation_percentage > 50) {
    report.recommendations.push("ALTA: Investigar variabilidad significativa en tiempos de ejecución");
}

if (!analysis.fault_detection_consistency.security_vulnerabilities_consistent) {
    report.recommendations.push("CRÍTICA: Inconsistencia en detección de vulnerabilidades de seguridad");
}

if (!analysis.fault_detection_consistency.metrics_consistent) {
    report.recommendations.push("ALTA: Inconsistencia en métricas de rendimiento");
}

if (report.recommendations.length === 0) {
    report.recommendations.push("✅ Sistema funcionando de manera consistente");
}

writeFileSync('consistency_report.json', JSON.stringify(report, null, 2));
console.log('✅ Análisis de consistencia completado');
console.log('📊 Reporte generado: consistency_report.json');
EOF

# Ejecutar análisis
cd "$CONSISTENCY_DIR"
node analyze_consistency.mjs

echo ""
echo "🎉 ANÁLISIS DE CONSISTENCIA COMPLETADO"
echo "====================================="
echo ""
echo "📁 Resultados guardados en: $CONSISTENCY_DIR"
echo "📊 Reporte de consistencia: $CONSISTENCY_DIR/consistency_report.json"
echo ""

# Mostrar resumen
if [ -f "$CONSISTENCY_DIR/consistency_report.json" ]; then
    echo "📋 RESUMEN DEL ANÁLISIS:"
    echo "------------------------"
    
    # Extraer información clave del reporte
    TOTAL_EXECUTIONS=$(grep -o '"total_executions": [0-9]*' "$CONSISTENCY_DIR/consistency_report.json" | cut -d' ' -f2)
    ALL_SUCCESSFUL=$(grep -o '"all_successful": [^,]*' "$CONSISTENCY_DIR/consistency_report.json" | cut -d' ' -f2)
    AVG_DURATION=$(grep -o '"average_duration_ms": [0-9.]*' "$CONSISTENCY_DIR/consistency_report.json" | cut -d' ' -f2)
    VARIATION_PERCENT=$(grep -o '"duration_variation_percent": [0-9.]*' "$CONSISTENCY_DIR/consistency_report.json" | cut -d' ' -f2)
    FAULT_CONSISTENT=$(grep -o '"fault_detection_consistent": [^,]*' "$CONSISTENCY_DIR/consistency_report.json" | cut -d' ' -f2)
    
    echo "   Ejecuciones totales: $TOTAL_EXECUTIONS"
    echo "   Todas exitosas: $ALL_SUCCESSFUL"
    echo "   Duración promedio: ${AVG_DURATION}ms"
    echo "   Variación de tiempo: ${VARIATION_PERCENT}%"
    echo "   Detección de fallas consistente: $FAULT_CONSISTENT"
    echo ""
    
    echo "🔗 Comandos útiles:"
    echo "   Ver reporte completo: cat $CONSISTENCY_DIR/consistency_report.json"
    echo "   Ver resultados individuales: ls $CONSISTENCY_DIR/run_*.json"
fi

echo "✅ Análisis de consistencia finalizado"
