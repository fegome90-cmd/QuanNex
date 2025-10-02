#!/bin/bash
# tools/path-fixer.sh
# Herramienta para detectar y arreglar automáticamente problemas de pathing

set -euo pipefail

echo "🔧 StartKit QuanNex - Path Fixer"
echo "================================"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para logging
log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

# Función para detectar imports rotos
detect_broken_imports() {
    local file="$1"
    local broken_imports=()
    
    # Buscar imports que apunten a archivos que no existen
    while IFS= read -r line; do
        if [[ $line =~ ^import.*from\s+[\'\"]([^\'\"]+)[\'\"] ]]; then
            local import_path="${BASH_REMATCH[1]}"
            
            # Resolver path relativo
            local resolved_path
            if [[ $import_path =~ ^\.\.?/ ]]; then
                # Path relativo
                local file_dir=$(dirname "$file")
                resolved_path=$(realpath "$file_dir/$import_path" 2>/dev/null || echo "")
            elif [[ $import_path =~ ^[^./] ]]; then
                # Path absoluto desde node_modules o similar
                resolved_path="$import_path"
            else
                # Path absoluto
                resolved_path="$import_path"
            fi
            
            # Verificar si el archivo existe
            if [[ -n "$resolved_path" && ! -f "$resolved_path" && ! -d "$resolved_path" ]]; then
                broken_imports+=("$import_path")
            fi
        fi
    done < "$file"
    
    echo "${broken_imports[@]}"
}

# Función para arreglar imports rotos
fix_broken_imports() {
    local file="$1"
    local broken_imports=("${@:2}")
    
    log "Arreglando imports en $file..."
    
    for import in "${broken_imports[@]}"; do
        log "  Arreglando import: $import"
        
        # Buscar archivo en la nueva estructura
        local fixed_path=""
        
        # Buscar en versions/
        if [[ -z "$fixed_path" ]]; then
            local filename=$(basename "$import" .js)
            for version_dir in versions/*/; do
                if [ -d "$version_dir" ]; then
                    if find "$version_dir" -name "${filename}.js" -type f | head -1 | read -r found_file; then
                        fixed_path="$found_file"
                        break
                    fi
                fi
            done
        fi
        
        # Buscar en shared/
        if [[ -z "$fixed_path" ]]; then
            if find shared -name "$(basename "$import")" -type f | head -1 | read -r found_file; then
                fixed_path="$found_file"
            fi
        fi
        
        # Buscar en tools/
        if [[ -z "$fixed_path" ]]; then
            if find tools -name "$(basename "$import")" -type f | head -1 | read -r found_file; then
                fixed_path="$found_file"
            fi
        fi
        
        # Si encontramos el archivo, calcular el path relativo correcto
        if [[ -n "$fixed_path" ]]; then
            local file_dir=$(dirname "$file")
            local relative_path=$(realpath --relative-to="$file_dir" "$fixed_path" 2>/dev/null || echo "")
            
            if [[ -n "$relative_path" ]]; then
                # Reemplazar el import roto
                sed -i.bak "s|from ['\"]$import['\"]|from '$relative_path'|g" "$file"
                success "    Arreglado: $import → $relative_path"
            fi
        else
            warning "    No se pudo encontrar: $import"
        fi
    done
    
    # Limpiar archivos .bak
    rm -f "$file.bak"
}

# Función para crear mapa de archivos
create_file_map() {
    log "Creando mapa de archivos..."
    
    cat > /tmp/file_map.json << 'EOF'
{
  "versions": {},
  "shared": {},
  "tools": {}
}
EOF

    # Mapear archivos en versions/
    for version_dir in versions/*/; do
        if [ -d "$version_dir" ]; then
            local version_name=$(basename "$version_dir")
            find "$version_dir" -name "*.js" -type f | while read -r file; do
                local filename=$(basename "$file")
                echo "{\"$filename\": \"$file\"}" >> /tmp/versions_map.json
            done
        fi
    done

    # Mapear archivos en shared/
    find shared -name "*.js" -type f | while read -r file; do
        local filename=$(basename "$file")
        echo "{\"$filename\": \"$file\"}" >> /tmp/shared_map.json
    done

    # Mapear archivos en tools/
    find tools -name "*.js" -type f | while read -r file; do
        local filename=$(basename "$file")
        echo "{\"$filename\": \"$file\"}" >> /tmp/tools_map.json
    done

    success "Mapa de archivos creado"
}

# Función principal para arreglar pathing
fix_pathing() {
    log "Iniciando reparación de pathing..."
    
    local files_to_check=()
    local total_issues=0
    
    # Encontrar todos los archivos JavaScript
    while IFS= read -r file; do
        files_to_check+=("$file")
    done < <(find . -name "*.js" -type f -not -path "./node_modules/*" -not -path "./.git/*")
    
    log "Verificando ${#files_to_check[@]} archivos..."
    
    # Verificar cada archivo
    for file in "${files_to_check[@]}"; do
        local broken_imports=($(detect_broken_imports "$file"))
        
        if [ ${#broken_imports[@]} -gt 0 ]; then
            warning "Archivo con imports rotos: $file"
            for import in "${broken_imports[@]}"; do
                echo "  - $import"
                ((total_issues++))
            done
            
            # Arreglar imports
            fix_broken_imports "$file" "${broken_imports[@]}"
        fi
    done
    
    if [ $total_issues -eq 0 ]; then
        success "¡No se encontraron problemas de pathing!"
    else
        success "Se arreglaron $total_issues problemas de pathing"
    fi
}

# Función para validar pathing
validate_pathing() {
    log "Validando pathing..."
    
    local broken_files=()
    
    # Verificar todos los archivos JavaScript
    while IFS= read -r file; do
        local broken_imports=($(detect_broken_imports "$file"))
        
        if [ ${#broken_imports[@]} -gt 0 ]; then
            broken_files+=("$file")
        fi
    done < <(find . -name "*.js" -type f -not -path "./node_modules/*" -not -path "./.git/*")
    
    if [ ${#broken_files[@]} -eq 0 ]; then
        success "✅ Todos los imports están correctos"
        return 0
    else
        error "❌ Se encontraron ${#broken_files[@]} archivos con imports rotos:"
        for file in "${broken_files[@]}"; do
            echo "  - $file"
        done
        return 1
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos:"
    echo "  fix      - Arreglar automáticamente problemas de pathing"
    echo "  validate - Validar que todos los imports estén correctos"
    echo "  map      - Crear mapa de archivos"
    echo "  help     - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 fix      # Arreglar todos los imports rotos"
    echo "  $0 validate # Verificar que todo esté correcto"
}

# Función principal
main() {
    local command="${1:-help}"
    
    case "$command" in
        "fix")
            create_file_map
            fix_pathing
            ;;
        "validate")
            validate_pathing
            ;;
        "map")
            create_file_map
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"
