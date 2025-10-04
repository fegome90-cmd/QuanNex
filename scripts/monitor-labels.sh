#!/usr/bin/env bash
set -euo pipefail

# Script de monitoreo de etiquetas protegidas
# Fecha: 2025-10-04
# Propósito: Auditar uso de etiquetas críticas

echo "🏷️  Monitoreo de Etiquetas Protegidas - $(date)"

# Crear directorio de reportes
mkdir -p .reports/ci

# Etiquetas protegidas
PROTECTED_LABELS=("rollback" "critical" "security-hotfix")

# Archivo de reporte
REPORT_FILE=".reports/ci/labels-usage.md"

# Inicializar reporte
cat > "$REPORT_FILE" << 'EOF'
# 🏷️ Uso de Etiquetas Protegidas

**Fecha**: $(date)  
**Propósito**: Auditoría de uso de etiquetas críticas  
**Estado**: ✅ **ACTIVO**

## 📊 Resumen de Uso (Últimos 30 días)

EOF

echo "📊 Analizando uso de etiquetas en últimos 30 días..."

# Analizar cada etiqueta protegida
for label in "${PROTECTED_LABELS[@]}"; do
    echo "🔍 Analizando etiqueta: $label"
    
    # Obtener PRs con esta etiqueta
    PRS=$(gh pr list --state=all --limit=100 --json number,title,author,createdAt,labels | \
          jq -r ".[] | select(.labels[].name == \"$label\") | \"\(.number): \(.title) - \(.author.login) - \(.createdAt)\"")
    
    if [ -n "$PRS" ]; then
        echo "### Etiqueta: \`$label\`" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "$PRS" | while read -r line; do
            echo "- $line" >> "$REPORT_FILE"
        done
        echo "" >> "$REPORT_FILE"
        
        COUNT=$(echo "$PRS" | wc -l)
        echo "✅ $label: $COUNT PRs encontrados"
    else
        echo "⚠️  $label: 0 PRs encontrados"
        echo "### Etiqueta: \`$label\`" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "- No se encontraron PRs con esta etiqueta" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
done

# Análisis de tendencias
echo "" >> "$REPORT_FILE"
echo "## 📈 Análisis de Tendencias" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Contar PRs por semana
echo "📈 Analizando tendencias semanales..."

for label in "${PROTECTED_LABELS[@]}"; do
    echo "### $label - Últimas 4 semanas" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    for week in {0..3}; do
        WEEK_START=$(date -d "$(date -d "$week weeks ago")" +%Y-%m-%d)
        WEEK_END=$(date -d "$(date -d "$((week-1)) weeks ago")" +%Y-%m-%d)
        
        COUNT=$(gh pr list --state=all --limit=100 --json labels,createdAt | \
                jq -r ".[] | select(.labels[].name == \"$label\" and .createdAt >= \"$WEEK_START\" and .createdAt < \"$WEEK_END\") | .number" | wc -l)
        
        echo "- Semana $((week+1)) ($WEEK_START a $WEEK_END): $COUNT PRs" >> "$REPORT_FILE"
    done
    echo "" >> "$REPORT_FILE"
done

# Verificar permisos de etiquetas
echo "" >> "$REPORT_FILE"
echo "## 🔒 Verificación de Permisos" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "🔒 Verificando permisos de etiquetas..."

for label in "${PROTECTED_LABELS[@]}"; do
    # Verificar si la etiqueta existe
    if gh label list | grep -q "$label"; then
        echo "✅ $label: Existe" >> "$REPORT_FILE"
        
        # Verificar si está protegida (esto requiere GitHub Pro)
        echo "⚠️  $label: Verificar protección manualmente (requiere GitHub Pro)" >> "$REPORT_FILE"
    else
        echo "❌ $label: No existe" >> "$REPORT_FILE"
    fi
done

# Recomendaciones
echo "" >> "$REPORT_FILE"
echo "## 💡 Recomendaciones" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Basado en el análisis:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Contar total de PRs con etiquetas protegidas
TOTAL_PROTECTED=$(gh pr list --state=all --limit=100 --json labels | \
                  jq -r ".[] | select(.labels[].name as \$l | \$l == \"rollback\" or \$l == \"critical\" or \$l == \"security-hotfix\") | .number" | wc -l)

if [ "$TOTAL_PROTECTED" -gt 10 ]; then
    echo "- ⚠️  **Alto uso de etiquetas protegidas** ($TOTAL_PROTECTED PRs): Revisar si se están usando apropiadamente" >> "$REPORT_FILE"
elif [ "$TOTAL_PROTECTED" -gt 5 ]; then
    echo "- ✅ **Uso moderado de etiquetas protegidas** ($TOTAL_PROTECTED PRs): Nivel aceptable" >> "$REPORT_FILE"
else
    echo "- ✅ **Bajo uso de etiquetas protegidas** ($TOTAL_PROTECTED PRs): Buen control" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "### Acciones recomendadas:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- [ ] Revisar PRs con etiquetas protegidas para asegurar uso apropiado" >> "$REPORT_FILE"
echo "- [ ] Verificar que solo mantenedores pueden aplicar etiquetas críticas" >> "$REPORT_FILE"
echo "- [ ] Documentar criterios para uso de cada etiqueta" >> "$REPORT_FILE"
echo "- [ ] Entrenar al equipo en uso apropiado de etiquetas" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "**Estado**: ✅ **MONITOREO ACTIVO**" >> "$REPORT_FILE"
echo "**Responsable**: @fegome90-cmd" >> "$REPORT_FILE"
echo "**Próxima revisión**: $(date -d "+1 week" +%Y-%m-%d)" >> "$REPORT_FILE"

echo "✅ Reporte generado: $REPORT_FILE"
echo "📊 Total PRs con etiquetas protegidas: $TOTAL_PROTECTED"
echo "🎯 Próxima revisión: $(date -d "+1 week" +%Y-%m-%d)"
