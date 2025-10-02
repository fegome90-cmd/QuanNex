#!/bin/bash
# tools/auto-organize.sh
# Auto-organiza archivos según las reglas estructurales

set -euo pipefail

echo "🤖 Auto-organizando archivos según reglas estructurales..."

# Función para mover archivo a ubicación correcta
move_file() {
    local file="$1"
    local target_dir="$2"
    local reason="$3"
    
    if [ -f "$file" ]; then
        echo "  📦 Moviendo $file → $target_dir ($reason)"
        mkdir -p "$target_dir"
        mv "$file" "$target_dir/"
    fi
}

# 1. Mover archivos .js sueltos a versions/v3/
echo "📁 Moviendo archivos .js sueltos..."
for file in *.js; do
    if [ -f "$file" ] && [ "$file" != "orchestrator.js" ]; then
        move_file "$file" "versions/v3/" "archivo .js debe estar en versions/"
    fi
done

# 2. Mover archivos .mjs sueltos a tools/scripts/
echo "📁 Moviendo archivos .mjs sueltos..."
for file in *.mjs; do
    if [ -f "$file" ]; then
        move_file "$file" "tools/scripts/" "archivo .mjs debe estar en tools/scripts/"
    fi
done

# 3. Mover archivos .sh sueltos a tools/scripts/
echo "📁 Moviendo archivos .sh sueltos..."
for file in *.sh; do
    if [ -f "$file" ] && [ "$file" != "claude-project-init.sh" ]; then
        move_file "$file" "tools/scripts/" "archivo .sh debe estar en tools/scripts/"
    fi
done

# 4. Mover archivos .md sueltos a docs/
echo "📁 Moviendo archivos .md sueltos..."
ALLOWED_MD_FILES=(
    "README.md"
    "CHANGELOG.md"
    "MANUAL-COMPLETO-CURSOR.md"
    "README-ORGANIZATION.md"
    "QUICKSTART.md"
    "USAGE.md"
    "SECURITY.md"
)

for file in *.md; do
    if [ -f "$file" ]; then
        if [[ ! " ${ALLOWED_MD_FILES[@]} " =~ " ${file} " ]]; then
            move_file "$file" "docs/" "archivo .md debe estar en docs/"
        fi
    fi
done

# 5. Mover archivos .json sueltos a versions/v3/
echo "📁 Moviendo archivos .json sueltos..."
ALLOWED_JSON_FILES=(
    "package.json"
    "package-lock.json"
)

for file in *.json; do
    if [ -f "$file" ]; then
        if [[ ! " ${ALLOWED_JSON_FILES[@]} " =~ " ${file} " ]]; then
            move_file "$file" "versions/v3/" "archivo .json debe estar en versions/"
        fi
    fi
done

# 6. Mover archivos .yaml/.yml sueltos a docs/
echo "📁 Moviendo archivos .yaml/.yml sueltos..."
for file in *.yaml *.yml; do
    if [ -f "$file" ]; then
        move_file "$file" "docs/" "archivo .yaml/.yml debe estar en docs/"
    fi
done

# 7. Mover archivos .toml sueltos a docs/
echo "📁 Moviendo archivos .toml sueltos..."
for file in *.toml; do
    if [ -f "$file" ]; then
        move_file "$file" "docs/" "archivo .toml debe estar en docs/"
    fi
done

# 8. Mover archivos .txt sueltos a docs/
echo "📁 Moviendo archivos .txt sueltos..."
for file in *.txt; do
    if [ -f "$file" ]; then
        move_file "$file" "docs/" "archivo .txt debe estar en docs/"
    fi
done

# 9. Mover archivos .js de orchestration/ a versions/v3/
echo "📁 Moviendo archivos .js de orchestration/..."
if [ -d "orchestration" ]; then
    for file in orchestration/*.js; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            if [ "$filename" != "orchestrator.js" ]; then
                move_file "$file" "versions/v3/" "archivo de orchestration/ debe estar en versions/"
            fi
        fi
    done
fi

# 10. Mover archivos .js de agents/ a versions/v3/
echo "📁 Moviendo archivos .js de agents/..."
if [ -d "agents" ]; then
    for file in agents/*/*.js; do
        if [ -f "$file" ]; then
            move_file "$file" "versions/v3/" "archivo de agents/ debe estar en versions/"
        fi
    done
fi

echo "✅ Auto-organización completada"
echo ""
echo "🔍 Ejecutando validación..."
if ./tools/validate-structure.sh; then
    echo "✅ Estructura validada - Todo en orden"
else
    echo "⚠️  Aún hay violaciones - Revisa manualmente"
fi
