#!/bin/bash
# Script de detección automática de ramas de rollback
# Detecta ramas que eliminan grandes cantidades de código

set -e

echo "🔍 DETECTOR DE RAMAS DE ROLLBACK"
echo "================================="
echo "Fecha: $(date)"
echo ""

# Obtener todas las ramas remotas excepto main
BRANCHES=$(git branch -r | grep -v main | grep -v HEAD | sed 's/origin\///' | sort)

if [ -z "$BRANCHES" ]; then
    echo "✅ No hay ramas remotas para analizar"
    exit 0
fi

echo "📊 Analizando $(echo "$BRANCHES" | wc -l) ramas..."
echo ""

# Contadores
SAFE_BRANCHES=0
ROLLBACK_BRANCHES=0
SUSPICIOUS_BRANCHES=0

for branch in $BRANCHES; do
    echo "🔍 Analizando: $branch"
    
    # Verificar si la rama existe localmente
    if ! git show-ref --verify --quiet refs/heads/$branch; then
        git fetch origin $branch:$branch 2>/dev/null || continue
    fi
    
    # Obtener estadísticas de cambios
    STATS=$(git diff main..$branch --stat 2>/dev/null | tail -1)
    
    if [ -z "$STATS" ]; then
        echo "  ⚪ Sin cambios vs main"
        continue
    fi
    
    # Extraer números de líneas
    DELETED=$(echo "$STATS" | grep -o '[0-9]* deletions' | grep -o '[0-9]*' || echo "0")
    ADDED=$(echo "$STATS" | grep -o '[0-9]* insertions' | grep -o '[0-9]*' || echo "0")
    FILES=$(echo "$STATS" | grep -o '[0-9]* files changed' | grep -o '[0-9]*' || echo "0")
    
    # Calcular ratio
    if [ "$ADDED" -gt 0 ]; then
        RATIO=$((DELETED / ADDED))
    else
        RATIO="∞"
    fi
    
    echo "  📊 Archivos: $FILES | Elimina: $DELETED | Agrega: $ADDED | Ratio: $RATIO:1"
    
    # Clasificar rama
    if [ "$DELETED" -gt 10000 ]; then
        echo "  🚨 ROLLBACK MASIVO DETECTADO"
        echo "     ⚠️  NO MERGEAR A MAIN"
        echo "     📝 Propósito: Rollback de emergencia"
        ROLLBACK_BRANCHES=$((ROLLBACK_BRANCHES + 1))
    elif [ "$DELETED" -gt 1000 ] && [ "$RATIO" != "∞" ] && [ "$RATIO" -gt 3 ]; then
        echo "  ⚠️  SUSPICIOUS - Posible rollback"
        echo "     🔍 Revisar antes de mergear"
        SUSPICIOUS_BRANCHES=$((SUSPICIOUS_BRANCHES + 1))
    else
        echo "  ✅ SEGURA para merge"
        SAFE_BRANCHES=$((SAFE_BRANCHES + 1))
    fi
    
    echo ""
done

# Resumen final
echo "📋 RESUMEN DEL ANÁLISIS"
echo "======================="
echo "✅ Ramas seguras: $SAFE_BRANCHES"
echo "⚠️  Ramas sospechosas: $SUSPICIOUS_BRANCHES"
echo "🚨 Ramas de rollback: $ROLLBACK_BRANCHES"
echo ""

if [ "$ROLLBACK_BRANCHES" -gt 0 ]; then
    echo "🚨 ACCIÓN REQUERIDA:"
    echo "   - NO mergear ramas de rollback a main"
    echo "   - Usar solo para rollback de emergencia"
    echo "   - Documentar en ROLLBACK-EMERGENCY.md"
    echo ""
fi

if [ "$SUSPICIOUS_BRANCHES" -gt 0 ]; then
    echo "⚠️  RECOMENDACIÓN:"
    echo "   - Revisar ramas sospechosas antes de mergear"
    echo "   - Verificar propósito de cada rama"
    echo "   - Considerar rebase si es necesario"
    echo ""
fi

echo "✅ Análisis completado"
exit 0
