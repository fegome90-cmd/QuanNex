#!/usr/bin/env bash
set -euo pipefail

# Script forense actualizado - distingue R* vs D
# Uso: ./scripts/forense.sh [base] [head]
# Ejemplo: ./scripts/forense.sh origin/main HEAD

mkdir -p .reports/forensics

base=${1:-origin/main}
head=${2:-HEAD}

out=".reports/forensics/diff-forense.csv"
echo "status|old_path|new_path|similarity" > "$out"

echo "🔍 Analizando diferencias entre $base y $head..."

git diff --name-status -M90 "$base" "$head" | while read -r status a b; do
  if [[ "$status" =~ ^R[0-9]+$ ]]; then
    # Rename/move con old_path=a new_path=b
    similarity=${status#R}  # Extrae el número de similaridad
    echo "$status|$a|$b|$similarity" >> "$out"
    echo "📁 RENAME: $a → $b (${similarity}% similaridad)"
  else
    # A/M/D sólo tienen 'a' (old_path para D; new_path para A/M)
    echo "$status|$a||" >> "$out"
    case "$status" in
      "A") echo "➕ ADDED: $a" ;;
      "M") echo "📝 MODIFIED: $a" ;;
      "D") echo "🗑️  DELETED: $a" ;;
    esac
  fi
done

# Generar resumen
echo ""
echo "📊 RESUMEN FORENSE:"
echo "=================="

total_changes=$(wc -l < "$out")
additions=$(awk -F'|' '$1=="A"{c++} END{print c+0}' "$out")
modifications=$(awk -F'|' '$1=="M"{c++} END{print c+0}' "$out")
deletions=$(awk -F'|' '$1=="D"{c++} END{print c+0}' "$out")
renames=$(awk -F'|' '$1 ~ /^R[0-9]+$/{c++} END{print c+0}' "$out")

echo "Total cambios: $total_changes"
echo "Adiciones: $additions"
echo "Modificaciones: $modifications"
echo "Deleciones reales: $deletions"
echo "Renames/moves: $renames"

# Análisis de riesgo
echo ""
echo "🚨 ANÁLISIS DE RIESGO:"
echo "====================="

if [ "$deletions" -gt 25 ]; then
  echo "⚠️  ALTO RIESGO: $deletions deleciones reales (> 25)"
  echo "   Requiere labels 'rollback' y 'critical'"
elif [ "$deletions" -gt 10 ]; then
  echo "⚠️  RIESGO MEDIO: $deletions deleciones reales (> 10)"
  echo "   Requiere revisión cuidadosa"
else
  echo "✅ RIESGO BAJO: $deletions deleciones reales"
fi

# Verificar paths sensibles
sensitive_paths=$(awk -F'|' '$2 ~ /^(rag\/|ops\/|\.github\/workflows\/)/ || $3 ~ /^(rag\/|ops\/|\.github\/workflows\/)/ {c++} END{print c+0}' "$out")
if [ "$sensitive_paths" -gt 0 ]; then
  echo "🚨 PATHS SENSIBLES: $sensitive_paths cambios en rag/, ops/, .github/workflows/"
  echo "   Requiere aprobación CODEOWNERS"
fi

echo ""
echo "👉 Reporte forense actualizado: $out"
echo "📁 Archivo CSV generado para análisis detallado"
