#!/bin/bash

# =====================================================
# Script de Verificación de Dependencias RAG
# =====================================================

set -e

echo "🔍 Verificando dependencias del sistema RAG..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Función para verificar comando
check_command() {
    local cmd=$1
    local name=$2
    local required=${3:-true}
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if command -v "$cmd" &> /dev/null; then
        local version
        case $cmd in
            node) version=$(node --version) ;;
            npm) version=$(npm --version) ;;
            docker) version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1) ;;
            docker-compose) version=$(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1) ;;
            python3) version=$(python3 --version | cut -d' ' -f2) ;;
            pip3) version=$(pip3 --version | cut -d' ' -f2) ;;
            rg) version=$(rg --version | head -n1 | cut -d' ' -f2) ;;
            fd) version=$(fd --version | cut -d' ' -f2) ;;
            jq) version=$(jq --version | cut -d' ' -f2) ;;
            yq) version=$(yq --version | cut -d' ' -f2) ;;
            curl) version=$(curl --version | head -n1 | cut -d' ' -f2) ;;
            envsubst) version=$(envsubst --version | head -n1 | cut -d' ' -f4) ;;
            *) version="installed" ;;
        esac
        echo -e "✅ ${GREEN}$name${NC}: $version"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        if [ "$required" = "true" ]; then
            echo -e "❌ ${RED}$name${NC}: NO INSTALADO"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "⚠️  ${YELLOW}$name${NC}: NO INSTALADO (opcional)"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
    fi
}

# Función para verificar versión mínima
check_version() {
    local cmd=$1
    local name=$2
    local min_version=$3
    
    if command -v "$cmd" &> /dev/null; then
        local current_version
        case $cmd in
            node) current_version=$(node --version | sed 's/v//') ;;
            npm) current_version=$(npm --version) ;;
            docker) current_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1) ;;
            python3) current_version=$(python3 --version | cut -d' ' -f2) ;;
            *) current_version="unknown" ;;
        esac
        
        if [ "$current_version" != "unknown" ]; then
            if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" = "$min_version" ]; then
                echo -e "✅ ${GREEN}$name${NC}: $current_version (>= $min_version)"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                echo -e "❌ ${RED}$name${NC}: $current_version (requiere >= $min_version)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
            fi
        else
            echo -e "⚠️  ${YELLOW}$name${NC}: versión desconocida"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
    else
        echo -e "❌ ${RED}$name${NC}: NO INSTALADO"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

# Función para verificar Python packages
check_python_package() {
    local package=$1
    local name=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "venv-rag/bin/activate" ]; then
        if source venv-rag/bin/activate && python -c "import $package" &> /dev/null; then
            echo -e "✅ ${GREEN}$name${NC}: instalado en venv-rag"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            echo -e "❌ ${RED}$name${NC}: NO instalado en venv-rag"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    else
        echo -e "❌ ${RED}venv-rag${NC}: entorno virtual no encontrado"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Función para verificar Node.js packages
check_npm_package() {
    local package=$1
    local name=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "package.json" ]; then
        if npm list "$package" &> /dev/null; then
            echo -e "✅ ${GREEN}$name${NC}: instalado"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            echo -e "❌ ${RED}$name${NC}: NO instalado"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    else
        echo -e "❌ ${RED}package.json${NC}: no encontrado"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

echo -e "\n${BLUE}🧰 BASE DEL SISTEMA${NC}"
echo "=================="

check_version "node" "Node.js" "20.0.0"
check_command "npm" "npm"
check_command "docker" "Docker"
check_command "docker-compose" "Docker Compose"
check_version "python3" "Python 3" "3.11.0"

echo -e "\n${BLUE}🛠️  UTILIDADES${NC}"
echo "=============="

check_command "rg" "ripgrep"
check_command "fd" "fd"
check_command "jq" "jq"
check_command "yq" "yq"
check_command "curl" "curl"
check_command "envsubst" "envsubst"

echo -e "\n${BLUE}🐍 PYTHON PACKAGES${NC}"
echo "=================="

check_python_package "tiktoken" "tiktoken"
check_python_package "nltk" "nltk"
check_python_package "spacy" "spacy"

echo -e "\n${BLUE}📦 NODE.JS PACKAGES${NC}"
echo "===================="

check_npm_package "openai" "OpenAI SDK"
check_npm_package "@qdrant/js-client-rest" "Qdrant Client"
check_npm_package "tiktoken" "tiktoken (Node.js)"
check_npm_package "markdown-it" "markdown-it"
check_npm_package "cheerio" "cheerio"
check_npm_package "zod" "zod"

echo -e "\n${BLUE}📁 ARCHIVOS DE CONFIGURACIÓN${NC}"
echo "=============================="

# Verificar archivos de configuración
files_to_check=(
    "docker-compose.rag.yml:Docker Compose RAG"
    "env.rag.example:Variables de entorno ejemplo"
    "PRP.lock:PRP Lock file"
    "config/rag.yaml:Configuración RAG"
    "schema/01-init-rag.sql:Esquema de base de datos"
    "config/prometheus.yml:Configuración Prometheus"
    "config/prometheus-alerts-rag.yml:Alertas Prometheus"
)

for file_info in "${files_to_check[@]}"; do
    IFS=':' read -r file desc <<< "$file_info"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "$file" ]; then
        echo -e "✅ ${GREEN}$desc${NC}: $file"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "❌ ${RED}$desc${NC}: $file NO ENCONTRADO"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
done

echo -e "\n${BLUE}📊 RESUMEN${NC}"
echo "=========="

echo -e "Total de verificaciones: $TOTAL_CHECKS"
echo -e "${GREEN}✅ Pasaron: $PASSED_CHECKS${NC}"
echo -e "${RED}❌ Fallaron: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}⚠️  Advertencias: $WARNING_CHECKS${NC}"

echo -e "\n${BLUE}🎯 ESTADO GENERAL${NC}"
echo "==============="

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todas las dependencias están listas!${NC}"
    echo -e "Puedes continuar con la configuración de los datastores."
    exit 0
elif [ $FAILED_CHECKS -le 2 ]; then
    echo -e "${YELLOW}⚠️  Casi listo. Hay $FAILED_CHECKS dependencias faltantes.${NC}"
    echo -e "Revisa los errores arriba e instala las dependencias faltantes."
    exit 1
else
    echo -e "${RED}❌ Hay $FAILED_CHECKS dependencias faltantes.${NC}"
    echo -e "Instala las dependencias faltantes antes de continuar."
    exit 1
fi
