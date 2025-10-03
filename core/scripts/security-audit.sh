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
AUDIT_JSON_FILE="${REPORT_DIR}/npm-audit-${TIMESTAMP}.json"
NPM_REGISTRY_URL="https://registry.npmjs.org"
NETWORK_TIMEOUT="${NETWORK_TIMEOUT:-5}"
AUDIT_FAILURE=0

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

check_network() {
  if ! command -v curl >/dev/null 2>&1; then
    warning "curl no disponible para comprobar conectividad; continuando"
    return 0
  fi

  if curl -sSfL "$NPM_REGISTRY_URL" -o /dev/null --max-time "$NETWORK_TIMEOUT"; then
    return 0
  fi

  return 1
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

  local temp_file
  temp_file=$(mktemp)
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
  local temp_file
  temp_file=$(mktemp)
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

  if [[ -f "${PROJECT_DIR}/package.json" ]]; then
    if ! check_network; then
      warning "Sin salida a Internet hacia $NPM_REGISTRY_URL. Saltando npm audit."
      echo "::warning::Sin salida a Internet. Saltando npm audit sin bloquear CI." >&2
      return
    fi

    pushd "$PROJECT_DIR" >/dev/null

    local audit_status=0

    set +e
    npm audit --json --audit-level=moderate | tee "$AUDIT_JSON_FILE" >/dev/null
    audit_status=$?
    set -e

    popd >/dev/null

    if [[ $audit_status -gt 1 ]]; then
      error "npm audit falló con código $audit_status"
      AUDIT_FAILURE=1
      return
    fi

    if [[ ! -s "$AUDIT_JSON_FILE" ]]; then
      warning "Archivo de reporte npm audit vacío"
      return
    fi

    if [[ $audit_status -eq 0 ]]; then
      success "npm audit completado sin vulnerabilidades moderadas"
    else
      warning "npm audit reportó vulnerabilidades moderadas o críticas"
    fi

    if ! jq -e '.' "$AUDIT_JSON_FILE" >/dev/null 2>&1; then
      error "El reporte de npm audit no es JSON válido"
      AUDIT_FAILURE=1
      return
    fi

    local vulnerabilities
    vulnerabilities=$(jq -r '.vulnerabilities | keys[]' "$AUDIT_JSON_FILE" 2>/dev/null || echo "")

    if [[ -n $vulnerabilities ]]; then
      while IFS= read -r vuln; do
        local severity
        severity=$(jq -r ".vulnerabilities[\"$vuln\"].severity" "$AUDIT_JSON_FILE" 2>/dev/null || echo "unknown")
        local description
        description=$(jq -r ".vulnerabilities[\"$vuln\"].title" "$AUDIT_JSON_FILE" 2>/dev/null || echo "Vulnerability in $vuln")

        add_vulnerability "$severity" "dependency" "$description" "package.json" "0" "Update dependency to latest secure version"
        update_summary "$severity"
      done <<<"$vulnerabilities"
    fi

    local moderate_plus
    moderate_plus=$(jq '(.metadata.vulnerabilities.moderate // 0) + (.metadata.vulnerabilities.high // 0) + (.metadata.vulnerabilities.critical // 0)' "$AUDIT_JSON_FILE" 2>/dev/null || echo "0")

    if (( moderate_plus > 0 )); then
      AUDIT_FAILURE=1
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
  local temp_file
  temp_file=$(mktemp)
  jq --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '.audit_completed = $timestamp' \
    "$REPORT_FILE" >"$temp_file" && mv "$temp_file" "$REPORT_FILE"

  # Mostrar resumen
  local total
  total=$(jq -r '.summary.total_vulnerabilities' "$REPORT_FILE")
  local critical
  critical=$(jq -r '.summary.critical' "$REPORT_FILE")
  local high
  high=$(jq -r '.summary.high' "$REPORT_FILE")
  local medium
  medium=$(jq -r '.summary.medium' "$REPORT_FILE")
  local low
  low=$(jq -r '.summary.low' "$REPORT_FILE")

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
  local report_status=0
  if ! generate_final_report; then
    report_status=1
  fi

  if (( AUDIT_FAILURE > 0 )); then
    exit 1
  fi

  exit $report_status
}

# Ejecutar función principal
main "$@"
