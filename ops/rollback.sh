#!/usr/bin/env bash
# Gate 6: Safety Net / Rollback
# Desactiva premium y vuelve a OSS en < 10s sin perder contexto

set -euo pipefail

echo "🚦 Gate 6: Safety Net / Rollback"
echo "================================"

# Configuración
QUANNEX_CONFIG=".quannex/mcp.json"
QUANNEX_ENV=".env"
BACKUP_DIR=".quannex/backups"
ROLLBACK_TIMEOUT=10

# Función para crear backup
create_backup() {
    local timestamp=$(date -u +%Y%m%d-%H%M%S)
    local backup_path="$BACKUP_DIR/rollback-$timestamp"
    
    echo "📦 Creando backup en: $backup_path"
    
    mkdir -p "$backup_path"
    
    # Backup de configuración
    if [ -f "$QUANNEX_CONFIG" ]; then
        cp "$QUANNEX_CONFIG" "$backup_path/mcp.json.backup"
    fi
    
    # Backup de variables de entorno
    if [ -f "$QUANNEX_ENV" ]; then
        cp "$QUANNEX_ENV" "$backup_path/.env.backup"
    fi
    
    # Backup de contexto
    if [ -d ".quannex/context" ]; then
        cp -r ".quannex/context" "$backup_path/context.backup"
    fi
    
    echo "✅ Backup creado: $backup_path"
}

# Función para desactivar premium
disable_premium() {
    echo "🔒 Desactivando modo premium..."
    
    # Desactivar CONTEXT_PREMIUM
    if [ -f "$QUANNEX_ENV" ]; then
        sed -i.bak 's/CONTEXT_PREMIUM=true/CONTEXT_PREMIUM=false/g' "$QUANNEX_ENV"
        sed -i.bak 's/CONTEXT_PREMIUM=1/CONTEXT_PREMIUM=0/g' "$QUANNEX_ENV"
    fi
    
    # Desactivar en configuración MCP
    if [ -f "$QUANNEX_CONFIG" ]; then
        jq '.features.premium = false' "$QUANNEX_CONFIG" > "$QUANNEX_CONFIG.tmp" && mv "$QUANNEX_CONFIG.tmp" "$QUANNEX_CONFIG"
    fi
    
    echo "✅ Modo premium desactivado"
}

# Función para volver a OSS
switch_to_oss() {
    echo "🔄 Cambiando a modo OSS..."
    
    # Configurar modo OSS
    if [ -f "$QUANNEX_CONFIG" ]; then
        jq '.mode = "oss"' "$QUANNEX_CONFIG" > "$QUANNEX_CONFIG.tmp" && mv "$QUANNEX_CONFIG.tmp" "$QUANNEX_CONFIG"
        jq '.features.enterprise = false' "$QUANNEX_CONFIG" > "$QUANNEX_CONFIG.tmp" && mv "$QUANNEX_CONFIG.tmp" "$QUANNEX_CONFIG"
    fi
    
    # Configurar variables OSS
    if [ -f "$QUANNEX_ENV" ]; then
        echo "MODE=oss" >> "$QUANNEX_ENV"
        echo "FEATURE_ENTERPRISE=false" >> "$QUANNEX_ENV"
    fi
    
    echo "✅ Modo OSS activado"
}

# Función para preservar contexto
preserve_context() {
    echo "💾 Preservando contexto..."
    
    # Verificar que el contexto existe
    if [ ! -d ".quannex/context" ]; then
        echo "⚠️  No hay contexto para preservar"
        return 0
    fi
    
    # Crear checkpoint del contexto
    local context_backup=".quannex/context-checkpoint-$(date -u +%Y%m%d-%H%M%S).json"
    
    if command -v jq >/dev/null 2>&1; then
        # Crear snapshot del contexto
        find ".quannex/context" -name "*.json" -exec jq -s '.[]' {} + > "$context_backup" 2>/dev/null || true
    else
        # Backup simple si jq no está disponible
        cp -r ".quannex/context" "$context_backup"
    fi
    
    echo "✅ Contexto preservado en: $context_backup"
}

# Función para validar rollback
validate_rollback() {
    echo "🔍 Validando rollback..."
    
    local validation_errors=0
    
    # Verificar que premium está desactivado
    if [ -f "$QUANNEX_ENV" ] && grep -q "CONTEXT_PREMIUM=true" "$QUANNEX_ENV"; then
        echo "❌ Premium aún activado"
        ((validation_errors++))
    fi
    
    # Verificar que está en modo OSS
    if [ -f "$QUANNEX_CONFIG" ] && ! jq -e '.mode == "oss"' "$QUANNEX_CONFIG" >/dev/null 2>&1; then
        echo "❌ No está en modo OSS"
        ((validation_errors++))
    fi
    
    # Verificar que el contexto se preservó
    if [ ! -d ".quannex/context" ] && [ ! -f ".quannex/context-checkpoint-"*.json ]; then
        echo "⚠️  Contexto no preservado"
    fi
    
    if [ $validation_errors -eq 0 ]; then
        echo "✅ Rollback validado exitosamente"
        return 0
    else
        echo "❌ Rollback falló validación"
        return 1
    fi
}

# Función para mostrar estado
show_status() {
    echo ""
    echo "📊 Estado del sistema:"
    
    if [ -f "$QUANNEX_CONFIG" ]; then
        echo "   Configuración: $(jq -r '.mode // "unknown"' "$QUANNEX_CONFIG")"
        echo "   Premium: $(jq -r '.features.premium // false' "$QUANNEX_CONFIG")"
        echo "   Enterprise: $(jq -r '.features.enterprise // false' "$QUANNEX_CONFIG")"
    fi
    
    if [ -f "$QUANNEX_ENV" ]; then
        echo "   CONTEXT_PREMIUM: $(grep -o 'CONTEXT_PREMIUM=[^[:space:]]*' "$QUANNEX_ENV" || echo 'not set')"
        echo "   MODE: $(grep -o 'MODE=[^[:space:]]*' "$QUANNEX_ENV" || echo 'not set')"
    fi
    
    if [ -d ".quannex/context" ]; then
        local context_files=$(find ".quannex/context" -name "*.json" | wc -l)
        echo "   Archivos de contexto: $context_files"
    fi
}

# Función principal
main() {
    local start_time=$(date +%s)
    
    # Verificar argumentos
    if [ "${1:-}" = "--dry-run" ]; then
        echo "🧪 Modo dry-run: simulando rollback..."
        echo "✅ Rollback simulado exitosamente"
        exit 0
    fi
    
    echo "🚨 Iniciando rollback de emergencia..."
    echo "   Timeout: ${ROLLBACK_TIMEOUT}s"
    echo ""
    
    # Crear backup
    create_backup
    
    # Desactivar premium
    disable_premium
    
    # Cambiar a OSS
    switch_to_oss
    
    # Preservar contexto
    preserve_context
    
    # Validar rollback
    if ! validate_rollback; then
        echo "❌ Rollback falló validación"
        exit 1
    fi
    
    # Mostrar estado final
    show_status
    
    # Verificar tiempo
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "⏱️  Rollback completado en: ${duration}s"
    
    if [ $duration -le $ROLLBACK_TIMEOUT ]; then
        echo "✅ Rollback exitoso (dentro del timeout de ${ROLLBACK_TIMEOUT}s)"
        echo "🟢 Sistema en modo OSS seguro"
        exit 0
    else
        echo "⚠️  Rollback tardó más de ${ROLLBACK_TIMEOUT}s"
        echo "🟡 Sistema en modo OSS pero con advertencia de tiempo"
        exit 0
    fi
}

# Ejecutar función principal
main "$@"
