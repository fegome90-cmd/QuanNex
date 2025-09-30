#!/bin/bash

# Dependency verification script for Claude Project Init
# Verifies that all required dependencies are installed

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Verificador de Dependencias Claude Project Init${NC}"
echo "================================================================"

MISSING_DEPS=0

# Check function
check_dependency() {
  local cmd="$1"
  local name="$2"
  local install_info="$3"

  if command -v "$cmd" &>/dev/null; then
    local version
    version=$($cmd --version 2>/dev/null | head -n1 || echo "version unknown")
    echo -e "${GREEN}✅ $name${NC} - $version"
  else
    echo -e "${RED}❌ $name${NC} - No encontrado"
    echo -e "   ${YELLOW}Instalación:${NC} $install_info"
    MISSING_DEPS=$((MISSING_DEPS + 1))
  fi
}

echo -e "\n🔧 Verificando dependencias requeridas..."
echo "--------------------------------------------------------"

# Core dependencies
check_dependency "git" "Git" "https://git-scm.com/downloads"
check_dependency "gh" "GitHub CLI" "https://cli.github.com/ o 'brew install gh'"
check_dependency "npm" "npm (Node.js)" "https://nodejs.org/"

echo -e "\n🎭 Verificando dependencias opcionales..."
echo "--------------------------------------------------------"

# Optional but recommended
check_dependency "code" "VS Code" "https://code.visualstudio.com/"
check_dependency "claude" "Claude CLI" "https://claude.ai/download"

echo -e "\n📊 Verificando herramientas de desarrollo..."
echo "--------------------------------------------------------"

# Development tools
if command -v npm &>/dev/null; then
  if npm list -g @playwright/test &>/dev/null; then
    echo -e "${GREEN}✅ Playwright${NC} - Instalado globalmente"
  else
    echo -e "${YELLOW}⚠️  Playwright${NC} - No instalado globalmente (se instalará por proyecto)"
  fi
else
  echo -e "${RED}❌ Playwright${NC} - Requiere npm"
  MISSING_DEPS=$((MISSING_DEPS + 1))
fi

# Check for common package managers
echo -e "\n📦 Gestores de paquetes disponibles:"
echo "--------------------------------------------------------"
check_dependency "yarn" "Yarn" "'npm install -g yarn'"
check_dependency "pnpm" "pnpm" "'npm install -g pnpm'"
check_dependency "bun" "Bun" "https://bun.sh/"

# System information
echo -e "\n💻 Información del sistema:"
echo "--------------------------------------------------------"
echo -e "${GREEN}OS:${NC} $(uname -s) $(uname -r)"
echo -e "${GREEN}Architecture:${NC} $(uname -m)"
if command -v node &>/dev/null; then
  echo -e "${GREEN}Node.js:${NC} $(node --version)"
fi

# Final summary
echo -e "\n📋 Resumen de verificación:"
echo "================================================================"

if [ $MISSING_DEPS -eq 0 ]; then
  echo -e "${GREEN}🎉 ¡Todas las dependencias requeridas están instaladas!${NC}"
  echo -e "${GREEN}✅ El script core/claude-project-init.sh está listo para ejecutarse${NC}"
  echo -e "\n🚀 Comando para ejecutar:"
  echo -e "${YELLOW}./core/claude-project-init.sh${NC}"
else
  echo -e "${RED}❌ Faltan $MISSING_DEPS dependencias requeridas${NC}"
  echo -e "${YELLOW}⚠️  Instala las dependencias faltantes antes de ejecutar el script${NC}"
  exit 1
fi

echo -e "\n💡 Tip: Ejecuta este script regularmente para verificar tu entorno"
