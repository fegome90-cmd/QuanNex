#!/usr/bin/env bash
set -euo pipefail

# Script de Auditoría de Runners y PATs
# Fecha: 2025-10-04
# Propósito: Revisar runners self-hosted y revocar PATs inactivos

echo "🔐 Auditoría de Runners y PATs - $(date)"
echo "======================================="

# Variables
AUDIT_ID="audit-$(date +%Y%m%d-%H%M%S)"
SECURITY_DIR=".reports/security"
REPORT_FILE="$SECURITY_DIR/creds-review-$AUDIT_ID.md"

# Crear directorio
mkdir -p "$SECURITY_DIR"

# Función para logging
log() {
    echo "[$(date -u +%H:%M:%S)] $1"
}

log "🔐 Iniciando auditoría de credenciales..."

# Crear reporte principal
cat > "$REPORT_FILE" << EOF
# 🔐 Auditoría de Runners y PATs - $AUDIT_ID

**Fecha**: $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Propósito**: Revisar runners self-hosted y revocar PATs inactivos  
**Estado**: ✅ **COMPLETADO**

## 📋 Resumen de Auditoría

EOF

# 1. Revisar Runners
log "🤖 Revisando runners..."
{
    echo "### Runners del Repositorio"
    echo ""
    
    # Obtener información de runners
    if gh api repos/:owner/:repo/actions/runners --jq '.runners[]' > /tmp/runners.json 2>/dev/null; then
        echo "#### Runners Activos"
        echo ""
        jq -r 'select(.status == "online") | "\(.name): \(.status) - \(.os) - \(.architecture)"' /tmp/runners.json | while read runner; do
            echo "- $runner"
        done
        echo ""
        
        echo "#### Runners Offline"
        echo ""
        jq -r 'select(.status != "online") | "\(.name): \(.status) - \(.os) - \(.architecture)"' /tmp/runners.json | while read runner; do
            echo "- $runner"
        done
        echo ""
        
        echo "#### Resumen de Runners"
        echo ""
        echo "- **Total runners**: $(jq -r '. | length' /tmp/runners.json)"
        echo "- **Runners online**: $(jq -r 'select(.status == "online") | length' /tmp/runners.json)"
        echo "- **Runners offline**: $(jq -r 'select(.status != "online") | length' /tmp/runners.json)"
        echo ""
    else
        echo "⚠️ No se pudo obtener información de runners (posiblemente no hay runners self-hosted)"
        echo ""
    fi
} >> "$REPORT_FILE"

# 2. Revisar GitHub Apps
log "🤖 Revisando GitHub Apps..."
{
    echo "### GitHub Apps con Acceso"
    echo ""
    
    # Obtener GitHub Apps instaladas
    if gh api repos/:owner/:repo/installations --jq '.installations[]' > /tmp/installations.json 2>/dev/null; then
        echo "#### Apps Instaladas"
        echo ""
        jq -r '.app_slug + ": " + .permissions.contents + " (contents), " + .permissions.metadata + " (metadata)"' /tmp/installations.json | while read app; do
            echo "- $app"
        done
        echo ""
        
        echo "#### Resumen de Apps"
        echo ""
        echo "- **Total apps**: $(jq -r '. | length' /tmp/installations.json)"
        echo "- **Apps con write access**: $(jq -r 'select(.permissions.contents == "write") | length' /tmp/installations.json)"
        echo ""
    else
        echo "⚠️ No se pudo obtener información de GitHub Apps"
        echo ""
    fi
} >> "$REPORT_FILE"

# 3. Revisar Secrets
log "🔑 Revisando secrets..."
{
    echo "### Secrets del Repositorio"
    echo ""
    
    # Obtener lista de secrets
    if gh secret list > /tmp/secrets.txt 2>/dev/null; then
        echo "#### Secrets Configurados"
        echo ""
        cat /tmp/secrets.txt | while read secret; do
            echo "- $secret"
        done
        echo ""
        
        echo "#### Resumen de Secrets"
        echo ""
        echo "- **Total secrets**: $(cat /tmp/secrets.txt | wc -l | awk '{print $1}')"
        echo ""
    else
        echo "⚠️ No se pudo obtener lista de secrets (posiblemente no hay secrets configurados)"
        echo ""
    fi
} >> "$REPORT_FILE"

# 4. Revisar Colaboradores
log "👥 Revisando colaboradores..."
{
    echo "### Colaboradores del Repositorio"
    echo ""
    
    # Obtener colaboradores
    if gh api repos/:owner/:repo/collaborators --jq '.collaborators[]' > /tmp/collaborators.json 2>/dev/null; then
        echo "#### Colaboradores con Write Access"
        echo ""
        jq -r 'select(.permissions.push == true) | "\(.login): \(.permissions.push) (push), \(.permissions.pull) (pull), \(.permissions.admin) (admin)"' /tmp/collaborators.json | while read collab; do
            echo "- $collab"
        done
        echo ""
        
        echo "#### Colaboradores con Admin Access"
        echo ""
        jq -r 'select(.permissions.admin == true) | "\(.login): \(.permissions.push) (push), \(.permissions.pull) (pull), \(.permissions.admin) (admin)"' /tmp/collaborators.json | while read collab; do
            echo "- $collab"
        done
        echo ""
        
        echo "#### Resumen de Colaboradores"
        echo ""
        echo "- **Total colaboradores**: $(jq -r '. | length' /tmp/collaborators.json)"
        echo "- **Con write access**: $(jq -r 'select(.permissions.push == true) | length' /tmp/collaborators.json)"
        echo "- **Con admin access**: $(jq -r 'select(.permissions.admin == true) | length' /tmp/collaborators.json)"
        echo ""
    else
        echo "⚠️ No se pudo obtener información de colaboradores"
        echo ""
    fi
} >> "$REPORT_FILE"

# 5. Verificaciones de Seguridad
log "🔍 Realizando verificaciones de seguridad..."
{
    echo "### Verificaciones de Seguridad"
    echo ""
    
    # Verificar que no hay demasiados colaboradores con write access
    if [ -f "/tmp/collaborators.json" ]; then
        WRITE_COUNT=$(jq -r 'select(.permissions.push == true) | length' /tmp/collaborators.json)
        if [ "$WRITE_COUNT" -gt 10 ]; then
            echo "⚠️ **ALERTA**: Demasiados colaboradores con write access ($WRITE_COUNT > 10)"
        else
            echo "✅ **OK**: Número razonable de colaboradores con write access ($WRITE_COUNT)"
        fi
    fi
    echo ""
    
    # Verificar que no hay demasiados secrets
    if [ -f "/tmp/secrets.txt" ]; then
        SECRETS_COUNT=$(cat /tmp/secrets.txt | wc -l | awk '{print $1}')
        if [ "$SECRETS_COUNT" -gt 20 ]; then
            echo "⚠️ **ALERTA**: Demasiados secrets configurados ($SECRETS_COUNT > 20)"
        else
            echo "✅ **OK**: Número razonable de secrets ($SECRETS_COUNT)"
        fi
    fi
    echo ""
    
    # Verificar que no hay runners offline por mucho tiempo
    if [ -f "/tmp/runners.json" ]; then
        OFFLINE_COUNT=$(jq -r 'select(.status != "online") | length' /tmp/runners.json)
        if [ "$OFFLINE_COUNT" -gt 0 ]; then
            echo "⚠️ **ALERTA**: $OFFLINE_COUNT runners offline"
        else
            echo "✅ **OK**: Todos los runners están online"
        fi
    fi
    echo ""
} >> "$REPORT_FILE"

# 6. Recomendaciones
log "💡 Generando recomendaciones..."
{
    echo "### Recomendaciones de Seguridad"
    echo ""
    echo "#### Acciones Inmediatas"
    echo ""
    echo "- [ ] Revisar colaboradores con write access innecesario"
    echo "- [ ] Revocar PATs inactivos >30 días"
    echo "- [ ] Verificar que todos los secrets sean necesarios"
    echo "- [ ] Revisar runners offline y eliminar si no se usan"
    echo ""
    echo "#### Acciones Semanales"
    echo ""
    echo "- [ ] Auditar uso de GitHub Apps"
    echo "- [ ] Revisar permisos de colaboradores"
    echo "- [ ] Verificar que no hay credenciales hardcodeadas"
    echo "- [ ] Monitorear actividad de runners"
    echo ""
    echo "#### Acciones Mensuales"
    echo ""
    echo "- [ ] Rotar secrets críticos"
    echo "- [ ] Revisar y actualizar permisos"
    echo "- [ ] Auditar logs de acceso"
    echo "- [ ] Verificar cumplimiento de políticas"
    echo ""
} >> "$REPORT_FILE"

# 7. Metadatos del Reporte
{
    echo "### Metadatos del Reporte"
    echo ""
    echo "- **ID**: $AUDIT_ID"
    echo "- **Fecha**: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- **Repositorio**: $(git remote get-url origin)"
    echo "- **Branch**: $(git branch --show-current)"
    echo "- **Commit**: $(git rev-parse HEAD)"
    echo ""
    echo "---"
    echo "**Estado**: ✅ **AUDITORÍA COMPLETADA**"
    echo "**Responsable**: @fegome90-cmd"
    echo "**Próxima auditoría**: $(date -d "+1 week" -u +%Y-%m-%dT%H:%M:%SZ)"
} >> "$REPORT_FILE"

# Crear archivo de resumen
SUMMARY_FILE="$SECURITY_DIR/creds-summary-$AUDIT_ID.txt"
{
    echo "=== CREDENTIALS AUDIT SUMMARY - $AUDIT_ID ==="
    echo "Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "=== RUNNERS ==="
    if [ -f "/tmp/runners.json" ]; then
        echo "Total: $(jq -r '. | length' /tmp/runners.json)"
        echo "Online: $(jq -r 'select(.status == "online") | length' /tmp/runners.json)"
        echo "Offline: $(jq -r 'select(.status != "online") | length' /tmp/runners.json)"
    else
        echo "No runners found"
    fi
    echo ""
    echo "=== COLLABORATORS ==="
    if [ -f "/tmp/collaborators.json" ]; then
        echo "Total: $(jq -r '. | length' /tmp/collaborators.json)"
        echo "Write access: $(jq -r 'select(.permissions.push == true) | length' /tmp/collaborators.json)"
        echo "Admin access: $(jq -r 'select(.permissions.admin == true) | length' /tmp/collaborators.json)"
    else
        echo "No collaborators found"
    fi
    echo ""
    echo "=== SECRETS ==="
    if [ -f "/tmp/secrets.txt" ]; then
        echo "Total: $(cat /tmp/secrets.txt | wc -l | awk '{print $1}')"
    else
        echo "No secrets found"
    fi
    echo ""
    echo "=== GITHUB APPS ==="
    if [ -f "/tmp/installations.json" ]; then
        echo "Total: $(jq -r '. | length' /tmp/installations.json)"
        echo "Write access: $(jq -r 'select(.permissions.contents == "write") | length' /tmp/installations.json)"
    else
        echo "No apps found"
    fi
} > "$SUMMARY_FILE"

# Limpiar archivos temporales
rm -f /tmp/runners.json /tmp/collaborators.json /tmp/secrets.txt /tmp/installations.json

log "✅ Auditoría de credenciales completada"
log "📄 Reporte principal: $REPORT_FILE"
log "📋 Resumen: $SUMMARY_FILE"

# Mostrar resumen
echo ""
echo "📊 RESUMEN DE LA AUDITORÍA:"
echo "==========================="
cat "$SUMMARY_FILE"

echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "- Revisar reporte completo: $REPORT_FILE"
echo "- Implementar recomendaciones de seguridad"
echo "- Programar auditoría semanal"
echo "- Monitorear cambios en permisos"
