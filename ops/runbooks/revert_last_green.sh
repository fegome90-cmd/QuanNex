#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# Revert Last Green - Revertir a última versión estable
# =====================================================

# Configuración
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="logs/revert_last_green_$TIMESTAMP.log"
ARTIFACTS_DIR="artifacts"
GREEN_VERSION_FILE="$ARTIFACTS_DIR/last_green_version.json"

# Colores para output
red() { printf "\e[31m%s\e[0m\n" "$*"; }
green() { printf "\e[32m%s\e[0m\n" "$*"; }
yellow() { printf "\e[33m%s\e[0m\n" "$*"; }

echo "⏪ Reverting to last green version - $TIMESTAMP"
echo "=============================================="

# Crear directorio de logs si no existe
mkdir -p logs

# =====================================================
# 1. Verificar última versión estable
# =====================================================

echo "🔍 Finding last green version..."

if [ -f "$GREEN_VERSION_FILE" ]; then
    LAST_GREEN_VERSION=$(jq -r '.version // empty' "$GREEN_VERSION_FILE")
    LAST_GREEN_COMMIT=$(jq -r '.commit // empty' "$GREEN_VERSION_FILE")
    LAST_GREEN_TIMESTAMP=$(jq -r '.timestamp // empty' "$GREEN_VERSION_FILE")
    
    echo "📋 Last green version: $LAST_GREEN_VERSION"
    echo "📋 Last green commit: $LAST_GREEN_COMMIT"
    echo "📋 Last green timestamp: $LAST_GREEN_TIMESTAMP"
else
    yellow "⚠️  No last green version file found, using current HEAD"
    LAST_GREEN_VERSION="unknown"
    LAST_GREEN_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    LAST_GREEN_TIMESTAMP="unknown"
fi

# =====================================================
# 2. Backup de configuración actual
# =====================================================

echo "💾 Creating backup of current configuration..."

BACKUP_CONFIG_DIR="backups/config_backup_$TIMESTAMP"
mkdir -p "$BACKUP_CONFIG_DIR"

# Backup de archivos de configuración críticos
CONFIG_FILES=(
    "rag/config/retrieval.yaml"
    "rag/config/thresholds.json"
    "prp/PRP.lock.yml"
    ".github/workflows/rag-ci.yml"
    "Makefile.rag"
)

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        cp "$config_file" "$BACKUP_CONFIG_DIR/"
        echo "✅ Backed up: $config_file"
    else
        echo "⚠️  Config file not found: $config_file"
    fi
done

# =====================================================
# 3. Revertir código si es un repositorio Git
# =====================================================

echo "🔄 Reverting code to last green commit..."

if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "📋 Current commit: $CURRENT_COMMIT"
    
    if [ "$LAST_GREEN_COMMIT" != "unknown" ] && [ "$LAST_GREEN_COMMIT" != "$CURRENT_COMMIT" ]; then
        echo "⏪ Reverting to commit: $LAST_GREEN_COMMIT"
        
        # Crear backup del commit actual
        git tag "backup_before_revert_$TIMESTAMP" "$CURRENT_COMMIT"
        
        # Revertir al último commit estable
        if git checkout "$LAST_GREEN_COMMIT" >> "$LOG_FILE" 2>&1; then
            green "✅ Code reverted to last green commit"
        else
            red "❌ Failed to revert code"
            exit 1
        fi
    else
        echo "ℹ️  Already at last green commit or no green version available"
    fi
else
    yellow "⚠️  Not a Git repository or Git not available, skipping code revert"
fi

# =====================================================
# 4. Revertir artefactos de CI/CD
# =====================================================

echo "📦 Reverting CI/CD artifacts..."

# Buscar artefactos de la última versión estable
ARTIFACTS_PATTERN="$ARTIFACTS_DIR/last_green_*"
if ls $ARTIFACTS_PATTERN >/dev/null 2>&1; then
    echo "📋 Found artifacts for last green version"
    
    # Restaurar artefactos si existen
    for artifact in $ARTIFACTS_PATTERN; do
        if [ -f "$artifact" ]; then
            artifact_name=$(basename "$artifact" | sed 's/last_green_//')
            target_path="rag/config/$artifact_name"
            
            if cp "$artifact" "$target_path" 2>/dev/null; then
                echo "✅ Restored artifact: $artifact_name"
            else
                echo "⚠️  Failed to restore artifact: $artifact_name"
            fi
        fi
    done
else
    yellow "⚠️  No artifacts found for last green version"
fi

# =====================================================
# 5. Verificar configuración
# =====================================================

echo "🔍 Verifying configuration..."

# Verificar que los archivos críticos existen
CRITICAL_FILES=(
    "rag/config/retrieval.yaml"
    "rag/config/thresholds.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
        
        # Verificar que es un YAML/JSON válido
        if [[ "$file" == *.yaml ]] || [[ "$file" == *.yml ]]; then
            if command -v yq >/dev/null 2>&1; then
                if yq eval '.' "$file" >/dev/null 2>&1; then
                    echo "✅ $file is valid YAML"
                else
                    yellow "⚠️  $file has invalid YAML syntax"
                fi
            fi
        elif [[ "$file" == *.json ]]; then
            if jq empty "$file" >/dev/null 2>&1; then
                echo "✅ $file is valid JSON"
            else
                yellow "⚠️  $file has invalid JSON syntax"
            fi
        fi
    else
        red "❌ Critical file missing: $file"
        exit 1
    fi
done

# =====================================================
# 6. Logging
# =====================================================

echo "📝 Logging revert event..."

# Crear log del revert
cat > "$LOG_FILE" << EOF
Revert Last Green - $TIMESTAMP
=============================

Last Green Version: $LAST_GREEN_VERSION
Last Green Commit: $LAST_GREEN_COMMIT
Last Green Timestamp: $LAST_GREEN_TIMESTAMP

Current Commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")

Backup Config Dir: $BACKUP_CONFIG_DIR

Reverted Files:
$(ls -la "$BACKUP_CONFIG_DIR" 2>/dev/null || echo "No files backed up")

Status: Completed Successfully
EOF

# Registrar en TaskDB si está disponible
if command -v psql >/dev/null 2>&1; then
    REVERT_EVENT=$(cat << EOF
INSERT INTO task_events (task_id, event_type, metadata, created_at) 
VALUES (
    'revert_last_green_$TIMESTAMP',
    'revert_last_green',
    '{
        "last_green_version": "$LAST_GREEN_VERSION",
        "last_green_commit": "$LAST_GREEN_COMMIT",
        "backup_config_dir": "$BACKUP_CONFIG_DIR",
        "timestamp": "$TIMESTAMP",
        "success": true
    }',
    now()
);
EOF
    )
    
    if echo "$REVERT_EVENT" | psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5433}" -U "${PGUSER:-rag}" -d "${PGDATABASE:-ragdb}" >/dev/null 2>&1; then
        echo "✅ Revert event logged in TaskDB"
    else
        yellow "⚠️  TaskDB logging failed"
    fi
fi

# =====================================================
# 7. Finalización
# =====================================================

echo ""
green "🎉 Revert to last green completed successfully!"
echo "================================================"
echo "📊 Summary:"
echo "  • Last green version: $LAST_GREEN_VERSION"
echo "  • Last green commit: $LAST_GREEN_COMMIT"
echo "  • Backup config dir: $BACKUP_CONFIG_DIR"
echo "  • Log file: $LOG_FILE"
echo ""
echo "📋 Next Steps:"
echo "  1. Verify configuration: make governance.check"
echo "  2. Test functionality: make smoke"
echo "  3. Run evaluation: make eval.quick"
echo "  4. If issues: restore from $BACKUP_CONFIG_DIR"
echo "  5. Plan safe redeployment with fixes"

# Exit code 0 = success
exit 0
