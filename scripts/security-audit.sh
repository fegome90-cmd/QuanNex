#!/bin/bash

# Security Auditor Script
# Realiza auditorías de seguridad completas del proyecto

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"  # Unused variable
PROJECT_DIR="${1:-$(pwd)}"
REPORT_DIR="${PROJECT_DIR}/security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${REPORT_DIR}/security-audit-${TIMESTAMP}.json"

# Función de logging
log() {
  echo -e "${BLUE}[SECURITY-AUDIT]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Crear directorio de reportes
mkdir -p "$REPORT_DIR"

# Inicializar reporte JSON
init_report() {
  cat >"$REPORT_FILE" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project_dir": "$PROJECT_DIR",
  "auditor": "security-auditor",
  "vulnerabilities": [],
  "compliance": {},
  "summary": {
    "total_vulnerabilities": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "info": 0
  }
}
EOF
}

# Función para agregar vulnerabilidad al reporte
add_vulnerability() {
  local severity="$1"
  local type="$2"
  local description="$3"
  local file="$4"
  local line="$5"
  local recommendation="$6"

  local temp_file=$(mktemp)
  jq --arg severity "$severity" \
    --arg type "$type" \
    --arg description "$description" \
    --arg file "$file" \
    --arg line "$line" \
    --arg recommendation "$recommendation" \
    '.vulnerabilities += [{
         "severity": $severity,
         "type": $type,
         "description": $description,
         "file": $file,
         "line": $line,
         "recommendation": $recommendation
       }]' "$REPORT_FILE" >"$temp_file" && mv "$temp_file" "$REPORT_FILE"
}

# Función para actualizar resumen
update_summary() {
  local temp_file=$(mktemp)
  jq --arg severity "$1" \
    '.summary[$severity] += 1 | .summary.total_vulnerabilities += 1' \
    "$REPORT_FILE" >"$temp_file" && mv "$temp_file" "$REPORT_FILE"
}

# Verificar dependencias
check_dependencies() {
  log "Verificando dependencias..."

  local missing_deps=()

  # Verificar herramientas de seguridad
  command -v npm >/dev/null 2>&1 || missing_deps+=("npm")
  command -v jq >/dev/null 2>&1 || missing_deps+=("jq")

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    error "Dependencias faltantes: ${missing_deps[*]}"
    return 1
  fi

  success "Dependencias verificadas"
  return 0
}

# Auditoría de dependencias npm
audit_npm_dependencies() {
  log "Auditando dependencias npm..."

  # QNX-BUG-001: Usar script seguro para npm audit
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  
  if [[ -f "$script_dir/secure-npm-audit.sh" ]]; then
    log "Usando script seguro de npm audit..."
    if bash "$script_dir/secure-npm-audit.sh" "$PROJECT_DIR" "${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" "${REPORT_DIR}/npm-audit-errors-${TIMESTAMP}.log"; then
      success "npm audit completado"
    else
      warning "npm audit encontró vulnerabilidades"
    fi
  else
    # Fallback al método anterior si el script seguro no está disponible
    warning "Script seguro no encontrado, usando método fallback"
    if [[ -f "${PROJECT_DIR}/package.json" ]]; then
      cd "$PROJECT_DIR"

      # QNX-SEC-002: Ejecutar npm audit sin suprimir errores
      if npm audit --json >"${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" 2>"${REPORT_DIR}/npm-audit-errors-${TIMESTAMP}.log"; then
        success "npm audit completado"
        # Verificar si hay errores en el log
        if [[ -s "${REPORT_DIR}/npm-audit-errors-${TIMESTAMP}.log" ]]; then
          warning "npm audit generó advertencias (ver ${REPORT_DIR}/npm-audit-errors-${TIMESTAMP}.log)"
        fi
      else
        warning "npm audit encontró vulnerabilidades"
        # Mostrar errores para trazabilidad
        if [[ -s "${REPORT_DIR}/npm-audit-errors-${TIMESTAMP}.log" ]]; then
          error "Errores de npm audit:"
          cat "${REPORT_DIR}/npm-audit-errors-${TIMESTAMP}.log" >&2
        fi
      fi
    else
      warning "package.json no encontrado en ${PROJECT_DIR}, saltando auditoría de dependencias npm"
    fi
  fi

    # Procesar resultados
    if [[ -f "${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" ]]; then
      local vulnerabilities=$(jq -r '.vulnerabilities | keys[]' "${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" 2>/dev/null || echo "")

      if [[ -n $vulnerabilities ]]; then
        while IFS= read -r vuln; do
          local severity=$(jq -r ".vulnerabilities[\"$vuln\"].severity" "${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" 2>/dev/null || echo "unknown")
          local description=$(jq -r ".vulnerabilities[\"$vuln\"].title" "${REPORT_DIR}/npm-audit-${TIMESTAMP}.json" 2>/dev/null || echo "Vulnerability in $vuln")

          add_vulnerability "$severity" "dependency" "$description" "package.json" "0" "Update dependency to latest secure version"
          update_summary "$severity"
        done <<<"$vulnerabilities"
      fi
    fi
  else
    warning "package.json no encontrado, saltando auditoría de dependencias npm"
  fi
}

# Auditoría de archivos de configuración
audit_config_files() {
  log "Auditando archivos de configuración..."

  # Verificar archivos .env
  find "$PROJECT_DIR" -name ".env*" -type f | while read -r env_file; do
    if grep -q "password\|secret\|key\|token" "$env_file" 2>/dev/null; then
      warning "Archivo $env_file contiene posibles credenciales"
      add_vulnerability "medium" "configuration" "Possible credentials in environment file" "$env_file" "0" "Review and secure environment variables"
      update_summary "medium"
    fi
  done

  # Verificar archivos de configuración Docker
  find "$PROJECT_DIR" -name "Dockerfile*" -o -name "docker-compose*.yml" | while read -r docker_file; do
    if grep -q "root\|sudo\|chmod 777" "$docker_file" 2>/dev/null; then
      warning "Archivo $docker_file tiene configuraciones inseguras"
      add_vulnerability "high" "configuration" "Insecure Docker configuration" "$docker_file" "0" "Review Docker security best practices"
      update_summary "high"
    fi
  done

  success "Auditoría de configuración completada"
}

# Auditoría de código fuente
audit_source_code() {
  log "Auditando código fuente..."

  # Verificar patrones de seguridad comunes
  local patterns=(
    "eval("
    "exec("
    "system("
    "shell_exec("
    "passthru("
    "file_get_contents("
    "fopen("
    "include("
    "require("
  )

  for pattern in "${patterns[@]}"; do
    find "$PROJECT_DIR" -type f \( -name "*.js" -o -name "*.php" -o -name "*.py" -o -name "*.rb" \) \
      -exec grep -l "$pattern" {} \; 2>/dev/null | while read -r file; do
      warning "Archivo $file contiene patrón potencialmente inseguro: $pattern"
      add_vulnerability "medium" "code" "Potentially unsafe function usage: $pattern" "$file" "0" "Review function usage for security implications"
      update_summary "medium"
    done
  done

  success "Auditoría de código fuente completada"
}

# Generar reporte final
generate_final_report() {
  log "Generando reporte final..."

  # Actualizar timestamp final
  local temp_file=$(mktemp)
  jq --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '.audit_completed = $timestamp' \
    "$REPORT_FILE" >"$temp_file" && mv "$temp_file" "$REPORT_FILE"

  # Mostrar resumen
  local total=$(jq -r '.summary.total_vulnerabilities' "$REPORT_FILE")
  local critical=$(jq -r '.summary.critical' "$REPORT_FILE")
  local high=$(jq -r '.summary.high' "$REJECT_FILE")
  local medium=$(jq -r '.summary.medium' "$REPORT_FILE")
  local low=$(jq -r '.summary.low' "$REPORT_FILE")

  echo ""
  echo "=========================================="
  echo "🔒 SECURITY AUDIT SUMMARY"
  echo "=========================================="
  echo "Total Vulnerabilities: $total"
  echo "Critical: $critical"
  echo "High: $high"
  echo "Medium: $medium"
  echo "Low: $low"
  echo "=========================================="
  echo "Reporte guardado en: $REPORT_FILE"
  echo "=========================================="

  if [[ $critical -gt 0 || $high -gt 0 ]]; then
    error "Se encontraron vulnerabilidades críticas o altas"
    return 1
  else
    success "Auditoría de seguridad completada"
    return 0
  fi
}

# Función principal
main() {
  log "Iniciando auditoría de seguridad..."
  log "Proyecto: $PROJECT_DIR"
  log "Reporte: $REPORT_FILE"

  # Inicializar reporte
  init_report

  # Verificar dependencias
  if ! check_dependencies; then
    error "Faltan dependencias requeridas"
    exit 1
  fi

  # Ejecutar auditorías
  audit_npm_dependencies
  audit_config_files
  audit_source_code

  # Generar reporte final
  generate_final_report
}

# Ejecutar función principal
main "$@"
