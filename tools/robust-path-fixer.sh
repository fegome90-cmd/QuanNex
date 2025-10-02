#!/bin/bash
# tools/robust-path-fixer.sh
# Herramienta robusta para detectar y arreglar problemas de pathing

set -euo pipefail

echo "🔧 StartKit QuanNex - Robust Path Fixer"
echo "======================================="

# Función para encontrar archivos con imports rotos
find_broken_imports() {
    echo "Buscando archivos con imports rotos..."
    
    local broken_files=()
    
    # Buscar archivos JavaScript
    while IFS= read -r file; do
        if grep -q "import.*from.*['\"]" "$file" 2>/dev/null; then
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
    
    printf '%s\n' "${broken_files[@]}"
}

# Función para arreglar imports específicos
fix_specific_imports() {
    local file="$1"
    
    echo "Arreglando imports en $file..."
    
    # Crear backup
    cp "$file" "$file.backup"
    
    # Patrones comunes de imports rotos
    sed -i.tmp 's|from '\''../../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.tmp 's|from '\''../contracts/|from '\''../../shared/contracts/|g' "$file"
    sed -i.tmp 's|from '\''./contracts/|from '\''../../shared/contracts/|g' "$file"
    
    sed -i.tmp 's|from '\''../../orchestration/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''../orchestration/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''./orchestration/|from '\''./|g' "$file"
    
    sed -i.tmp 's|from '\''../../agents/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''../agents/|from '\''./|g' "$file"
    sed -i.tmp 's|from '\''./agents/|from '\''./|g' "$file"
    
    # Limpiar archivos temporales
    rm -f "$file.tmp"
    echo "  ✅ Imports arreglados en $file"
}

# Función principal
main() {
    local command="${1:-validate}"
    
    case "$command" in
        "validate")
            echo "Validando pathing..."
            local broken_files=($(find_broken_imports))
            
            if [ ${#broken_files[@]} -eq 0 ]; then
                echo "✅ Todos los imports están correctos"
                exit 0
            else
                echo "❌ Se encontraron ${#broken_files[@]} archivos con imports rotos"
                exit 1
            fi
            ;;
        "fix")
            echo "Arreglando pathing..."
            local broken_files=($(find_broken_imports))
            
            if [ ${#broken_files[@]} -eq 0 ]; then
                echo "✅ No hay imports rotos que arreglar"
                exit 0
            fi
            
            for file in "${broken_files[@]}"; do
                fix_specific_imports "$file"
            done
            
            echo "✅ Se arreglaron ${#broken_files[@]} archivos"
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
            echo "❌ Comando desconocido: $command"
            echo "Usa '$0 help' para ver los comandos disponibles"
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
