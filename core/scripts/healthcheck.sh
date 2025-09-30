#!/bin/bash

# Filosofía Toyota: "Solo chequeos esenciales, nada más"
# Healthcheck simple y efectivo para el repositorio

set -e

echo "🔍 Healthcheck del Repositorio - Filosofía Toyota"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de problemas
issues=0
warnings=0

echo ""
echo "📁 Verificación de Estructura del Repositorio"
echo "--------------------------------------------"

# 1. Verificar archivos críticos existen
check_file() {
  if [ -f "$1" ]; then
    echo -e "✅ $1"
  else
    echo -e "${RED}❌ $1 - FALTANTE${NC}"
    ((issues++))
  fi
}

check_file "core/claude-project-init.sh"
check_file ".gitignore"
check_file ".github/workflows/ci.yml"
check_file ".github/CODEOWNERS"
check_file "SECURITY.md"

echo ""
echo "🔒 Verificación de Seguridad"
echo "---------------------------"

# 2. Verificar .gitignore contiene archivos sensibles
if grep -q "\.env" .gitignore; then
  echo -e "✅ .env en .gitignore"
else
  echo -e "${RED}❌ .env NO está en .gitignore${NC}"
  ((issues++))
fi

if grep -q "\.claude/memory" .gitignore; then
  echo -e "✅ .claude/memory en .gitignore"
else
  echo -e "${RED}❌ .claude/memory NO está en .gitignore${NC}"
  ((issues++))
fi

# 3. Verificar archivos sensibles no están en el repo
if [ -f ".env" ]; then
  echo -e "${RED}❌ .env encontrado en el repositorio${NC}"
  ((issues++))
else
  echo -e "✅ No hay archivo .env en el repo"
fi

if [ -f ".secrets" ]; then
  echo -e "${RED}❌ .secrets encontrado en el repositorio${NC}"
  ((issues++))
else
  echo -e "✅ No hay archivo .secrets en el repo"
fi

echo ""
echo "📋 Verificación de Permisos"
echo "---------------------------"

# 4. Verificar permisos de archivos ejecutables
find . -type f -perm +111 | grep -v ".git" | grep -v "node_modules" | while read -r file; do
  # Compatibilidad macOS y Linux
  if [[ $OSTYPE == "darwin"* ]]; then
    perms=$(stat -f "%Lp" "$file" 2>/dev/null)
  else
    perms=$(stat -c "%a" "$file" 2>/dev/null)
  fi

  if [ "$perms" = "777" ]; then
    echo -e "${RED}❌ Permisos inseguros (777) en: $file${NC}"
    ((issues++))
  elif [ "$perms" = "755" ] || [ "$perms" = "750" ]; then
    echo -e "✅ Permisos seguros ($perms) en: $file"
  else
    echo -e "${YELLOW}⚠️ Permisos inusuales ($perms) en: $file${NC}"
    ((warnings++))
  fi
done

echo ""
echo "🔧 Verificación de Scripts"
echo "-------------------------"

# 5. Verificar scripts de seguridad existen y son ejecutables
check_script() {
  if [ -f "$1" ] && [ -x "$1" ]; then
    echo -e "✅ $1 (ejecutable)"
  elif [ -f "$1" ]; then
    echo -e "${YELLOW}⚠️ $1 (no ejecutable)${NC}"
    ((warnings++))
  else
    echo -e "${RED}❌ $1 - FALTANTE${NC}"
    ((issues++))
  fi
}

check_script "core/scripts/verify-dependencies.sh"
check_script "core/scripts/lint-shell.sh"
check_script "core/scripts/test-claude-init.sh"
check_script "core/scripts/test-flags.sh"
check_script "core/scripts/scan-secrets.sh"

echo ""
echo "📊 Resumen del Healthcheck"
echo "========================="

if [ $issues -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}🎉 Repositorio en excelente estado!${NC}"
  echo "✅ Todos los chequeos pasaron"
  exit 0
elif [ $issues -eq 0 ]; then
  echo -e "${GREEN}✅ Repositorio en buen estado${NC}"
  echo "⚠️ $warnings advertencias (no críticas)"
  exit 0
else
  echo -e "${RED}❌ Repositorio tiene problemas${NC}"
  echo "❌ $issues problemas críticos"
  echo "⚠️ $warnings advertencias"
  echo ""
  echo "🔧 Acciones recomendadas:"
  echo "1. Revisar archivos faltantes"
  echo "2. Corregir permisos inseguros"
  echo "3. Verificar .gitignore"
  echo "4. Ejecutar healthcheck nuevamente"
  exit 1
fi
