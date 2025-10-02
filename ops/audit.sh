#!/usr/bin/env bash
# Gate 10: MCP Enforcement - Verificador de uso de MCP QuanNex
# Valida commits con trailer + firma HMAC y trazas .quannex/trace/

set -euo pipefail

echo "🚦 Gate 10: Verificando MCP Enforcement..."

ERRORS=0
COMMITS_CHECKED=0

# Configuración
QUANNEX_SIGNING_KEY="${QUANNEX_SIGNING_KEY:-default-signing-key}"
TRACE_DIR=".quannex/trace"
MIN_COMMITS=5

# Función para verificar trailer de commit
check_commit_trailer() {
    local commit_msg="$1"
    local commit_hash="$2"
    
    echo "  🔍 Verificando commit: ${commit_hash:0:8}"
    
    # Verificar que tiene trailer QuanNex
    if ! echo "$commit_msg" | grep -q "QuanNex: requestId="; then
        echo "    ❌ Sin trailer QuanNex"
        return 1
    fi
    
    # Extraer requestId y firma
    local request_id=$(echo "$commit_msg" | sed -n 's/.*requestId=\([^ ]*\).*/\1/p')
    local signature=$(echo "$commit_msg" | sed -n 's/.*sig=\([0-9a-f]*\).*/\1/p')
    
    if [ -z "$request_id" ] || [ -z "$signature" ]; then
        echo "    ❌ Trailer malformado (requestId o sig faltante)"
        return 1
    fi
    
    # Verificar firma HMAC
    local calculated_sig=$(printf "%s" "$request_id" | openssl dgst -sha256 -hmac "$QUANNEX_SIGNING_KEY" | awk '{print $2}')
    
    if [ "$signature" != "$calculated_sig" ]; then
        echo "    ❌ Firma inválida (esperada: $calculated_sig, recibida: $signature)"
        return 1
    fi
    
    # Verificar que existe traza
    local trace_file="$TRACE_DIR/$request_id.json"
    if [ ! -f "$trace_file" ]; then
        echo "    ❌ Traza no encontrada: $trace_file"
        return 1
    fi
    
    # Verificar contenido de la traza
    if ! jq -e '.requestId' "$trace_file" >/dev/null 2>&1; then
        echo "    ❌ Traza malformada (no tiene requestId)"
        return 1
    fi
    
    if ! jq -e '.timestamp' "$trace_file" >/dev/null 2>&1; then
        echo "    ❌ Traza malformada (no tiene timestamp)"
        return 1
    fi
    
    echo "    ✅ Commit válido (req=$request_id)"
    return 0
}

# Función para verificar estructura de trazas
check_trace_structure() {
    echo "📁 Verificando estructura de trazas..."
    
    if [ ! -d "$TRACE_DIR" ]; then
        echo "❌ Directorio de trazas no encontrado: $TRACE_DIR"
        return 1
    fi
    
    local trace_count=$(find "$TRACE_DIR" -name "*.json" | wc -l)
    echo "  📊 Trazas encontradas: $trace_count"
    
    if [ $trace_count -eq 0 ]; then
        echo "  ⚠️  No hay trazas disponibles"
        return 1
    fi
    
    # Verificar algunas trazas aleatorias
    local sample_traces=$(find "$TRACE_DIR" -name "*.json" | head -3)
    
    for trace_file in $sample_traces; do
        echo "  🔍 Verificando traza: $(basename "$trace_file")"
        
        if ! jq -e '.requestId' "$trace_file" >/dev/null 2>&1; then
            echo "    ❌ Traza sin requestId válido"
            return 1
        fi
        
        if ! jq -e '.timestamp' "$trace_file" >/dev/null 2>&1; then
            echo "    ❌ Traza sin timestamp válido"
            return 1
        fi
        
        echo "    ✅ Traza válida"
    done
    
    return 0
}

# Función para verificar configuración MCP
check_mcp_config() {
    echo "⚙️  Verificando configuración MCP..."
    
    local mcp_config=".quannex/mcp.json"
    
    if [ ! -f "$mcp_config" ]; then
        echo "❌ Configuración MCP no encontrada: $mcp_config"
        return 1
    fi
    
    # Verificar campos requeridos
    local required_fields=("version" "agents" "workflows" "security")
    
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$mcp_config" >/dev/null 2>&1; then
            echo "❌ Campo requerido faltante en MCP config: $field"
            return 1
        fi
    done
    
    echo "✅ Configuración MCP válida"
    return 0
}

# Función para verificar hooks de git
check_git_hooks() {
    echo "🪝 Verificando hooks de git..."
    
    local pre_commit_hook=".git/hooks/pre-commit"
    local pre_push_hook=".git/hooks/pre-push"
    
    if [ ! -f "$pre_commit_hook" ]; then
        echo "⚠️  Hook pre-commit no encontrado"
    else
        echo "✅ Hook pre-commit encontrado"
    fi
    
    if [ ! -f "$pre_push_hook" ]; then
        echo "⚠️  Hook pre-push no encontrado"
    else
        echo "✅ Hook pre-push encontrado"
    fi
    
    return 0
}

# Función para verificar uso de MCP en commits recientes
check_recent_commits() {
    echo "📝 Verificando commits recientes..."
    
    # Obtener últimos commits
    local commits=$(git log --oneline -$MIN_COMMITS --pretty=format:"%H|%s|%B")
    
    if [ -z "$commits" ]; then
        echo "❌ No hay commits recientes"
        return 1
    fi
    
    local mcp_commits=0
    local non_mcp_commits=0
    
    while IFS='|' read -r hash subject body; do
        ((COMMITS_CHECKED++))
        
        if check_commit_trailer "$body" "$hash"; then
            ((mcp_commits++))
        else
            ((non_mcp_commits++))
            ((ERRORS++))
        fi
        
    done <<< "$commits"
    
    echo "  📊 Commits verificados: $COMMITS_CHECKED"
    echo "  ✅ Commits con MCP: $mcp_commits"
    echo "  ❌ Commits sin MCP: $non_mcp_commits"
    
    # Calcular porcentaje de uso de MCP
    if [ $COMMITS_CHECKED -gt 0 ]; then
        local mcp_percentage=$((mcp_commits * 100 / COMMITS_CHECKED))
        echo "  📈 Porcentaje de uso MCP: $mcp_percentage%"
        
        if [ $mcp_percentage -lt 80 ]; then
            echo "  ⚠️  Uso de MCP por debajo del 80%"
            ((ERRORS++))
        fi
    fi
    
    return 0
}

# Función para verificar integridad de trazas
check_trace_integrity() {
    echo "🔐 Verificando integridad de trazas..."
    
    local trace_files=$(find "$TRACE_DIR" -name "*.json" 2>/dev/null || true)
    
    if [ -z "$trace_files" ]; then
        echo "⚠️  No hay archivos de traza para verificar"
        return 0
    fi
    
    local corrupted_traces=0
    
    for trace_file in $trace_files; do
        if ! jq -e '.' "$trace_file" >/dev/null 2>&1; then
            echo "❌ Traza corrupta: $trace_file"
            ((corrupted_traces++))
        fi
    done
    
    if [ $corrupted_traces -gt 0 ]; then
        echo "❌ Trazas corruptas encontradas: $corrupted_traces"
        ((ERRORS++))
        return 1
    else
        echo "✅ Todas las trazas son válidas"
        return 0
    fi
}

# Ejecutar verificaciones
echo "🔍 Iniciando verificaciones de MCP Enforcement..."

# 1. Verificar estructura de trazas
if ! check_trace_structure; then
    ((ERRORS++))
fi

# 2. Verificar configuración MCP
if ! check_mcp_config; then
    ((ERRORS++))
fi

# 3. Verificar hooks de git
check_git_hooks

# 4. Verificar commits recientes
if ! check_recent_commits; then
    ((ERRORS++))
fi

# 5. Verificar integridad de trazas
if ! check_trace_integrity; then
    ((ERRORS++))
fi

# Resumen
echo ""
echo "📊 Resumen Gate 10:"
echo "   Commits verificados: $COMMITS_CHECKED"
echo "   Errores encontrados: $ERRORS"

if [ $ERRORS -eq 0 ]; then
    echo "🟢 Gate 10: MCP ENFORCEMENT - PASÓ"
    echo "✅ USÓ MCP (todos los commits verificados tienen trazas válidas)"
    exit 0
else
    echo "🔴 Gate 10: MCP ENFORCEMENT - FALLÓ"
    echo "❌ NO USÓ MCP (commits sin trazas o trazas inválidas)"
    exit 1
fi
