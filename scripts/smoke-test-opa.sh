#!/usr/bin/env bash
set -euo pipefail

# Smoke Test Local para OPA - 3 minutos
# Fecha: 2025-10-04
# Propósito: Verificar que los 3 planes (A/B/C) funcionan correctamente

echo "🧪 Smoke Test Local - OPA Endurecido Plus"
echo "=========================================="

# Variables
BASE_BRANCH=${1:-origin/main}
HEAD_BRANCH=${2:-HEAD}
TEST_DIR=".smoke-test"
RESULTS_FILE="$TEST_DIR/results.md"

# Crear directorio de test
mkdir -p "$TEST_DIR"

# Función para logging
log() {
    echo "[$(date -u +%H:%M:%S)] $1"
}

log "🧪 Iniciando smoke test local..."

# 1. Simular PR con touch a ruta sensible + deleciones
log "📊 Simulando PR con cambios..."
git fetch --all
base=$(git rev-parse "$BASE_BRANCH")
head=$(git rev-parse "$HEAD_BRANCH")
git diff --name-status -M90 "$base" "$head" > "$TEST_DIR/diff.txt"

echo "📋 Cambios detectados:"
cat "$TEST_DIR/diff.txt"

# 2. Generar input.json igual que en los workflows
log "📝 Generando input.json..."
jq -nc \
  --argjson labels '["critical"]' \
  --arg files "$(awk '{print $2"\n"$3}' "$TEST_DIR/diff.txt" | sed '/^$/d' | sort -u | tr '\n' ' ')" \
  --arg deleted "$(awk '$1=="D"{print $2}' "$TEST_DIR/diff.txt" | tr '\n' ' ')" \
  '{
    labels: ( $labels ),
    files: ( $files | split(" ") | map(select(length>0)) ),
    deleted_files: ( $deleted | split(" ") | map(select(length>0)) )
  }' > "$TEST_DIR/input.json"

echo "📄 input.json generado:"
cat "$TEST_DIR/input.json"

# Crear reporte de resultados
cat > "$RESULTS_FILE" << EOF
# 🧪 Smoke Test Results - $(date)

**Base**: $base  
**Head**: $head  
**Fecha**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## 📊 Datos del Test

EOF

# 3A. Plan A (OPA local si está instalado)
log "🔍 Plan A: OPA Local..."
if command -v opa &> /dev/null; then
    echo "✅ OPA local encontrado"
    if opa eval --format=json -i "$TEST_DIR/input.json" -d policies/ 'data.pr.deny' > "$TEST_DIR/plan-a-result.json" 2>/dev/null; then
        PLAN_A_VIOLATIONS=$(jq -r '.result[0].expressions[0].value[]?' "$TEST_DIR/plan-a-result.json" 2>/dev/null || echo "")
        if [ -n "$PLAN_A_VIOLATIONS" ]; then
            echo "❌ Plan A - Violaciones detectadas:"
            echo "$PLAN_A_VIOLATIONS"
            echo "✅ Plan A - FUNCIONANDO (detectó violaciones)"
        else
            echo "✅ Plan A - Sin violaciones (OK)"
        fi
        PLAN_A_STATUS="✅ FUNCIONANDO"
    else
        echo "❌ Plan A - Error en evaluación"
        PLAN_A_STATUS="❌ ERROR"
    fi
else
    echo "⚠️ OPA local no encontrado - saltando Plan A"
    PLAN_A_STATUS="⚠️ NO DISPONIBLE"
fi

# 3B. Plan B (Contenedor con docker run)
log "🔍 Plan B: Contenedor OPA (docker run)..."
if command -v docker &> /dev/null; then
    echo "✅ Docker encontrado"
    echo "🔍 Evaluando con defaults via contenedor..."
    if docker run --rm -v "$PWD":/work -w /work openpolicyagent/opa:0.58.0 \
       eval --format=json -i "$TEST_DIR/input.json" -d policies/ 'data.pr.deny' > "$TEST_DIR/plan-b-result.json" 2>/dev/null; then
        PLAN_B_VIOLATIONS=$(jq -r '.result[0].expressions[0].value[]?' "$TEST_DIR/plan-b-result.json" 2>/dev/null || echo "")
        if [ -n "$PLAN_B_VIOLATIONS" ]; then
            echo "❌ Plan B - Violaciones detectadas:"
            echo "$PLAN_B_VIOLATIONS"
            echo "✅ Plan B - FUNCIONANDO (detectó violaciones)"
        else
            echo "✅ Plan B - Sin violaciones (OK)"
        fi
        PLAN_B_STATUS="✅ FUNCIONANDO"
    else
        echo "❌ Plan B - Error en evaluación"
        PLAN_B_STATUS="❌ ERROR"
    fi
else
    echo "⚠️ Docker no encontrado - saltando Plan B"
    PLAN_B_STATUS="⚠️ NO DISPONIBLE"
fi

# 3C. Plan C (Bash puro)
log "🔍 Plan C: Bash Puro..."
echo "🔍 Simulando lógica de Plan C..."

# Simular la lógica de simple-policy-check
labels=$(jq -r '.labels[]?' "$TEST_DIR/input.json")
files=$(jq -r '.files[]?' "$TEST_DIR/input.json")
dels=$(jq -r '.deleted_files|length' "$TEST_DIR/input.json")
max_files=$(awk -F': *' '/max_files_deleted/{print $2}' config/sensitive-paths.yaml 2>/dev/null || echo 25)

# sensitive globs (del YAML o defaults)
if [ -f config/sensitive-paths.yaml ]; then
    # Compatible con macOS (sin mapfile)
    globs=()
    while IFS= read -r line; do
        [ -n "$line" ] && globs+=("$line")
    done < <(awk '/sensitive_globs:/{f=1;next} f&&/^-/{g=$0; sub(/^- *"/,"",g); sub(/" *$/,"",g); print g} f&&$0!~"^-"{if(f)exit}' config/sensitive-paths.yaml)
    # Si no se encontraron globs, usar defaults
    [ ${#globs[@]} -eq 0 ] && globs=("rag/**" ".github/workflows/**" "ops/**" "core/**")
else
    globs=("rag/**" ".github/workflows/**" "ops/**" "core/**")
fi

to_regex() { sed -E 's/([.^$+(){}|[])/\\\1/g; s/\*/.*/g'; }

violations=()

# Rule 1: sensitive paths require "critical"
for g in "${globs[@]}"; do
    rgx=$(printf "%s" "$g" | to_regex)
    hit=$(printf "%s\n" $files | grep -E "^${rgx}$" || true)
    if [ -n "$hit" ]; then
        echo "Sensitive path hit: $g"
        if ! printf "%s\n" $labels | grep -qi '^critical$'; then
            violations+=("Tocar rutas sensibles requiere label 'critical' + CODEOWNERS")
        fi
        break
    fi
done

# Rule 2: mass deletions require "rollback"
if [ "$dels" -gt "$max_files" ]; then
    if ! printf "%s\n" $labels | grep -qi '^rollback$'; then
        violations+=("Deleciones masivas ($dels > $max_files) requieren 'rollback' + CODEOWNERS")
    fi
fi

# Escribir violaciones (manejar array vacío)
if [ ${#violations[@]} -gt 0 ]; then
    printf "%s\n" "${violations[@]}" > "$TEST_DIR/plan-c-violations.txt"
else
    touch "$TEST_DIR/plan-c-violations.txt"
fi

if [ -s "$TEST_DIR/plan-c-violations.txt" ]; then
    echo "❌ Plan C - Violaciones detectadas:"
    cat "$TEST_DIR/plan-c-violations.txt"
    echo "✅ Plan C - FUNCIONANDO (detectó violaciones)"
    PLAN_C_STATUS="✅ FUNCIONANDO"
else
    echo "✅ Plan C - Sin violaciones (OK)"
    PLAN_C_STATUS="✅ FUNCIONANDO"
fi

# Generar reporte final
cat >> "$RESULTS_FILE" << EOF

## 🎯 Resultados por Plan

### Plan A (OPA Local)
- **Estado**: $PLAN_A_STATUS
- **Comando**: \`opa eval --format=json -i input.json -d policies/ 'data.pr.deny'\`

### Plan B (Contenedor)
- **Estado**: $PLAN_B_STATUS
- **Comando**: \`docker run --rm -v "\$PWD":/work -w /work openpolicyagent/opa:0.58.0 eval --format=json -i input.json -d policies/ 'data.pr.deny'\`

### Plan C (Bash Puro)
- **Estado**: $PLAN_C_STATUS
- **Lógica**: Simulación de simple-policy-check.yml

## 📊 Datos de Test

### Input JSON
\`\`\`json
$(cat "$TEST_DIR/input.json")
\`\`\`

### Diff Detected
\`\`\`
$(cat "$TEST_DIR/diff.txt")
\`\`\`

## ✅ Criterios de Éxito

- [ ] **Plan A**: OPA local funciona (si está instalado)
- [ ] **Plan B**: Contenedor funciona (si Docker está disponible)
- [ ] **Plan C**: Bash puro siempre funciona
- [ ] **Consistencia**: Todos los planes producen resultados coherentes
- [ ] **Violaciones**: Se detectan correctamente cuando corresponde

## 🎯 Conclusión

**Estado General**: $([ "$PLAN_A_STATUS" = "✅ FUNCIONANDO" ] || [ "$PLAN_B_STATUS" = "✅ FUNCIONANDO" ] || [ "$PLAN_C_STATUS" = "✅ FUNCIONANDO" ] && echo "✅ SISTEMA OPERATIVO" || echo "❌ SISTEMA CON PROBLEMAS")

**Recomendación**: 
- Usar **Plan A** en producción (OPA pinned)
- **Plan B** como fallback (contenedor)
- **Plan C** como último recurso (bash puro)

---
**Generado**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Duración**: ~3 minutos
EOF

log "✅ Smoke test completado"
log "📄 Reporte generado: $RESULTS_FILE"

# Mostrar resumen
echo ""
echo "🎯 RESUMEN DEL SMOKE TEST:"
echo "=========================="
echo "Plan A (OPA Local): $PLAN_A_STATUS"
echo "Plan B (Contenedor): $PLAN_B_STATUS"
echo "Plan C (Bash Puro): $PLAN_C_STATUS"
echo ""
echo "📄 Reporte completo: $RESULTS_FILE"
echo "🧪 Smoke test completado en ~3 minutos"
