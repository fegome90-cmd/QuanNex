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
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REPORT_FILE="${REPORT_DIR}/security-audit-${TIMESTAMP}.json"
AUDIT_JSON_FILE="${REPORT_DIR}/npm-audit-${TIMESTAMP}.json"
NPM_REGISTRY_URL="https://registry.npmjs.org"
NETWORK_TIMEOUT="${NETWORK_TIMEOUT:-5}"
AUDIT_FAILURE=0
MAX_REPORTS=${MAX_REPORTS:-20}

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

HAS_JQ=true
if ! command -v jq >/dev/null 2>&1; then
  HAS_JQ=false
  warning "jq no está disponible; se utilizará fallback basado en node para operaciones JSON"
fi

HAS_NODE=true
if ! command -v node >/dev/null 2>&1; then
  HAS_NODE=false
fi

if [[ "$HAS_JQ" == "false" && "$HAS_NODE" == "false" ]]; then
  error "Se requiere 'jq' o 'node' para procesar reportes JSON"
  exit 1
fi

validate_json_file() {
  local path="$1"

  if [[ "$HAS_JQ" == "true" ]]; then
    jq -e '.' "$path" >/dev/null 2>&1
    return $?
  fi

  if [[ "$HAS_NODE" == "true" ]]; then
    node -e "const fs=require('fs');const data=fs.readFileSync(process.argv[1],'utf8');JSON.parse(data);" "$path" >/dev/null 2>&1
    return $?
  fi

  return 1
}

rotate_reports() {
  local dir="$1"
  local prefix="$2"
  local keep="${3:-20}"

  shopt -s nullglob
  local files=("$dir"/"$prefix"*)
  shopt -u nullglob

  if (( ${#files[@]} <= keep )); then
    return
  fi

  mapfile -t sorted < <(printf '%s\n' "${files[@]}" | sort -r)

  for ((i = keep; i < ${#sorted[@]}; i++)); do
    rm -f "${sorted[i]}"
  done
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

  if [[ "$HAS_JQ" == "true" ]]; then
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
  else
    node -e "$(cat <<'NODE'
const fs = require('fs');
const [,, reportPath, severity, type, description, file, line, recommendation] = process.argv;
const raw = fs.readFileSync(reportPath, 'utf8');
const data = JSON.parse(raw);
if (!Array.isArray(data.vulnerabilities)) {
  data.vulnerabilities = [];
}

data.vulnerabilities.push({
  severity,
  type,
  description,
  file,
  line,
  recommendation,
});

fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
NODE
)" "$REPORT_FILE" "$severity" "$type" "$description" "$file" "$line" "$recommendation"
  fi
}

# Función para actualizar resumen
update_summary() {
  if [[ "$HAS_JQ" == "true" ]]; then
    local temp_file
    temp_file=$(mktemp)
    jq --arg severity "$1" \
      '.summary[$severity] += 1 | .summary.total_vulnerabilities += 1' \
      "$REPORT_FILE" >"$temp_file" && mv "$temp_file" "$REPORT_FILE"
  else
    node -e "$(cat <<'NODE'
const fs = require('fs');
const [,, reportPath, severity] = process.argv;
const raw = fs.readFileSync(reportPath, 'utf8');
const data = JSON.parse(raw);
if (!data.summary) {
  data.summary = {
    total_vulnerabilities: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
}

if (!Object.prototype.hasOwnProperty.call(data.summary, severity)) {
  data.summary[severity] = 0;
}

data.summary[severity] += 1;
data.summary.total_vulnerabilities += 1;

fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
NODE
)" "$REPORT_FILE" "$1"
  fi
}

# Verificar dependencias
check_dependencies() {
  log "Verificando dependencias..."

  local missing_deps=()

  # Verificar herramientas de seguridad
  command -v npm >/dev/null 2>&1 || missing_deps+=("npm")
  if [[ "$HAS_JQ" == "false" && "$HAS_NODE" == "false" ]]; then
    missing_deps+=("jq")
  fi

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

    if ! validate_json_file "$AUDIT_JSON_FILE"; then
      error "El reporte de npm audit no es JSON válido"
      AUDIT_FAILURE=1
      return
    fi

    rotate_reports "$REPORT_DIR" "npm-audit-" "$MAX_REPORTS"

    local vulnerabilities_data=""
    local vulnerabilities_status=0
    if [[ "$HAS_JQ" == "true" ]]; then
      vulnerabilities_data=$(jq -r '.vulnerabilities | to_entries[] | "\(.key)|\(.value.severity // \"unknown\")|\(.value.title // \"Vulnerability\")"' "$AUDIT_JSON_FILE" 2>/dev/null || echo "")
    else
      set +e
      vulnerabilities_data=$(node -e "$(cat <<'NODE'
const fs = require('fs');
const path = process.argv[2];
let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (error) {
  process.exit(1);
}

const entries = Object.entries(data.vulnerabilities || {});
const lines = [];
for (const [pkg, info] of entries) {
  if (!info) continue;
  const severity = info.severity || 'unknown';
  const title = (info.title || `Vulnerability in ${pkg}`).replace(/\s+/g, ' ').trim();
  lines.push(`${pkg}|${severity}|${title}`);
}

if (lines.length > 0) {
  process.stdout.write(lines.join('\n'));
}
NODE
)" "$AUDIT_JSON_FILE")
      vulnerabilities_status=$?
      set -e
      if [[ $vulnerabilities_status -ne 0 ]]; then
        error "No se pudo interpretar npm-audit.json sin jq"
        AUDIT_FAILURE=1
        return
      fi
    fi

    if [[ -n $vulnerabilities_data ]]; then
      while IFS='|' read -r _pkg severity description; do
        add_vulnerability "$severity" "dependency" "$description" "package.json" "0" "Update dependency to latest secure version"
        update_summary "$severity"
      done <<<"$vulnerabilities_data"
    fi

    local moderate_plus
    if [[ "$HAS_JQ" == "true" ]]; then
      moderate_plus=$(jq '(.metadata.vulnerabilities.moderate // 0) + (.metadata.vulnerabilities.high // 0) + (.metadata.vulnerabilities.critical // 0)' "$AUDIT_JSON_FILE" 2>/dev/null || echo "0")
    else
      moderate_plus=$(node -e "$(cat <<'NODE'
const fs = require('fs');
const path = process.argv[2];
let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (error) {
  process.stdout.write('0');
  process.exit(0);
}

const metadata = (data.metadata && data.metadata.vulnerabilities) || {};
const total = (metadata.moderate || 0) + (metadata.high || 0) + (metadata.critical || 0);
process.stdout.write(String(total));
NODE
)" "$AUDIT_JSON_FILE")
    fi

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
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if [[ "$HAS_JQ" == "true" ]]; then
    local temp_file
    temp_file=$(mktemp)
    jq --arg timestamp "$timestamp" \
      '.audit_completed = $timestamp' \
      "$REPORT_FILE" >"$temp_file" && mv "$temp_file" "$REPORT_FILE"
  else
    node -e "$(cat <<'NODE'
const fs = require('fs');
const [,, reportPath, timestamp] = process.argv;
const raw = fs.readFileSync(reportPath, 'utf8');
const data = JSON.parse(raw);
data.audit_completed = timestamp;
fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
NODE
)" "$REPORT_FILE" "$timestamp"
  fi

  rotate_reports "$REPORT_DIR" "security-audit-" "$MAX_REPORTS"

  # Mostrar resumen
  local total
  local critical
  local high
  local medium
  local low

  if [[ "$HAS_JQ" == "true" ]]; then
    total=$(jq -r '.summary.total_vulnerabilities' "$REPORT_FILE")
    critical=$(jq -r '.summary.critical' "$REPORT_FILE")
    high=$(jq -r '.summary.high' "$REPORT_FILE")
    medium=$(jq -r '.summary.medium' "$REPORT_FILE")
    low=$(jq -r '.summary.low' "$REPORT_FILE")
  else
    local summary_line
    summary_line=$(node -e "$(cat <<'NODE'
const fs = require('fs');
const path = process.argv[2];
let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (error) {
  console.log('0|0|0|0|0');
  process.exit(0);
}

const summary = data.summary || {};
const values = [
  summary.total_vulnerabilities || 0,
  summary.critical || 0,
  summary.high || 0,
  summary.medium || 0,
  summary.low || 0,
];
console.log(values.join('|'));
NODE
)" "$REPORT_FILE")
    total=$(echo "$summary_line" | cut -d'|' -f1)
    critical=$(echo "$summary_line" | cut -d'|' -f2)
    high=$(echo "$summary_line" | cut -d'|' -f3)
    medium=$(echo "$summary_line" | cut -d'|' -f4)
    low=$(echo "$summary_line" | cut -d'|' -f5)
  fi

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
