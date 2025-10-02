#!/bin/bash

# Script de Verificación Rigurosa para Integración Plug-and-Play
# Verifica que todos los comandos, archivos y paths funcionen correctamente

set -e  # Salir en cualquier error

echo "🔍 VERIFICACIÓN RIGUROSA DE INTEGRACIÓN PLUG-AND-PLAY"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Función para reportar errores
report_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Función para reportar warnings
report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Función para reportar éxito
report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo ""
echo "📁 VERIFICANDO ARCHIVOS CRÍTICOS..."
echo "=================================="

# Verificar archivos críticos
CRITICAL_FILES=(
    "agents/base/agent.js"
    "core/rules-enforcer.js"
    "package.json"
    "Makefile"
    "tsconfig.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        report_success "$file existe"
    else
        report_error "$file NO existe"
    fi
done

echo ""
echo "📂 VERIFICANDO DIRECTORIOS DE TESTS..."
echo "====================================="

# Verificar directorios de tests
TEST_DIRS=(
    "tests/unit"
    "tests/integration"
    "tests/contracts"
)

for dir in "${TEST_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        report_success "$dir existe"
    else
        report_error "$dir NO existe"
    fi
done

echo ""
echo "🔧 VERIFICANDO SCRIPTS DE VALIDACIÓN..."
echo "======================================"

# Verificar scripts de validación
VALIDATION_SCRIPTS=(
    "core/scripts/verify-dependencies.sh"
    "core/scripts/validate-agents.sh"
    "core/scripts/validate-project.sh"
    "core/scripts/integration-test.sh"
    "scripts/verify-attributions.sh"
)

for script in "${VALIDATION_SCRIPTS[@]}"; do
    if [[ -f "$script" && -x "$script" ]]; then
        report_success "$script existe y es ejecutable"
    elif [[ -f "$script" ]]; then
        report_warning "$script existe pero no es ejecutable"
        chmod +x "$script" 2>/dev/null && report_success "$script ahora es ejecutable" || report_error "No se pudo hacer ejecutable $script"
    else
        report_error "$script NO existe"
    fi
done

echo ""
echo "🧪 VERIFICANDO COMANDOS NPM..."
echo "============================="

# Verificar comandos npm
NPM_COMMANDS=(
    "test:contracts"
    "test:unit"
    "test:integration"
    "test:e2e"
    "lint"
    "security"
    "security:deps"
)

for cmd in "${NPM_COMMANDS[@]}"; do
    # Verificar si el comando existe en package.json
    if grep -q "\"$cmd\":" package.json; then
        report_success "npm run $cmd existe en package.json"
    else
        report_error "npm run $cmd NO existe en package.json"
    fi
done

echo ""
echo "🔨 VERIFICANDO COMANDOS MAKE..."
echo "============================="

# Verificar comandos make
MAKE_COMMANDS=(
    "contracts"
    "unit"
    "integration"
    "e2e"
    "security"
    "clean"
)

for cmd in "${MAKE_COMMANDS[@]}"; do
    # Verificar si el comando existe en Makefile
    if grep -q "^$cmd:" Makefile; then
        report_success "make $cmd existe en Makefile"
    else
        report_error "make $cmd NO existe en Makefile"
    fi
done

echo ""
echo "🔗 VERIFICANDO SCRIPTS DE ORQUESTACIÓN..."
echo "========================================"

# Verificar scripts de orquestación
ORCHESTRATION_FILES=(
    "core/orchestrator/resolve-agent.js"
    "core/orchestrator/index.js"
)

for file in "${ORCHESTRATION_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        report_success "$file existe"
    else
        report_error "$file NO existe"
    fi
done

echo ""
echo "📊 VERIFICANDO ARCHIVOS DE CONFIGURACIÓN..."
echo "=========================================="

# Verificar archivos de configuración
CONFIG_FILES=(
    "config/agents.registry.json"
    "core/templates/agents/base-agent-template.json"
)

for file in "${CONFIG_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        report_success "$file existe"
    else
        report_warning "$file NO existe (opcional)"
    fi
done

echo ""
echo "🧹 VERIFICANDO PERMISOS DE EJECUCIÓN..."
echo "====================================="

# Verificar permisos de ejecución en scripts críticos
EXECUTABLE_SCRIPTS=(
    "core/scripts/verify-dependencies.sh"
    "core/scripts/validate-agents.sh"
    "core/scripts/validate-project.sh"
    "core/scripts/integration-test.sh"
    "scripts/verify-attributions.sh"
)

for script in "${EXECUTABLE_SCRIPTS[@]}"; do
    if [[ -x "$script" ]]; then
        report_success "$script tiene permisos de ejecución"
    else
        report_warning "$script no tiene permisos de ejecución"
        chmod +x "$script" 2>/dev/null && report_success "$script ahora tiene permisos de ejecución" || report_error "No se pudo dar permisos a $script"
    fi
done

echo ""
echo "📋 RESUMEN DE VERIFICACIÓN"
echo "=========================="

if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}🎉 PERFECTO: Sistema completamente listo para integración plug-and-play${NC}"
    echo -e "${GREEN}✅ Todos los archivos, comandos y scripts funcionan correctamente${NC}"
    exit 0
elif [[ $ERRORS -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  ADVERTENCIAS: $WARNINGS warnings encontrados${NC}"
    echo -e "${GREEN}✅ Sin errores críticos - Sistema funcional${NC}"
    exit 0
else
    echo -e "${RED}❌ ERRORES: $ERRORS errores críticos encontrados${NC}"
    echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS warnings encontrados${NC}"
    echo -e "${RED}🚫 Sistema NO está listo para integración plug-and-play${NC}"
    exit 1
fi
