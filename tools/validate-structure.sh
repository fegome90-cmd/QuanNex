#!/bin/bash
# tools/validate-structure.sh
# Valida que la estructura del proyecto se mantenga limpia

set -euo pipefail

echo "🔍 Validando estructura StartKit QuanNex..."

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VIOLATIONS=0

# Función para reportar violaciones
violation() {
    echo -e "${RED}❌ VIOLACIÓN:${NC} $1"
    ((VIOLATIONS++))
}

warning() {
    echo -e "${YELLOW}⚠️  ADVERTENCIA:${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

# 1. Verificar que no hay archivos sueltos en raíz (excepto los permitidos)
echo "📁 Verificando archivos en raíz..."
ALLOWED_ROOT_FILES=(
    "orchestrator.js"
    "claude-project-init.sh"
    "package.json"
    "package-lock.json"
    "README.md"
    "CHANGELOG.md"
    "MANUAL-COMPLETO-CURSOR.md"
    "README-ORGANIZATION.md"
    "QUICKSTART.md"
    "USAGE.md"
    "SECURITY.md"
    ".gitignore"
    ".mcp.json"
    ".cursor"
    "Makefile"
    "VERSION"
    "Dockerfile.example"
)

for file in *; do
    if [ -f "$file" ]; then
        if [[ ! " ${ALLOWED_ROOT_FILES[@]} " =~ " ${file} " ]]; then
            violation "Archivo '$file' en raíz no está en la lista permitida"
        fi
    fi
done

# 2. Verificar que no hay archivos .js sueltos en raíz
echo "📁 Verificando archivos .js en raíz..."
for file in *.js; do
    if [ -f "$file" ] && [ "$file" != "orchestrator.js" ]; then
        violation "Archivo '$file' debería estar en versions/ o shared/"
    fi
done

# 3. Verificar que no hay archivos .mjs sueltos en raíz
echo "📁 Verificando archivos .mjs en raíz..."
for file in *.mjs; do
    if [ -f "$file" ]; then
        violation "Archivo '$file' debería estar en tools/scripts/"
    fi
done

# 4. Verificar que no hay archivos .sh sueltos en raíz
echo "📁 Verificando archivos .sh en raíz..."
for file in *.sh; do
    if [ -f "$file" ] && [ "$file" != "claude-project-init.sh" ]; then
        violation "Archivo '$file' debería estar en tools/scripts/"
    fi
done

# 5. Verificar que no hay archivos .md sueltos en raíz (excepto los permitidos)
echo "📁 Verificando archivos .md en raíz..."
ALLOWED_MD_FILES=(
    "README.md"
    "CHANGELOG.md"
    "MANUAL-COMPLETO-CURSOR.md"
    "README-ORGANIZATION.md"
    "QUICKSTART.md"
    "USAGE.md"
    "SECURITY.md"
    "ROADMAP.yaml"
)

for file in *.md; do
    if [ -f "$file" ]; then
        if [[ ! " ${ALLOWED_MD_FILES[@]} " =~ " ${file} " ]]; then
            violation "Archivo '$file' debería estar en docs/"
        fi
    fi
done

# 6. Verificar que no hay archivos .json sueltos en raíz (excepto los permitidos)
echo "📁 Verificando archivos .json en raíz..."
ALLOWED_JSON_FILES=(
    "package.json"
    "package-lock.json"
)

for file in *.json; do
    if [ -f "$file" ]; then
        if [[ ! " ${ALLOWED_JSON_FILES[@]} " =~ " ${file} " ]]; then
            violation "Archivo '$file' debería estar en versions/ o shared/"
        fi
    fi
done

# 7. Verificar que no hay directorios sueltos en raíz (excepto los permitidos)
echo "📁 Verificando directorios en raíz..."
ALLOWED_DIRS=(
    ".claude"
    ".cursor"
    ".git"
    ".githooks"
    ".github"
    ".quannex"
    ".reports"
    "agents"
    "archived"
    "artifacts"
    "backups"
    "contracts"
    "core"
    "coverage"
    "data"
    "docs"
    "examples"
    "experiments"
    "external"
    "logs"
    "metrics"
    "migration"
    "node_modules"
    "ops"
    "orchestration"
    "out"
    "payloads"
    "plans"
    "policies"
    "reports"
    "schemas"
    "scripts"
    "shared"
    "taskspecs"
    "templates"
    "test-files"
    "tests"
    "tmp"
    "tools"
    "versions"
)

for dir in */; do
    dir_name="${dir%/}"
    if [[ ! " ${ALLOWED_DIRS[@]} " =~ " ${dir_name} " ]]; then
        violation "Directorio '$dir_name' no está en la lista permitida"
    fi
done

# 8. Verificar que versions/ tiene la estructura correcta
echo "📁 Verificando estructura de versions/..."
if [ -d "versions" ]; then
    for version in v1 v2 v3 latest; do
        if [ ! -d "versions/$version" ]; then
            violation "Falta directorio versions/$version"
        fi
    done
    
    if [ ! -f "versions/manifest.json" ]; then
        violation "Falta versions/manifest.json"
    fi
else
    violation "Falta directorio versions/"
fi

# 9. Verificar que shared/ tiene la estructura correcta
echo "📁 Verificando estructura de shared/..."
if [ -d "shared" ]; then
    for subdir in contracts utils types constants; do
        if [ ! -d "shared/$subdir" ]; then
            violation "Falta directorio shared/$subdir"
        fi
    done
else
    violation "Falta directorio shared/"
fi

# 10. Verificar que tools/ tiene la estructura correcta
echo "📁 Verificando estructura de tools/..."
if [ -d "tools" ]; then
    for subdir in scripts organizers validators generators; do
        if [ ! -d "tools/$subdir" ]; then
            warning "Falta directorio tools/$subdir (opcional)"
        fi
    done
else
    violation "Falta directorio tools/"
fi

# 11. Verificar que no hay archivos duplicados entre versions/ y raíz
echo "📁 Verificando duplicados entre versions/ y raíz..."
for version in v1 v2 v3; do
    if [ -d "versions/$version" ]; then
        for file in versions/$version/*; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                if [ -f "$filename" ]; then
                    violation "Archivo '$filename' duplicado en raíz y versions/$version"
                fi
            fi
        done
    fi
done

# Resumen final
echo ""
echo "📊 RESUMEN DE VALIDACIÓN"
echo "========================"

if [ $VIOLATIONS -eq 0 ]; then
    success "¡Estructura perfecta! No se encontraron violaciones."
    echo ""
    echo "🎯 La estructura StartKit QuanNex se mantiene limpia y organizada."
    exit 0
else
    echo -e "${RED}❌ Se encontraron $VIOLATIONS violaciones estructurales.${NC}"
    echo ""
    echo "🔧 Para corregir:"
    echo "  1. Mueve archivos a sus ubicaciones correctas"
    echo "  2. Usa ./tools/organize-project.sh para reorganizar"
    echo "  3. Ejecuta este script nuevamente para validar"
    exit 1
fi
