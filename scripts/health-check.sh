#!/usr/bin/env bash
set -euo pipefail

# Script de Health Check Express
# Fecha: 2025-10-04
# Propósito: Verificación rápida del estado del sistema inmune

echo "🏥 Health Check Express - $(date)"
echo "================================"

# Variables
HEALTH_STATUS="HEALTHY"
ISSUES=()

# Función para logging
log() {
    echo "[$(date -u +%H:%M:%S)] $1"
}

# Función para agregar issue
add_issue() {
    ISSUES+=("$1")
    HEALTH_STATUS="UNHEALTHY"
}

log "🏥 Iniciando health check express..."

# 1. Verificar kill-switch
log "🔍 Verificando kill-switch..."
if [ -f "ops/flags/AUTOFIX_ENABLED" ]; then
    AUTOFIX_STATUS=$(cat ops/flags/AUTOFIX_ENABLED)
    if [ "$AUTOFIX_STATUS" = "false" ]; then
        echo "✅ Kill-switch: ACTIVO"
    else
        echo "❌ Kill-switch: INACTIVO"
        add_issue "Kill-switch inactivo (AUTOFIX_ENABLED=$AUTOFIX_STATUS)"
    fi
else
    echo "❌ Kill-switch: NO ENCONTRADO"
    add_issue "Archivo kill-switch no encontrado"
fi

# 2. Verificar workflows críticos
log "🔍 Verificando workflows críticos..."
CRITICAL_WORKFLOWS=("manual-rollback-guard.yml" "policy-scan.yml" "checks-all-green.yml")
for workflow in "${CRITICAL_WORKFLOWS[@]}"; do
    if [ -f ".github/workflows/$workflow" ]; then
        echo "✅ $workflow: PRESENTE"
    else
        echo "❌ $workflow: FALTANTE"
        add_issue "Workflow crítico faltante: $workflow"
    fi
done

# 3. Verificar configuración
log "🔍 Verificando configuración..."
if [ -f "config/sensitive-paths.yaml" ]; then
    echo "✅ sensitive-paths.yaml: PRESENTE"
    
    # Verificar umbrales
    MAX_FILES=$(grep "max_files_deleted" config/sensitive-paths.yaml | awk '{print $2}' || echo "25")
    MAX_LINES=$(grep "max_lines_deleted" config/sensitive-paths.yaml | awk '{print $2}' || echo "5000")
    echo "   - Umbrales: $MAX_FILES archivos, $MAX_LINES líneas"
else
    echo "❌ sensitive-paths.yaml: FALTANTE"
    add_issue "Configuración de paths sensibles faltante"
fi

# 4. Verificar CODEOWNERS
log "🔍 Verificando CODEOWNERS..."
if [ -f ".github/CODEOWNERS" ]; then
    echo "✅ CODEOWNERS: PRESENTE"
    PATHS_COUNT=$(grep -c "^/" .github/CODEOWNERS || echo "0")
    echo "   - Paths protegidos: $PATHS_COUNT"
else
    echo "❌ CODEOWNERS: FALTANTE"
    add_issue "CODEOWNERS faltante"
fi

# 5. Verificar Husky
log "🔍 Verificando Husky..."
if [ -f ".husky/commit-msg" ]; then
    echo "✅ Husky commit-msg: PRESENTE"
else
    echo "❌ Husky commit-msg: FALTANTE"
    add_issue "Husky commit-msg hook faltante"
fi

# 6. Verificar scripts de monitoreo
log "🔍 Verificando scripts de monitoreo..."
MONITORING_SCRIPTS=("canarios.sh" "policy-snapshot.sh" "monitor-labels.sh" "audit-runners-pats.sh")
for script in "${MONITORING_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ] && [ -x "scripts/$script" ]; then
        echo "✅ $script: PRESENTE y EJECUTABLE"
    else
        echo "❌ $script: FALTANTE o NO EJECUTABLE"
        add_issue "Script de monitoreo faltante o no ejecutable: $script"
    fi
done

# 7. Verificar directorios de reportes
log "🔍 Verificando directorios de reportes..."
REPORT_DIRS=(".reports/ci" ".reports/security" ".reports/policy-snapshots" ".reports/forensics")
for dir in "${REPORT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir: PRESENTE"
    else
        echo "❌ $dir: FALTANTE"
        add_issue "Directorio de reportes faltante: $dir"
    fi
done

# 8. Verificar documentación crítica
log "🔍 Verificando documentación crítica..."
CRITICAL_DOCS=("docs/BAU-RUNBOOK.md" "docs/CHECKLIST-SALIDA-BAU.md" "docs/EXCEPTIONS-LOG.md" "docs/PLAYBOOK-ROLLBACK.md")
for doc in "${CRITICAL_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "✅ $doc: PRESENTE"
    else
        echo "❌ $doc: FALTANTE"
        add_issue "Documentación crítica faltante: $doc"
    fi
done

# 9. Verificar tags de protección
log "🔍 Verificando tags de protección..."
INCIDENT_TAGS=$(git tag --sort=-creatordate | grep -E "^(incident/|backup/)" | head -5)
if [ -n "$INCIDENT_TAGS" ]; then
    echo "✅ Tags de protección: PRESENTES"
    echo "$INCIDENT_TAGS" | while read tag; do
        echo "   - $tag: $(git log -1 --format='%ci' "$tag")"
    done
else
    echo "⚠️  Tags de protección: NO ENCONTRADOS"
    add_issue "No se encontraron tags de protección"
fi

# 10. Verificar estado del repositorio
log "🔍 Verificando estado del repositorio..."
if git diff-index --quiet HEAD --; then
    echo "✅ Working tree: LIMPIO"
else
    echo "⚠️  Working tree: NO LIMPIO"
    echo "   - Archivos modificados:"
    git status --porcelain | head -5
fi

# 11. Verificar commits recientes
log "🔍 Verificando commits recientes..."
RECENT_COMMITS=$(git log --since="1 week ago" --oneline | wc -l | awk '{print $1}')
echo "✅ Commits recientes (1 semana): $RECENT_COMMITS"

# 12. Verificar branches
log "🔍 Verificando branches..."
BRANCH_COUNT=$(git branch -r | wc -l | awk '{print $1}')
echo "✅ Branches remotos: $BRANCH_COUNT"

# Resumen del health check
echo ""
echo "🏥 RESUMEN DEL HEALTH CHECK"
echo "=========================="

if [ "$HEALTH_STATUS" = "HEALTHY" ]; then
    echo "🟢 ESTADO: SALUDABLE"
    echo "✅ Todos los componentes críticos están operativos"
else
    echo "🔴 ESTADO: NO SALUDABLE"
    echo "❌ Issues encontrados:"
    for issue in "${ISSUES[@]}"; do
        echo "   - $issue"
    done
fi

echo ""
echo "📊 MÉTRICAS RÁPIDAS:"
echo "- Workflows críticos: $(ls .github/workflows/*.yml 2>/dev/null | wc -l | awk '{print $1}')"
echo "- Scripts de monitoreo: $(ls scripts/*.sh 2>/dev/null | wc -l | awk '{print $1}')"
echo "- Documentos críticos: $(ls docs/*.md 2>/dev/null | wc -l | awk '{print $1}')"
echo "- Tags de protección: $(git tag | grep -E "^(incident/|backup/)" | wc -l | awk '{print $1}')"

echo ""
echo "🎯 PRÓXIMOS PASOS:"
if [ "$HEALTH_STATUS" = "HEALTHY" ]; then
    echo "- ✅ Sistema inmune operativo"
    echo "- 📅 Ejecutar runbook semanal"
    echo "- 🧪 Ejecutar canarios si es lunes"
else
    echo "- 🔧 Corregir issues encontrados"
    echo "- 🔄 Re-ejecutar health check"
    echo "- 📞 Escalar si es necesario"
fi

echo ""
echo "🏥 Health check completado - $(date)"
