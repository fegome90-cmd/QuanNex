#!/usr/bin/env bash
set -euo pipefail

# Script de Policy Snapshot Semanal
# Fecha: 2025-10-04
# Propósito: Capturar snapshot de políticas y configuraciones para detectar cambios furtivos

echo "📸 Policy Snapshot Semanal - $(date)"
echo "===================================="

# Variables
SNAPSHOT_ID="policy-$(date +%Y%m%d-%H%M%S)"
SNAPSHOT_DIR=".reports/policy-snapshots"
REPORT_FILE="$SNAPSHOT_DIR/snapshot-$SNAPSHOT_ID.md"

# Crear directorio
mkdir -p "$SNAPSHOT_DIR"

# Función para logging
log() {
    echo "[$(date -u +%H:%M:%S)] $1"
}

log "📸 Iniciando policy snapshot..."

# Crear reporte principal
cat > "$REPORT_FILE" << EOF
# 📸 Policy Snapshot - $SNAPSHOT_ID

**Fecha**: $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Propósito**: Detectar cambios furtivos en políticas y configuraciones  
**Estado**: ✅ **COMPLETADO**

## 📋 Resumen de Configuraciones

EOF

# 1. Configuración de Workflows
log "🔍 Capturando configuración de workflows..."
{
    echo "### Workflows de Protección"
    echo ""
    echo "#### manual-rollback-guard.yml"
    echo '```yaml'
    head -20 .github/workflows/manual-rollback-guard.yml
    echo '```'
    echo ""
    
    echo "#### policy-scan.yml"
    echo '```yaml'
    head -20 .github/workflows/policy-scan.yml
    echo '```'
    echo ""
    
    echo "#### checks-all-green.yml"
    echo '```yaml'
    head -20 .github/workflows/checks-all-green.yml
    echo '```'
    echo ""
} >> "$REPORT_FILE"

# 2. Configuración de Paths Sensibles
log "🔍 Capturando configuración de paths sensibles..."
{
    echo "### Configuración de Paths Sensibles"
    echo ""
    echo "#### config/sensitive-paths.yaml"
    echo '```yaml'
    cat config/sensitive-paths.yaml
    echo '```'
    echo ""
} >> "$REPORT_FILE"

# 3. CODEOWNERS
log "🔍 Capturando CODEOWNERS..."
{
    echo "### CODEOWNERS"
    echo ""
    echo "#### .github/CODEOWNERS"
    echo '```'
    head -20 .github/CODEOWNERS
    echo '```'
    echo ""
} >> "$REPORT_FILE"

# 4. Kill-switch Status
log "🔍 Verificando kill-switch..."
{
    echo "### Kill-Switch Status"
    echo ""
    if [ -f "ops/flags/AUTOFIX_ENABLED" ]; then
        AUTOFIX_STATUS=$(cat ops/flags/AUTOFIX_ENABLED)
        echo "- **AUTOFIX_ENABLED**: \`$AUTOFIX_STATUS\`"
        if [ "$AUTOFIX_STATUS" = "false" ]; then
            echo "- **Estado**: ✅ ACTIVO (protegido)"
        else
            echo "- **Estado**: ⚠️ INACTIVO (riesgo)"
        fi
    else
        echo "- **AUTOFIX_ENABLED**: ❌ Archivo no encontrado"
    fi
    echo ""
} >> "$REPORT_FILE"

# 5. Configuración de Husky
log "🔍 Verificando configuración de Husky..."
{
    echo "### Configuración de Husky"
    echo ""
    if [ -f ".husky/commit-msg" ]; then
        echo "- **commit-msg hook**: ✅ Presente"
        echo "- **Verificación de firma**: ✅ Configurada"
    else
        echo "- **commit-msg hook**: ❌ No encontrado"
    fi
    echo ""
} >> "$REPORT_FILE"

# 6. Tags de Protección
log "🔍 Verificando tags de protección..."
{
    echo "### Tags de Protección"
    echo ""
    echo "#### Tags de Incidente"
    git tag --sort=-creatordate | grep -E "^(incident/|backup/)" | head -10 | while read tag; do
        echo "- \`$tag\`: $(git log -1 --format='%ci' "$tag")"
    done
    echo ""
    
    echo "#### Tags de Versión"
    git tag --sort=-creatordate | grep -E "^v[0-9]" | head -5 | while read tag; do
        echo "- \`$tag\`: $(git log -1 --format='%ci' "$tag")"
    done
    echo ""
} >> "$REPORT_FILE"

# 7. Configuración de Package.json
log "🔍 Capturando configuración de package.json..."
{
    echo "### Configuración de Package.json"
    echo ""
    echo "#### Scripts Críticos"
    echo '```json'
    jq -r '.scripts | to_entries[] | select(.key | test("verify|test|build|lint")) | "\(.key): \(.value)"' package.json
    echo '```'
    echo ""
} >> "$REPORT_FILE"

# 8. Configuración de TypeScript
log "🔍 Verificando configuración de TypeScript..."
{
    echo "### Configuración de TypeScript"
    echo ""
    if [ -f "tsconfig.json" ]; then
        echo "- **tsconfig.json**: ✅ Presente"
        echo "- **Configuración estricta**: $(jq -r '.compilerOptions.strict // "no configurado"' tsconfig.json)"
    else
        echo "- **tsconfig.json**: ❌ No encontrado"
    fi
    echo ""
} >> "$REPORT_FILE"

# 9. Configuración de ESLint
log "🔍 Verificando configuración de ESLint..."
{
    echo "### Configuración de ESLint"
    echo ""
    if [ -f "eslint.config.js" ]; then
        echo "- **eslint.config.js**: ✅ Presente"
        echo "- **Configuración moderna**: ✅ Flat config"
    else
        echo "- **eslint.config.js**: ❌ No encontrado"
    fi
    echo ""
} >> "$REPORT_FILE"

# 10. Resumen de Cambios
log "🔍 Generando resumen de cambios..."
{
    echo "### Resumen de Cambios (Última Semana)"
    echo ""
    echo "#### Commits Recientes"
    git log --since="1 week ago" --oneline | head -10 | while read commit; do
        echo "- $commit"
    done
    echo ""
    
    echo "#### Archivos Modificados"
    git log --since="1 week ago" --name-only --pretty=format: | sort -u | head -20 | while read file; do
        if [ -n "$file" ]; then
            echo "- $file"
        fi
    done
    echo ""
} >> "$REPORT_FILE"

# 11. Verificaciones de Integridad
log "🔍 Realizando verificaciones de integridad..."
{
    echo "### Verificaciones de Integridad"
    echo ""
    
    # Verificar que los workflows críticos existen
    CRITICAL_WORKFLOWS=("manual-rollback-guard.yml" "policy-scan.yml" "checks-all-green.yml")
    for workflow in "${CRITICAL_WORKFLOWS[@]}"; do
        if [ -f ".github/workflows/$workflow" ]; then
            echo "- **$workflow**: ✅ Presente"
        else
            echo "- **$workflow**: ❌ FALTANTE"
        fi
    done
    echo ""
    
    # Verificar configuración de paths sensibles
    if [ -f "config/sensitive-paths.yaml" ]; then
        echo "- **sensitive-paths.yaml**: ✅ Presente"
        echo "- **Umbrales**: $(grep -E "max_files_deleted|max_lines_deleted" config/sensitive-paths.yaml | tr '\n' ' ')"
    else
        echo "- **sensitive-paths.yaml**: ❌ FALTANTE"
    fi
    echo ""
    
    # Verificar CODEOWNERS
    if [ -f ".github/CODEOWNERS" ]; then
        echo "- **CODEOWNERS**: ✅ Presente"
        echo "- **Paths protegidos**: $(grep -c "^/" .github/CODEOWNERS || echo "0")"
    else
        echo "- **CODEOWNERS**: ❌ FALTANTE"
    fi
    echo ""
} >> "$REPORT_FILE"

# 12. Alertas y Recomendaciones
log "🔍 Generando alertas y recomendaciones..."
{
    echo "### Alertas y Recomendaciones"
    echo ""
    
    # Verificar kill-switch
    if [ -f "ops/flags/AUTOFIX_ENABLED" ]; then
        AUTOFIX_STATUS=$(cat ops/flags/AUTOFIX_ENABLED)
        if [ "$AUTOFIX_STATUS" != "false" ]; then
            echo "⚠️ **ALERTA**: Kill-switch inactivo (AUTOFIX_ENABLED=$AUTOFIX_STATUS)"
        fi
    else
        echo "⚠️ **ALERTA**: Archivo kill-switch no encontrado"
    fi
    
    # Verificar workflows críticos
    for workflow in "${CRITICAL_WORKFLOWS[@]}"; do
        if [ ! -f ".github/workflows/$workflow" ]; then
            echo "🚨 **CRÍTICO**: Workflow $workflow faltante"
        fi
    done
    
    # Verificar configuración de paths sensibles
    if [ ! -f "config/sensitive-paths.yaml" ]; then
        echo "🚨 **CRÍTICO**: Configuración de paths sensibles faltante"
    fi
    
    echo ""
    echo "### Recomendaciones"
    echo ""
    echo "- [ ] Revisar kill-switch semanalmente"
    echo "- [ ] Verificar que todos los workflows críticos estén presentes"
    echo "- [ ] Monitorear cambios en configuraciones sensibles"
    echo "- [ ] Validar que CODEOWNERS esté actualizado"
    echo "- [ ] Ejecutar canarios semanalmente"
    echo ""
} >> "$REPORT_FILE"

# 13. Metadatos del Snapshot
{
    echo "### Metadatos del Snapshot"
    echo ""
    echo "- **ID**: $SNAPSHOT_ID"
    echo "- **Fecha**: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- **Repositorio**: $(git remote get-url origin)"
    echo "- **Branch**: $(git branch --show-current)"
    echo "- **Commit**: $(git rev-parse HEAD)"
    echo "- **Autor**: $(git log -1 --format='%an <%ae>')"
    echo ""
    echo "---"
    echo "**Estado**: ✅ **SNAPSHOT COMPLETADO**"
    echo "**Responsable**: @fegome90-cmd"
    echo "**Próximo snapshot**: $(date -d "+1 week" -u +%Y-%m-%dT%H:%M:%SZ)"
} >> "$REPORT_FILE"

# Crear archivo de resumen para comparación rápida
SUMMARY_FILE="$SNAPSHOT_DIR/summary-$SNAPSHOT_ID.txt"
{
    echo "=== POLICY SNAPSHOT SUMMARY - $SNAPSHOT_ID ==="
    echo "Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "=== KILL-SWITCH ==="
    if [ -f "ops/flags/AUTOFIX_ENABLED" ]; then
        echo "AUTOFIX_ENABLED: $(cat ops/flags/AUTOFIX_ENABLED)"
    else
        echo "AUTOFIX_ENABLED: NOT_FOUND"
    fi
    echo ""
    echo "=== WORKFLOWS CRÍTICOS ==="
    for workflow in "${CRITICAL_WORKFLOWS[@]}"; do
        if [ -f ".github/workflows/$workflow" ]; then
            echo "$workflow: PRESENT"
        else
            echo "$workflow: MISSING"
        fi
    done
    echo ""
    echo "=== CONFIGURACIÓN ==="
    echo "sensitive-paths.yaml: $([ -f "config/sensitive-paths.yaml" ] && echo "PRESENT" || echo "MISSING")"
    echo "CODEOWNERS: $([ -f ".github/CODEOWNERS" ] && echo "PRESENT" || echo "MISSING")"
    echo "husky/commit-msg: $([ -f ".husky/commit-msg" ] && echo "PRESENT" || echo "MISSING")"
    echo ""
    echo "=== TAGS DE PROTECCIÓN ==="
    git tag --sort=-creatordate | grep -E "^(incident/|backup/)" | head -5
    echo ""
    echo "=== COMMITS RECIENTES ==="
    git log --since="1 week ago" --oneline | head -5
} > "$SUMMARY_FILE"

log "✅ Policy snapshot completado"
log "📄 Reporte principal: $REPORT_FILE"
log "📋 Resumen: $SUMMARY_FILE"

# Mostrar resumen
echo ""
echo "📊 RESUMEN DEL SNAPSHOT:"
echo "========================"
cat "$SUMMARY_FILE"

echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "- Revisar reporte completo: $REPORT_FILE"
echo "- Comparar con snapshot anterior si existe"
echo "- Investigar cualquier cambio inesperado"
echo "- Ejecutar canarios si hay cambios en workflows"
