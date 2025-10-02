#!/bin/bash
# tools/simple-path-fixer.sh
# Herramienta simple para detectar y arreglar problemas de pathing

set -euo pipefail

echo "🔧 StartKit QuanNex - Simple Path Fixer"
echo "======================================="

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

# Función para encontrar archivos con imports rotos
find_broken_imports() {
    log "Buscando archivos con imports rotos..."
    
    local broken_files=()
    
    # Buscar archivos JavaScript
    while IFS= read -r file; do
        if grep -q "import.*from.*['\"]" "$file"; then
            # Verificar si algún import apunta a archivo inexistente
            while IFS= read -r line; do
                if [[ $line =~ import.*from.*[\'\"]([^\'\"]+)[\'\"] ]]; then
                    local import_path="${BASH_REMATCH[1]}"
                    
                    # Resolver path relativo
                    local file_dir=$(dirname "$file")
                    local resolved_path=""
                    
                    if [[ $import_path =~ ^\.\.?/ ]]; then
                        resolved_path="$file_dir/$import_path"
                    elif [[ $import_path =~ ^[^./] ]]; then
                        # Path absoluto desde node_modules - asumir que existe
                        continue
                    else
                        resolved_path="$import_path"
                    fi
                    
                    # Verificar si el archivo existe
                    if [[ -n "$resolved_path" && ! -f "$resolved_path" && ! -d "$resolved_path" ]]; then
                        broken_files+=("$file")
                        echo "  ❌ $file: import '$import_path' no encontrado"
                        break
                    fi
                fi
            done < "$file"
        fi
    done < <(find . -name "*.js" -type f -not -path "./node_modules/*" -not -path "./.git/*")
    
    echo "${broken_files[@]}"
}

# Función para arreglar imports específicos
fix_specific_imports() {
    local file="$1"
    
    log "Arreglando imports en $file..."
    
    # Patrones comunes de imports rotos
    sed -i.bak 's|from '\''../../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.bak 's|from '\''../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.bak 's|from '\''./contracts/|from '\''../../shared/contracts/|g' "$file"
    
    sed -i.bak 's|from '\''../../orchestration/|from '\''./|g' "$file"
    sed -i.bak 's|from '\''../orchestration/|from '\''./|g' "$file"
    sed -i.bak 's|from '\''./orchestration/|from '\''./|g' "$file"
    
    sed -i.bak 's|from '\''../../agents/|from '\''./|g' "$file"
    sed -i.bak 's|from '\''../agents/|from '\''./|g' "$file"
    sed -i.bak 's|from '\''./agents/|from '\''./|g' "$file"
    
    # Limpiar archivos .bak
    rm -f "$file.bak"
    success "Imports arreglados en $file"
}

# Función principal
main() {
    local command="${1:-validate}"
    
    case "$command" in
        "validate")
            log "Validando pathing..."
            local broken_files=($(find_broken_imports))
            
            if [ ${#broken_files[@]} -eq 0 ]; then
                success "Todos los imports están correctos"
                exit 0
            else
                error "Se encontraron ${#broken_files[@]} archivos con imports rotos"
                exit 1
            fi
            ;;
        "fix")
            log "Arreglando pathing..."
            local broken_files=($(find_broken_imports))
            
            if [ ${#broken_files[@]} -eq 0 ]; then
                success "No hay imports rotos que arreglar"
                exit 0
            fi
            
            for file in "${broken_files[@]}"; do
                fix_specific_imports "$file"
            done
            
            success "Se arreglaron ${#broken_files[@]} archivos"
            ;;
        "help")
            echo "Uso: $0 [comando]"
            echo ""
            echo "Comandos:"
            echo "  validate - Validar que todos los imports estén correctos"
            echo "  fix      - Arreglar automáticamente problemas de pathing"
            echo "  help     - Mostrar esta ayuda"
            ;;
        *)
            error "Comando desconocido: $command"
            echo "Usa '$0 help' para ver los comandos disponibles"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
