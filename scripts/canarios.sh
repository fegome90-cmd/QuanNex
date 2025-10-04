#!/usr/bin/env bash
set -euo pipefail

# Script de Canarios - Validación de Protecciones
# Fecha: 2025-10-04
# Propósito: Crear PRs canario para validar protecciones

echo "🧪 Canarios - Validación de Protecciones"
echo "========================================"

# Crear directorio de reportes
mkdir -p .reports/ci

# Función para crear PR canario
create_canary_pr() {
    local test_name="$1"
    local branch_name="canary/$test_name"
    local description="$2"
    
    echo "🔍 Creando canario: $test_name"
    
    # Crear rama
    git checkout -b "$branch_name"
    
    # Ejecutar test específico
    case "$test_name" in
        "docs-move")
            # Test 1: Docs move (debe pasar)
            echo "# Documento de prueba" > test-doc.md
            git add test-doc.md
            git commit -m "feat: add test doc"
            mkdir -p docs/informes
            git mv test-doc.md docs/informes/
            git commit -m "refactor: move doc to docs/informes/"
            ;;
        "massive-deletions")
            # Test 2: Deleciones masivas (debe bloquear)
            for i in {1..30}; do
                echo "# Archivo $i" > "test-file-$i.md"
            done
            git add test-file-*.md
            git commit -m "feat: add 30 test files"
            rm test-file-*.md
            git add -A
            git commit -m "fix: remove 30 test files (should block)"
            ;;
        "sensitive-path")
            # Test 3: Path sensible (debe bloquear)
            mkdir -p rag/test
            echo "// Test file" > rag/test/test.js
            git add rag/test/test.js
            git commit -m "feat: add file to sensitive path (should block)"
            ;;
        "verify-skip")
            # Test 4: Verify skip (draft vs ready)
            echo "test" > verify-skip-test.txt
            git add verify-skip-test.txt
            git commit -m "test: verify skip test"
            ;;
        "unsigned-commit")
            # Test 5: Commit sin firma (debe bloquear)
            echo "test" > unsigned-test.txt
            git add unsigned-test.txt
            git commit -m "test: unsigned commit (should block)"
            ;;
        "rebase-after-verify")
            # Test 6: Rebase después del último verify
            echo "test" > rebase-test.txt
            git add rebase-test.txt
            git commit -m "feat: initial commit"
            ;;
        "massive-docs-rename")
            # Test 7: Rename masivo de docs (debe pasar)
            for i in {1..50}; do
                echo "# Documento $i" > "doc-$i.md"
            done
            git add doc-*.md
            git commit -m "feat: add 50 dummy docs"
            mkdir -p docs/informes
            git mv doc-*.md docs/informes/
            git commit -m "refactor: move docs to docs/informes/"
            ;;
    esac
    
    # Push y crear PR
    git push origin "$branch_name"
    
    # Crear PR
    gh pr create \
        --title "🧪 CANARY: $test_name" \
        --body "$description" \
        --base main \
        --head "$branch_name"
    
    echo "✅ Canario creado: $test_name"
    
    # Volver a main
    git checkout main
}

# Verificar que estamos en main
if [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Error: Debe estar en rama main"
    exit 1
fi

# Verificar que el working tree está limpio
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: Working tree no está limpio"
    exit 1
fi

echo "📋 Ejecutando canarios..."

# Ejecutar todos los canarios
create_canary_pr "docs-move" "Test 1: Mover documento a docs/informes/ (debe pasar)"
create_canary_pr "massive-deletions" "Test 2: Eliminar 30 archivos (debe bloquear)"
create_canary_pr "sensitive-path" "Test 3: Tocar path sensible rag/ (debe bloquear)"
create_canary_pr "verify-skip" "Test 4: Verify skip (draft vs ready)"
create_canary_pr "unsigned-commit" "Test 5: Commit sin firma (debe bloquear)"
create_canary_pr "rebase-after-verify" "Test 6: Rebase después del último verify"
create_canary_pr "massive-docs-rename" "Test 7: Rename masivo de docs (debe pasar)"

echo ""
echo "🎉 Todos los canarios creados"
echo "📊 Revisar PRs en GitHub para validar protecciones"
echo "📝 Actualizar .reports/ci/CANARIOS.md con resultados"

# Crear reporte de canarios
cat > .reports/ci/canarios-$(date +%Y%m%d-%H%M%S).md << 'EOF'
# 🧪 Reporte de Canarios - $(date)

## Canarios Ejecutados

### Test 1: Docs Move
- **Branch**: canary/docs-move
- **Objetivo**: Mover documento a docs/informes/
- **Esperado**: ✅ PASA
- **Resultado**: [PENDIENTE]

### Test 2: Massive Deletions
- **Branch**: canary/massive-deletions
- **Objetivo**: Eliminar 30 archivos
- **Esperado**: ❌ BLOQUEA
- **Resultado**: [PENDIENTE]

### Test 3: Sensitive Path
- **Branch**: canary/sensitive-path
- **Objetivo**: Tocar path sensible rag/
- **Esperado**: ❌ BLOQUEA
- **Resultado**: [PENDIENTE]

### Test 4: Verify Skip
- **Branch**: canary/verify-skip
- **Objetivo**: Verify skip (draft vs ready)
- **Esperado**: ⚠️ DRAFT PASA, READY BLOQUEA
- **Resultado**: [PENDIENTE]

### Test 5: Unsigned Commit
- **Branch**: canary/unsigned-commit
- **Objetivo**: Commit sin firma
- **Esperado**: ❌ BLOQUEA
- **Resultado**: [PENDIENTE]

### Test 6: Rebase After Verify
- **Branch**: canary/rebase-after-verify
- **Objetivo**: Rebase después del último verify
- **Esperado**: ⚠️ NEEDS RE-RUN
- **Resultado**: [PENDIENTE]

### Test 7: Massive Docs Rename
- **Branch**: canary/massive-docs-rename
- **Objetivo**: Rename masivo de docs
- **Esperado**: ✅ PASA
- **Resultado**: [PENDIENTE]

## Próximos Pasos

1. **Revisar PRs**: Verificar que cada canario se comporta como esperado
2. **Documentar resultados**: Actualizar este reporte con resultados reales
3. **Ajustar protecciones**: Si algún canario no se comporta como esperado
4. **Limpiar branches**: Eliminar branches de canarios después de validar

---
**Ejecutado**: $(date)
**Responsable**: @fegome90-cmd
EOF

echo "📝 Reporte creado: .reports/ci/canarios-$(date +%Y%m%d-%H%M%S).md"
