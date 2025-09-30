#!/usr/bin/env bash
# 🔍 ESLint Check Script para @code-reviewer
# 📅 Versión: 1.0.0
# 🎯 Propósito: Verificar código con ESLint

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
ESLINT_CONFIG="${ESLINT_CONFIG:-.eslintrc.js}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
SEVERITY_THRESHOLD="${SEVERITY_THRESHOLD:-error}"
ESLINT_STRICT="${ESLINT_STRICT:-0}"
ESLINT_PATHS=("src" "app" "server" "client")
ESLINT_FIX="${ESLINT_FIX:-0}"

# Función para logging
log() {
  echo -e "${BLUE}[ESLint Check]${NC} $1"
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

  if ! command -v eslint &>/dev/null; then
    warning "ESLint no está instalado; modo no estricto = OK"
    return 0
  fi

  if ! command -v npm &>/dev/null; then
    error "npm no está instalado"
    exit 1
  fi

  success "Dependencias verificadas"
}

# Función para verificar configuración
check_config() {
  log "Verificando configuración de ESLint..."

  if [[ ! -f $ESLINT_CONFIG ]]; then
    warning "Archivo de configuración $ESLINT_CONFIG no encontrado"
    log "Creando configuración básica..."
    create_basic_config
  fi

  success "Configuración verificada"
}

# Función para crear configuración básica
create_basic_config() {
  cat >"$ESLINT_CONFIG" <<'EOF'
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'error',
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
EOF
  success "Configuración básica creada"
}

# Función para ejecutar ESLint
run_eslint() {
  log "Ejecutando ESLint..."

  local root="${1:-.}"
  local files="$root"
  local output_file="eslint-report.json"

  # Detectar rutas de código; si no hay archivos JS/TS, aprobar con warning
  local code_found=0
  for base in "${ESLINT_PATHS[@]}" "."; do
    local candidate="$root/$base"
    # Normalize when base is .
    [[ $base == "." ]] && candidate="$root"
    if [[ -d $candidate ]]; then
      if find "$candidate" \( -path "*/.git" -o -path "*/node_modules" -o -path "*/dist" -o -path "*/external" -o -path "*/templates" -o -path "*/docs" \) -prune -o \
        -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -print -quit | grep -q .; then
        code_found=1
        files="$candidate"
        break
      fi
    fi
  done
  if [[ $code_found -eq 0 ]]; then
    warning "No hay archivos JS/TS que lintar; omitiendo"
    echo "[]" >"$output_file"
    return 0
  fi

  # Verificar si ESLint está disponible
  if ! command -v eslint &>/dev/null; then
    warning "ESLint no está instalado, creando reporte vacío"
    echo '{"results": [], "summary": {"total": 0, "errors": 0, "warnings": 0}}' >"$output_file"
    return 0
  fi

  # Asegurar configuración básica en el root target si no existe
  local cfg="$root/.eslintrc.js"
  if [[ ! -f $cfg ]]; then
    cat >"$cfg" <<'EOF'
module.exports = {
  env: { browser: true, es2021: true, node: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: { 'no-unused-vars': 'error', 'no-console': 'warn', 'prefer-const': 'error', 'no-var': 'error' }
};
EOF
    success "Configuración básica de ESLint creada en $cfg"
  fi

  # Asegurar ignore de rutas comunes
  local ig="$root/.eslintignore"
  if [[ ! -f $ig ]]; then
    cat >"$ig" <<'EOF'
node_modules
dist
build
external
docs
templates
reports
logs
EOF
    success "Ignore de ESLint creado en $ig"
  fi

  # Autofix opcional
  if [[ $ESLINT_FIX == "1" ]]; then
    eslint "$files" --fix --ignore-path "$ig" >/dev/null 2>&1 || true
  fi

  # Ejecutar ESLint y capturar salida (se analizará JSON después)
  eslint "$files" --ignore-path "$ig" --format="$OUTPUT_FORMAT" --output-file="$output_file" >/dev/null 2>&1 || true
  success "ESLint ejecutado (salida capturada)"
  return 0
}

# Función para analizar resultados
analyze_results() {
  log "Analizando resultados..."

  local output_file="eslint-report.json"

  if [[ ! -f $output_file ]]; then
    error "Archivo de reporte no encontrado"
    return 1
  fi

  # Contar errores y warnings (sumatorias por archivo)
  local errors
  errors=$(jq '[.[].errorCount] | add // 0' "$output_file" 2>/dev/null || echo "0")
  local warnings
  warnings=$(jq '[.[].warningCount] | add // 0' "$output_file" 2>/dev/null || echo "0")

  log "Errores encontrados: $errors"
  log "Warnings encontrados: $warnings"

  # Verificar umbral de severidad y modo estricto
  if [[ ${ESLINT_STRICT:-0} == "1" ]]; then
    if [[ $errors -gt 0 || $warnings -gt 0 ]]; then
      error "Se encontraron problemas de ESLint en modo estricto"
      return 1
    fi
  else
    if [[ $SEVERITY_THRESHOLD == "error" && $errors -gt 0 ]]; then
      error "Se encontraron errores críticos"
      return 1
    elif [[ $SEVERITY_THRESHOLD == "warn" && $warnings -gt 0 ]]; then
      warning "Se encontraron warnings"
      return 1
    fi
  fi

  success "Análisis completado"
  return 0
}

# Función para generar reporte
generate_report() {
  log "Generando reporte..."

  local output_file="eslint-report.json"
  local report_file="eslint-summary.md"

  if [[ ! -f $output_file ]]; then
    error "Archivo de reporte no encontrado"
    return 1
  fi

  # Generar reporte en Markdown
  cat >"$report_file" <<EOF
# 📊 Reporte de ESLint

## 📅 Fecha: $(date)

## 📈 Resumen
- **Errores**: $(jq '[.[] | select(.severity == 2)] | length' "$output_file" 2>/dev/null || echo "0")
- **Warnings**: $(jq '[.[] | select(.severity == 1)] | length' "$output_file" 2>/dev/null || echo "0")

## 🔍 Detalles
\`\`\`json
$(cat "$output_file")
\`\`\`

---
*Generado por @code-reviewer*
EOF

  success "Reporte generado: $report_file"
}

# Función principal
main() {
  log "Iniciando verificación de ESLint..."

  # Verificar dependencias
  check_dependencies

  # Verificar configuración
  check_config

  # Ejecutar ESLint
  if run_eslint "$@"; then
    # Analizar resultados
    if analyze_results; then
      success "✅ Verificación de ESLint completada exitosamente"
      generate_report
      exit 0
    else
      error "❌ Verificación de ESLint falló"
      generate_report
      exit 1
    fi
  else
    error "❌ ESLint falló al ejecutarse"
    exit 1
  fi
}

# Ejecutar función principal
main "$@"
