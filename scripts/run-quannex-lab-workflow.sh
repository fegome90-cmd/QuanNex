#!/bin/bash

# Script para ejecutar el Workflow QuanNex Lab
# Genera análisis completo de fallas del sistema

set -e

echo "🚀 QUANNEX LAB WORKFLOW - ANÁLISIS DE FALLAS"
echo "============================================="

# Verificar directorio correcto
if [ "$(pwd)" != "/Users/felipe/Developer/startkit-main" ]; then
    echo "❌ ERROR: No estás en el directorio correcto"
    echo "   Actual: $(pwd)"
    echo "   Esperado: /Users/felipe/Developer/startkit-main"
    exit 1
fi
echo "✅ Directorio correcto: $(pwd)"

# Verificar que el orquestador funciona
echo ""
echo "🔍 Verificando orquestador..."
if ! node orchestration/orchestrator.js health > /dev/null 2>&1; then
    echo "❌ ERROR: Orquestador no funciona"
    exit 1
fi
echo "✅ Orquestador funcionando"

# Crear workflow temporal
echo ""
echo "📝 Creando workflow temporal..."
cat > /tmp/quannex-lab-workflow.json << 'EOF'
{
  "name": "workflow-quannex-lab",
  "description": "Workflow completo de análisis QuanNex Lab",
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
echo "✅ Workflow temporal creado"

# Crear workflow
echo ""
echo "🔧 Creando workflow en el orquestador..."
WORKFLOW_OUTPUT=$(node orchestration/orchestrator.js create /tmp/quannex-lab-workflow.json)
WORKFLOW_ID=$(echo "$WORKFLOW_OUTPUT" | grep -o '"workflow_id": "[^"]*"' | cut -d'"' -f4)

if [ -z "$WORKFLOW_ID" ]; then
    echo "❌ ERROR: No se pudo obtener el ID del workflow"
    echo "Output: $WORKFLOW_OUTPUT"
    exit 1
fi

echo "✅ Workflow creado con ID: $WORKFLOW_ID"

# Ejecutar workflow
echo ""
echo "🚀 Ejecutando workflow..."
echo "   ID: $WORKFLOW_ID"
echo "   Iniciando análisis completo..."

EXECUTION_OUTPUT=$(node orchestration/orchestrator.js execute "$WORKFLOW_ID")
echo "$EXECUTION_OUTPUT"

# Verificar si el workflow se completó exitosamente
if echo "$EXECUTION_OUTPUT" | grep -q '"status": "completed"'; then
    echo ""
    echo "🎉 WORKFLOW COMPLETADO EXITOSAMENTE"
    echo "=================================="
    
    # Extraer métricas básicas
    TOTAL_STEPS=$(echo "$EXECUTION_OUTPUT" | grep -o '"step_id"' | wc -l)
    COMPLETED_STEPS=$(echo "$EXECUTION_OUTPUT" | grep -o '"status": "completed"' | wc -l)
    
    echo "📊 Métricas del Workflow:"
    echo "   Pasos totales: $TOTAL_STEPS"
    echo "   Pasos completados: $COMPLETED_STEPS"
    echo "   Tasa de éxito: 100%"
    
    # Verificar vulnerabilidades detectadas
    if echo "$EXECUTION_OUTPUT" | grep -q "vulnerabilities"; then
        VULN_COUNT=$(echo "$EXECUTION_OUTPUT" | grep -o '"vulnerabilities_found": [0-9]*' | cut -d' ' -f2)
        echo "   Vulnerabilidades detectadas: $VULN_COUNT"
    fi
    
    # Verificar métricas de rendimiento
    if echo "$EXECUTION_OUTPUT" | grep -q "health_score"; then
        HEALTH_SCORE=$(echo "$EXECUTION_OUTPUT" | grep -o '"health_score": [0-9]*' | cut -d' ' -f2)
        echo "   Health Score: $HEALTH_SCORE/100"
    fi
    
    echo ""
    echo "📋 Reportes generados en:"
    echo "   .reports/$WORKFLOW_ID/"
    
    # Listar archivos de reporte
    if [ -d ".reports/$WORKFLOW_ID" ]; then
        echo ""
        echo "📁 Archivos de reporte disponibles:"
        ls -la ".reports/$WORKFLOW_ID/" | grep -v "^total"
    fi
    
    echo ""
    echo "✅ Análisis completo de fallas finalizado"
    echo "   Revisar reportes para detalles específicos"
    
else
    echo ""
    echo "❌ WORKFLOW FALLÓ"
    echo "================"
    echo "Revisar logs para detalles del error"
    echo "Workflow ID: $WORKFLOW_ID"
    exit 1
fi

# Limpiar archivo temporal
rm -f /tmp/quannex-lab-workflow.json

echo ""
echo "🔗 Comandos útiles:"
echo "   Ver estado: node orchestration/orchestrator.js status $WORKFLOW_ID"
echo "   Limpiar: node orchestration/orchestrator.js cleanup $WORKFLOW_ID"
echo ""
echo "📚 Documentación: docs/workflow-quannex-lab-results.md"
