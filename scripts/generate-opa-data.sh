#!/usr/bin/env bash
set -euo pipefail

# Script para generar data.yaml para OPA desde config/sensitive-paths.yaml
# Fecha: 2025-10-04
# Propósito: Sincronizar configuración YAML con políticas OPA

echo "🔄 Generando data.yaml para OPA..."

# Variables
CONFIG_FILE="config/sensitive-paths.yaml"
DATA_FILE="policies/data.yaml"

# Verificar que el archivo de configuración existe
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Archivo de configuración no encontrado: $CONFIG_FILE"
    exit 1
fi

# Crear directorio policies si no existe
mkdir -p policies

# Extraer valores del YAML
MAX_FILES=$(grep "max_files_deleted:" "$CONFIG_FILE" | awk '{print $2}' || echo "25")
MAX_LINES=$(grep "max_lines_deleted:" "$CONFIG_FILE" | awk '{print $2}' || echo "5000")
SYNC_WITH_OPA=$(grep "sync_with_opa:" "$CONFIG_FILE" | awk '{print $2}' || echo "true")

# Extraer sensitive_globs
SENSITIVE_GLOBS=$(awk '/sensitive_globs:/{f=1;next} f&&/^-/{g=$0; sub(/^- *"/,"",g); sub(/" *$/,"",g); print g} f&&$0!~"^-"{if(f)exit}' "$CONFIG_FILE" | jq -R -s -c 'split("\n")[:-1]' || echo '["rag/**", ".github/workflows/**", "ops/**", "core/**"]')

# Generar data.yaml
cat > "$DATA_FILE" << EOF
# Data YAML para OPA - Generado automáticamente
# Fecha: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Fuente: $CONFIG_FILE

max_files_deleted: $MAX_FILES
max_lines_deleted: $MAX_LINES
sync_with_opa: $SYNC_WITH_OPA

sensitive_globs: $SENSITIVE_GLOBS

# Configuración de emergencia
emergency:
  enabled: $(grep "enabled:" "$CONFIG_FILE" | grep -A 10 "emergency:" | head -1 | awk '{print $2}' || echo "false")
  expiration: "$(grep "expiration:" "$CONFIG_FILE" | grep -A 10 "emergency:" | head -2 | tail -1 | awk '{print $2}' || echo "2025-10-11T00:00:00Z")"
  reason: "$(grep "reason:" "$CONFIG_FILE" | grep -A 10 "emergency:" | head -3 | tail -1 | awk '{print $2}' || echo "Modo emergencia")"
  approved_by: "$(grep "approved_by:" "$CONFIG_FILE" | grep -A 10 "emergency:" | head -4 | tail -1 | awk '{print $2}' || echo "@fegome90-cmd")"
EOF

echo "✅ Data YAML generado: $DATA_FILE"
echo "📊 Configuración extraída:"
echo "  - max_files_deleted: $MAX_FILES"
echo "  - max_lines_deleted: $MAX_LINES"
echo "  - sync_with_opa: $SYNC_WITH_OPA"
echo "  - sensitive_globs: $SENSITIVE_GLOBS"

# Verificar que el archivo se generó correctamente
if [ -f "$DATA_FILE" ]; then
    echo "✅ Archivo generado exitosamente"
    echo "📄 Contenido:"
    cat "$DATA_FILE"
else
    echo "❌ Error al generar el archivo"
    exit 1
fi
