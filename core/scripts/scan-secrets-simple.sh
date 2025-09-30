#!/usr/bin/env bash
set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔍 Escaneo de Secretos Simplificado - Filosofía Toyota${NC}"
echo "=================================================="

# Verificar si hay archivos sensibles básicos
echo "🔍 Verificando archivos sensibles básicos..."

sensitive_files=(
  ".env"
  ".secrets"
  "secrets.json"
  "config.json"
  "credentials.json"
  "private.key"
  "id_rsa"
  "id_dsa"
)

found_sensitive=0
for file in "${sensitive_files[@]}"; do
  if [[ -f $file ]]; then
    echo -e "${RED}❌ Archivo sensible encontrado: $file${NC}"
    ((found_sensitive++))
  fi
done

# Verificar contenido de archivos por patrones simples
echo -e "\n🔍 Verificando contenido por patrones simples..."

# Buscar patrones básicos sin regex complejo
patterns=(
  "AKIA"
  "ASIA"
  "aws_secret"
  "AIza"
  "ghp_"
  "xoxb-"
  "sk-"
  "secret"
  "password"
  "-----BEGIN"
)

found_patterns=0
while IFS= read -r -d '' file; do
  # Solo archivos de texto, excluir binarios
  if [[ $file =~ \.(md|txt|sh|js|ts|py|json|yaml|yml|xml|html|css)$ ]] && [[ -f $file ]]; then
    for pattern in "${patterns[@]}"; do
      if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Patrón encontrado '$pattern' en: $file${NC}"
        ((found_patterns++))
      fi
    done
  fi
done < <(find . -type f -name "*" -print0 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -v "dist" | grep -v "build")

# Resumen final
echo -e "\n📊 Resumen del Escaneo:"
echo "=================================================="

if [[ $found_sensitive -eq 0 && $found_patterns -eq 0 ]]; then
  echo -e "${GREEN}✅ Sin secretos aparentes detectados${NC}"
  echo -e "${GREEN}✅ Repositorio seguro según escaneo básico${NC}"
  exit 0
else
  echo -e "${RED}❌ Archivos sensibles encontrados: $found_sensitive${NC}"
  echo -e "${YELLOW}⚠️  Patrones sospechosos encontrados: $found_patterns${NC}"
  echo -e "${YELLOW}💡 Revisa manualmente los archivos marcados${NC}"
  exit 1
fi
