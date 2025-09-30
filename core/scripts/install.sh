#!/bin/bash

# Quick installation script for Claude Project Init Kit
# Copies the kit to a desired location and sets up permissions

set -e

GREEN='\033[0;32m'
# RED='\033[0;31m'  # Unused variable
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Claude Project Init Kit - Instalador Rápido${NC}"
echo "================================================================"

# Get current script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "📁 Kit ubicado en: ${YELLOW}$KIT_DIR${NC}"

# Ask for installation location
read -r -p "¿Dónde quieres instalar el kit? [presiona Enter para usar $HOME/claude-project-init]: " INSTALL_DIR

if [ -z "$INSTALL_DIR" ]; then
  INSTALL_DIR="$HOME/claude-project-init"
fi

echo -e "\n📋 Configuración de instalación:"
echo "  - Origen: $KIT_DIR"
echo "  - Destino: $INSTALL_DIR"

# Confirm installation
read -r -p "¿Proceder con la instalación? [y/N]: " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "Instalación cancelada."
  exit 0
fi

echo -e "\n🔄 Instalando..."

# Create destination directory
mkdir -p "$INSTALL_DIR"

# Copy all files except this script
echo "  📂 Copiando archivos..."
rsync -av --exclude='core/scripts/install.sh' "$KIT_DIR/" "$INSTALL_DIR/"

# Set permissions
echo "  🔧 Configurando permisos..."
chmod +x "$INSTALL_DIR/core/claude-project-init.sh"
chmod +x "$INSTALL_DIR/core/scripts/"*.sh

# Create symlink if user wants it
echo -e "\n🔗 ¿Crear enlace simbólico para acceso global?"
read -r -p "Esto permitirá ejecutar 'claude-project-init' desde cualquier directorio [y/N]: " create_symlink

if [[ $create_symlink =~ ^[Yy]$ ]]; then
  SYMLINK_DIR="/usr/local/bin"
  if [ -w "$SYMLINK_DIR" ]; then
    ln -sf "$INSTALL_DIR/core/claude-project-init.sh" "$SYMLINK_DIR/claude-project-init"
    echo -e "${GREEN}✅ Enlace creado: claude-project-init${NC}"
  else
    echo -e "${YELLOW}⚠️  Requiere permisos de administrador para crear enlace global${NC}"
    echo "Ejecuta manualmente: sudo ln -sf '$INSTALL_DIR/core/claude-project-init.sh' '/usr/local/bin/claude-project-init'"
  fi
fi

echo -e "\n✅ ${GREEN}¡Instalación completada!${NC}"
echo "================================================================"
echo -e "📁 Kit instalado en: ${YELLOW}$INSTALL_DIR${NC}"
echo -e "\n🚀 Comandos disponibles:"
echo -e "  ${YELLOW}$INSTALL_DIR/core/claude-project-init.sh${NC}     # Crear proyecto"
echo -e "  ${YELLOW}$INSTALL_DIR/core/scripts/verify-dependencies.sh${NC}  # Verificar deps"
echo -e "  ${YELLOW}$INSTALL_DIR/core/scripts/test-claude-init.sh${NC}      # Testing completo"

if [[ $create_symlink =~ ^[Yy]$ ]] && [ -w "/usr/local/bin" ]; then
  echo -e "  ${YELLOW}claude-project-init${NC}                        # Acceso global"
fi

echo -e "\n💡 Siguiente paso:"
echo -e "${GREEN}cd $INSTALL_DIR && ./core/claude-project-init.sh${NC}"

echo -e "\n📚 Documentación disponible:"
echo -e "  - README.md           # Guía rápida"
echo -e "  - GUIA_COMPLETA.md    # Guía detallada Claude Code"
echo -e "  - ejemplos/           # Casos de uso paso a paso"
echo -e "  - docs/               # Documentación técnica"
