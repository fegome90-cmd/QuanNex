#!/bin/bash
# QNX-BUG-001: Script seguro para ejecutar npm audit
# Corrige problemas de rutas mal calculadas y sanitización

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
  echo -e "${BLUE}[Secure npm audit]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# QNX-BUG-001: Función para sanitizar rutas
sanitize_path() {
  local path="$1"
  
  # Eliminar caracteres peligrosos
  path=$(echo "$path" | sed 's/[;&|`$(){}[\]<>]/_/g')
  
  # Eliminar rutas relativas peligrosas
  path=$(echo "$path" | sed 's/\.\./_/g')
  
  # Eliminar espacios y caracteres especiales
  path=$(echo "$path" | tr -d ' \t\n\r')
  
  # Validar que la ruta sea segura
  if [[ "$path" =~ ^[a-zA-Z0-9_./-]+$ ]]; then
    echo "$path"
  else
    error "Ruta no segura detectada: $path"
    return 1
  fi
}

# QNX-BUG-001: Función para encontrar package.json de forma segura
find_package_json() {
  local start_dir="${1:-.}"
  local current_dir
  
  # Sanitizar directorio de inicio
  start_dir=$(sanitize_path "$start_dir")
  
  current_dir="$start_dir"
  
  # Buscar package.json hacia arriba en el árbol de directorios
  while [[ "$current_dir" != "/" && "$current_dir" != "." ]]; do
    if [[ -f "$current_dir/package.json" ]]; then
      echo "$current_dir"
      return 0
    fi
    current_dir=$(dirname "$current_dir")
  done
  
  # Si no se encuentra, buscar en el directorio actual
  if [[ -f "package.json" ]]; then
    echo "."
    return 0
  fi
  
  return 1
}

# QNX-BUG-001: Función segura para ejecutar npm audit
secure_npm_audit() {
  local target_dir="${1:-.}"
  local output_file="${2:-npm-audit.json}"
  local error_file="${3:-npm-audit-errors.log}"
  
  log "Iniciando auditoría segura de npm..."
  
  # Sanitizar parámetros
  target_dir=$(sanitize_path "$target_dir")
  output_file=$(sanitize_path "$output_file")
  error_file=$(sanitize_path "$error_file")
  
  # Encontrar directorio con package.json
  local package_dir
  if package_dir=$(find_package_json "$target_dir"); then
    log "package.json encontrado en: $package_dir"
  else
    error "No se encontró package.json en $target_dir ni en directorios padre"
    return 1
  fi
  
  # Cambiar al directorio con package.json
  cd "$package_dir" || {
    error "No se pudo cambiar al directorio: $package_dir"
    return 1
  }
  
  # Verificar que npm esté disponible
  if ! command -v npm >/dev/null 2>&1; then
    error "npm no está disponible en el sistema"
    return 1
  fi
  
  # Ejecutar npm audit sin suprimir errores
  log "Ejecutando npm audit en: $(pwd)"
  if npm audit --audit-level=moderate --json >"$output_file" 2>"$error_file"; then
    success "npm audit completado exitosamente"
    
    # Verificar si hay errores en el log
    if [[ -s "$error_file" ]]; then
      warning "npm audit generó advertencias:"
      cat "$error_file"
    fi
    
    return 0
  else
    warning "npm audit encontró vulnerabilidades"
    
    # Mostrar errores para trazabilidad
    if [[ -s "$error_file" ]]; then
      error "Errores de npm audit:"
      cat "$error_file" >&2
    fi
    
    return 1
  fi
}

# Función principal
main() {
  local target_dir="${1:-.}"
  local output_file="${2:-npm-audit.json}"
  local error_file="${3:-npm-audit-errors.log}"
  
  log "Iniciando auditoría segura de npm..."
  log "Directorio objetivo: $target_dir"
  log "Archivo de salida: $output_file"
  log "Archivo de errores: $error_file"
  
  if secure_npm_audit "$target_dir" "$output_file" "$error_file"; then
    success "✅ Auditoría de npm completada exitosamente"
    exit 0
  else
    error "❌ Auditoría de npm falló"
    exit 1
  fi
}

# Ejecutar función principal si se llama directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
