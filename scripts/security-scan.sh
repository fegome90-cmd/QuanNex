#!/usr/bin/env bash
# 🛡️ Security Scan Script para @security-guardian
# 📅 Versión: 1.0.0
# 🎯 Propósito: Escaneo de seguridad integral

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SCAN_TYPE="${SCAN_TYPE:-all}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
SEVERITY_THRESHOLD="${SEVERITY_THRESHOLD:-high}"
SECURITY_STRICT="${SECURITY_STRICT:-0}"
SCAN_EXCLUDE_DIRS="${SCAN_EXCLUDE_DIRS:-docs/reference external node_modules templates dist build}"

# Patrones de vulnerabilidades comunes
VULNERABILITY_PATTERNS=(
  "eval\("
  "innerHTML"
  "document\.write"
  "setTimeout.*string"
  "setInterval.*string"
  "Function\("
  "new Function"
  "exec\("
  "system\("
  "shell_exec"
  "passthru"
  "proc_open"
  "popen"
)

# Patrones de secretos
SECRET_PATTERNS=(
  "password.*=.*['\"][^'\"]{8,}['\"]"
  "api_key.*=.*['\"][^'\"]{16,}['\"]"
  "secret.*=.*['\"][^'\"]{16,}['\"]"
  "token.*=.*['\"][^'\"]{16,}['\"]"
  "private_key.*=.*['\"][^'\"]{32,}['\"]"
  "aws_access_key"
  "aws_secret_key"
  "github_token"
  "slack_token"
  "jwt_secret"
)

# Función para logging
log() {
  echo -e "${BLUE}[Security Scan]${NC} $1"
}

# Función para construir patrón de exclusión
build_exclude_pattern() {
  local exclude_pattern=""
  for dir in $SCAN_EXCLUDE_DIRS; do
    if [[ -n $exclude_pattern ]]; then
      exclude_pattern+="|"
    fi
    exclude_pattern+="(\./)?$dir"
  done
  echo "$exclude_pattern"
}

# Función para verificar allowlist
check_allowlist() {
  local file="$1"
  local line_num="$2"
  local content="$3"

  # Si no existe .secretsallow, no hay allowlist
  if [[ ! -f ".secretsallow" ]]; then
    return 1
  fi

  # Verificar cada patrón en el allowlist
  while IFS= read -r pattern; do
    # Saltar comentarios y líneas vacías
    if [[ $pattern =~ ^[[:space:]]*# ]] || [[ -z $pattern ]]; then
      continue
    fi

    # Verificar si el archivo coincide con el patrón
    if [[ $file =~ $pattern ]]; then
      return 0
    fi

    # Verificar si el contenido de la línea coincide con el patrón
    if [[ $content =~ $pattern ]]; then
      return 0
    fi
  done <".secretsallow"

  return 1
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

# Función para verificar dependencias
check_dependencies() {
  log "Verificando dependencias..."

  if ! command -v grep &>/dev/null; then
    error "grep no está disponible"
    exit 1
  fi

  if ! command -v npm &>/dev/null; then
    warning "npm no está instalado, saltando auditoría de dependencias"
  fi

  if ! command -v jq &>/dev/null; then
    warning "jq no está instalado, usando formato simple"
    OUTPUT_FORMAT="simple"
  fi

  success "Dependencias verificadas"
}

# Función para escanear vulnerabilidades
scan_vulnerabilities() {
  log "Escaneando vulnerabilidades..."

  local files="${1:-.}"
  local findings=()
  local total_files=0
  local files_with_vulns=0

  # Crear patrón de búsqueda
  local pattern
  pattern=$(
    IFS='|'
    echo "${VULNERABILITY_PATTERNS[*]}"
  )

  # Construir patrón de exclusión
  local exclude_pattern
  exclude_pattern=$(build_exclude_pattern)

  # Buscar archivos de código (excluyendo directorios configurados)
  while IFS= read -r -d '' file; do
    # Skip directorios excluidos
    if [[ $file =~ ^$exclude_pattern ]]; then
      continue
    fi

    ((total_files++))

    # Buscar vulnerabilidades en el archivo
    if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
      ((files_with_vulns++))

      # Obtener líneas con vulnerabilidades
      local lines
      lines=$(grep -iE "$pattern" "$file" -n)

      while IFS= read -r line; do
        local line_num
        line_num=$(echo "$line" | cut -d: -f1)
        local content
        content=$(echo "$line" | cut -d: -f2-)

        # Verificar allowlist antes de agregar
        if ! check_allowlist "$file" "$line_num" "$content"; then
          findings+=("$file:$line_num:vulnerability:$content")
        fi
      done <<<"$lines"
    fi
  done < <(find "$files" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.php" -o -name "*.rb" \) \
    ! -path "*/docs/reference/*" ! -path "*/external/*" ! -path "*/node_modules/*" -print0)

  log "Archivos escaneados: $total_files"
  log "Archivos con vulnerabilidades: $files_with_vulns"

  if [[ ${#findings[@]} -gt 0 ]]; then
    warning "Se encontraron ${#findings[@]} vulnerabilidades"
    return 1
  else
    success "No se encontraron vulnerabilidades"
    return 0
  fi
}

# Función para escanear secretos
scan_secrets() {
  log "Escaneando secretos..."

  local files="${1:-.}"
  local findings=()
  local total_files=0
  local files_with_secrets=0

  # Crear patrón de búsqueda
  local pattern
  pattern=$(
    IFS='|'
    echo "${SECRET_PATTERNS[*]}"
  )

  # Construir patrón de exclusión
  local exclude_pattern
  exclude_pattern=$(build_exclude_pattern)

  # Buscar archivos de código (excluyendo directorios configurados)
  while IFS= read -r -d '' file; do
    # Skip directorios excluidos
    if [[ $file =~ ^$exclude_pattern ]]; then
      continue
    fi

    ((total_files++))

    # Buscar secretos en el archivo
    if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
      ((files_with_secrets++))

      # Obtener líneas con secretos
      local lines
      lines=$(grep -iE "$pattern" "$file" -n)

      while IFS= read -r line; do
        local line_num
        line_num=$(echo "$line" | cut -d: -f1)
        local content
        content=$(echo "$line" | cut -d: -f2-)

        # Verificar allowlist antes de agregar
        if ! check_allowlist "$file" "$line_num" "$content"; then
          findings+=("$file:$line_num:secret:$content")
        fi
      done <<<"$lines"
    fi
  done < <(find "$files" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.php" -o -name "*.rb" -o -name "*.env" -o -name "*.config" \) \
    ! -path "*/docs/reference/*" ! -path "*/external/*" ! -path "*/node_modules/*" -print0)

  log "Archivos escaneados: $total_files"
  log "Archivos con secretos: $files_with_secrets"

  if [[ ${#findings[@]} -gt 0 ]]; then
    warning "Se encontraron ${#findings[@]} secretos"
    return 1
  else
    success "No se encontraron secretos"
    return 0
  fi
}

# Función para auditoría de dependencias
audit_dependencies() {
  log "Auditando dependencias..."

  if ! command -v npm &>/dev/null; then
    warning "npm no está disponible, saltando auditoría de dependencias"
    return 0
  fi

  # QNX-BUG-001: Usar script seguro para npm audit
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  
  if [[ -f "$script_dir/secure-npm-audit.sh" ]]; then
    log "Usando script seguro de npm audit..."
    if bash "$script_dir/secure-npm-audit.sh" "." "npm-audit.json" "npm-audit-errors.log"; then
      success "Auditoría de dependencias completada"
      return 0
    else
      warning "Se encontraron vulnerabilidades en dependencias"
      return 1
    fi
  else
    # Fallback al método anterior si el script seguro no está disponible
    warning "Script seguro no encontrado, usando método fallback"
    if [[ ! -f "package.json" ]]; then
      warning "package.json no encontrado, saltando auditoría de dependencias"
      return 0
    fi

    # QNX-SEC-002: Ejecutar npm audit sin suprimir errores
    if npm audit --audit-level=moderate --json >npm-audit.json 2>npm-audit-errors.log; then
      success "Auditoría de dependencias completada"
      # Verificar si hay errores en el log
      if [[ -s npm-audit-errors.log ]]; then
        warning "npm audit generó advertencias (ver npm-audit-errors.log)"
      fi
      return 0
    else
      warning "Se encontraron vulnerabilidades en dependencias"
      # Mostrar errores para trazabilidad
      if [[ -s npm-audit-errors.log ]]; then
        error "Errores de npm audit:"
        cat npm-audit-errors.log >&2
      fi
      return 1
    fi
  fi
}

# Función para generar reporte JSON
generate_json_report() {
  local findings=("$@")
  local output_file="security-report.json"

  log "Generando reporte JSON..."

  # Crear estructura JSON
  cat >"$output_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scan_type": "SECURITY_SCAN",
  "total_findings": ${#findings[@]},
  "severity": "HIGH",
  "findings": [
EOF

  # Agregar cada hallazgo
  for i in "${!findings[@]}"; do
    local finding="${findings[$i]}"
    local file
    file=$(echo "$finding" | cut -d: -f1)
    local line
    line=$(echo "$finding" | cut -d: -f2)
    local type
    type=$(echo "$finding" | cut -d: -f3)
    local content
    content=$(echo "$finding" | cut -d: -f4-)

    cat >>"$output_file" <<EOF
    {
      "file": "$file",
      "line": $line,
      "type": "$type",
      "content": "$content",
      "severity": "HIGH",
      "recommendation": "Review and fix security issue"
    }$(if [[ $i -lt $((${#findings[@]} - 1)) ]]; then echo ","; fi)
EOF
  done

  cat >>"$output_file" <<EOF
  ],
  "recommendations": [
    "Fix all identified vulnerabilities",
    "Remove exposed secrets from code",
    "Update vulnerable dependencies",
    "Implement security best practices",
    "Add security scanning to CI/CD pipeline"
  ]
}
EOF

  success "Reporte JSON generado: $output_file"
}

# Función para generar reporte simple
generate_simple_report() {
  local findings=("$@")
  local output_file="security-report.txt"

  log "Generando reporte simple..."

  cat >"$output_file" <<EOF
# 🛡️ Reporte de Security Scan

## 📅 Fecha: $(date)

## 📈 Resumen
- **Total de hallazgos**: ${#findings[@]}
- **Severidad**: HIGH
- **Tipo**: SECURITY_SCAN

## 🔍 Hallazgos
EOF

  for finding in "${findings[@]}"; do
    local file
    file=$(echo "$finding" | cut -d: -f1)
    local line
    line=$(echo "$finding" | cut -d: -f2)
    local type
    type=$(echo "$finding" | cut -d: -f3)
    local content
    content=$(echo "$finding" | cut -d: -f4-)

    cat >>"$output_file" <<EOF

### Archivo: $file
- **Línea**: $line
- **Tipo**: $type
- **Contenido**: $content
- **Recomendación**: Review and fix security issue
EOF
  done

  cat >>"$output_file" <<EOF

## 💡 Recomendaciones
1. Fix all identified vulnerabilities
2. Remove exposed secrets from code
3. Update vulnerable dependencies
4. Implement security best practices
5. Add security scanning to CI/CD pipeline

---
*Generado por @security-guardian*
EOF

  success "Reporte simple generado: $output_file"
}

# Función para analizar resultados
analyze_results() {
  local findings=("$@")

  log "Analizando resultados..."

  if [[ ${#findings[@]} -gt 0 ]]; then
    error "Se encontraron ${#findings[@]} problemas de seguridad"

    # Generar reporte
    if [[ $OUTPUT_FORMAT == "json" ]]; then
      generate_json_report "${findings[@]}"
    else
      generate_simple_report "${findings[@]}"
    fi

    if [[ $SECURITY_STRICT == "1" ]]; then
      return 1
    else
      warning "Modo no estricto: aprobando con advertencias"
      return 0
    fi
  else
    success "No se encontraron problemas de seguridad"
    return 0
  fi
}

# Función principal
main() {
  log "Iniciando escaneo de seguridad..."

  # Verificar dependencias
  check_dependencies

  local all_findings=()
  local has_issues=false

  # Ejecutar escaneos según el tipo
  case "$SCAN_TYPE" in
    "vulnerabilities" | "all")
      if ! scan_vulnerabilities "$@"; then
        # has_issues=true  # Unused variable
        # Obtener hallazgos de vulnerabilidades
        local pattern
        pattern=$(
          IFS='|'
          echo "${VULNERABILITY_PATTERNS[*]}"
        )
        local files="${1:-.}"

        while IFS= read -r -d '' file; do
          # Skip external and documentation directories
          if [[ $file =~ ^(\./)?(docs/reference|external|node_modules)/ ]]; then
            continue
          fi

          if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
            local lines
            lines=$(grep -iE "$pattern" "$file" -n)
            while IFS= read -r line; do
              local line_num
              line_num=$(echo "$line" | cut -d: -f1)
              local content
              content=$(echo "$line" | cut -d: -f2-)
              all_findings+=("$file:$line_num:vulnerability:$content")
            done <<<"$lines"
          fi
        done < <(find "$files" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.php" -o -name "*.rb" \) \
          ! -path "*/docs/reference/*" ! -path "*/external/*" ! -path "*/node_modules/*" -print0)
      fi
      ;;
  esac

  case "$SCAN_TYPE" in
    "secrets" | "all")
      if ! scan_secrets "$@"; then
        # has_issues=true  # Unused variable
        # Obtener hallazgos de secretos
        local pattern
        pattern=$(
          IFS='|'
          echo "${SECRET_PATTERNS[*]}"
        )
        local files="${1:-.}"

        while IFS= read -r -d '' file; do
          # Skip external and documentation directories
          if [[ $file =~ ^(\./)?(docs/reference|external|node_modules)/ ]]; then
            continue
          fi

          if grep -iE "$pattern" "$file" >/dev/null 2>&1; then
            local lines
            lines=$(grep -iE "$pattern" "$file" -n)
            while IFS= read -r line; do
              local line_num
              line_num=$(echo "$line" | cut -d: -f1)
              local content
              content=$(echo "$line" | cut -d: -f2-)
              all_findings+=("$file:$line_num:secret:$content")
            done <<<"$lines"
          fi
        done < <(find "$files" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.php" -o -name "*.rb" -o -name "*.env" -o -name "*.config" \) \
          ! -path "*/docs/reference/*" ! -path "*/external/*" ! -path "*/node_modules/*" -print0)
      fi
      ;;
  esac

  case "$SCAN_TYPE" in
    "dependencies" | "all")
      if ! audit_dependencies; then
        true  # No-op for empty then clause
      fi
      ;;
  esac

  # Analizar resultados

  # Pasar array de forma segura
  if [[ ${#all_findings[@]} -gt 0 ]]; then
    if analyze_results "${all_findings[@]}"; then
      success "✅ Escaneo de seguridad completado exitosamente"
      exit 0
    else
      if [[ $SECURITY_STRICT == "1" ]]; then
        error "❌ Se encontraron problemas de seguridad (estricto)"
        exit 1
      else
        warning "Problemas de seguridad encontrados (no estricto): aprobando con advertencias"
        exit 0
      fi
    fi
  else
    # No hay hallazgos, aprobar
    success "✅ Escaneo de seguridad completado exitosamente"
    exit 0
  fi
}

# Ejecutar función principal
main "$@"
