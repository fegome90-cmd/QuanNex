#!/usr/bin/env bash
# 🧪 Test Generator Script para @test-generator
# 📅 Versión: 1.0.0
# 🎯 Propósito: Generar tests automáticamente

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
TEST_TYPE="${TEST_TYPE:-unit}"
COVERAGE_THRESHOLD="${COVERAGE_THRESHOLD:-80}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
FRAMEWORK="${FRAMEWORK:-jest}"

# Patrones de archivos de código
CODE_PATTERNS=(
  "*.js"
  "*.ts"
  "*.jsx"
  "*.tsx"
  "*.py"
  "*.java"
  "*.php"
  "*.rb"
)

# Patrones de archivos de test
TEST_PATTERNS=(
  "*.test.js"
  "*.test.ts"
  "*.spec.js"
  "*.spec.ts"
  "*.test.py"
  "*Test.java"
  "*.test.php"
  "*_test.rb"
)

# Función para logging
log() {
  echo -e "${BLUE}[Test Generator]${NC} $1"
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

  if ! command -v node &>/dev/null; then
    warning "Node.js no está instalado"
  fi

  if ! command -v npm &>/dev/null; then
    warning "npm no está instalado"
  fi

  if ! command -v jq &>/dev/null; then
    warning "jq no está instalado, usando formato simple"
    OUTPUT_FORMAT="simple"
  fi

  success "Dependencias verificadas"
}

# Función para analizar archivos de código
analyze_code_files() {
  log "Analizando archivos de código..."

  local files="${1:-.}"
  local code_files=()
  local total_files=0

  # Buscar archivos de código
  for pattern in "${CODE_PATTERNS[@]}"; do
    while IFS= read -r -d '' file; do
      code_files+=("$file")
      ((total_files++))
    done < <(find "$files" -type f -name "$pattern" -print0)
  done

  log "Archivos de código encontrados: $total_files"

  # Analizar cada archivo
  local functions=()
  local classes=()
  local modules=()

  for file in "${code_files[@]}"; do
    # Extraer funciones (patrón básico)
    if grep -q "function\|const.*=\|class\|export" "$file" 2>/dev/null; then
      local file_functions
      file_functions=$(grep -c "function\|const.*=\|class\|export" "$file" 2>/dev/null || echo "0")
      functions+=("$file:$file_functions")
    fi
  done

  log "Funciones/Clases encontradas: ${#functions[@]}"

  echo "${functions[@]}"
}

# Función para analizar archivos de test existentes
analyze_test_files() {
  log "Analizando archivos de test existentes..."

  local files="${1:-.}"
  local test_files=()
  local total_tests=0

  # Buscar archivos de test
  for pattern in "${TEST_PATTERNS[@]}"; do
    while IFS= read -r -d '' file; do
      test_files+=("$file")
      # Contar tests en el archivo
      local test_count
      test_count=$(grep -c "test\|it\|describe\|expect" "$file" 2>/dev/null || echo "0")
      ((total_tests += test_count))
    done < <(find "$files" -type f -name "$pattern" -print0)
  done

  log "Archivos de test encontrados: ${#test_files[@]}"
  log "Tests existentes: $total_tests"

  echo "${test_files[@]}"
}

# Función para generar tests unitarios
generate_unit_tests() {
  log "Generando tests unitarios..."

  local code_files=("$@")
  # Proteger contra arrays vacíos bajo set -u
  if [[ ${#code_files[@]} -eq 1 && -z ${code_files[0]} ]]; then
    code_files=()
  fi
  local generated_tests=()
  local total_generated=0

  for file_info in "${code_files[@]}"; do
    local file
    file=$(echo "$file_info" | cut -d: -f1)
    local function_count
    function_count=$(echo "$file_info" | cut -d: -f2)

    # Verificar que function_count es un número
    if [[ $function_count =~ ^[0-9]+$ ]] && [[ $function_count -gt 0 ]]; then
      local test_file="${file%.*}.test.${file##*.}"

      # Generar test básico
      cat >"$test_file" <<EOF
// Tests generados automáticamente para $file
// Fecha: $(date)

describe('$(basename "$file")', () => {
  // TODO: Implementar tests específicos
  
  test('should be defined', () => {
    expect(true).toBe(true);
  });
  
  // Generar tests para cada función encontrada
  // TODO: Agregar tests específicos para funciones
});

EOF

      generated_tests+=("$test_file")
      ((total_generated++))
      success "✅ Test generado: $test_file"
    fi
  done

  log "Tests unitarios generados: $total_generated"
  if [[ ${#generated_tests[@]} -gt 0 ]]; then
    echo "${generated_tests[@]}"
  else
    echo ""
  fi
}

# Función para generar tests de integración
generate_integration_tests() {
  log "Generando tests de integración..."

  local test_file="integration.test.js"

  cat >"$test_file" <<EOF
// Tests de integración generados automáticamente
// Fecha: $(date)

describe('Integration Tests', () => {
  beforeEach(() => {
    // Setup para tests de integración
  });
  
  afterEach(() => {
    // Cleanup después de tests
  });
  
  test('should integrate components correctly', () => {
    // TODO: Implementar test de integración
    expect(true).toBe(true);
  });
  
  test('should handle data flow', () => {
    // TODO: Implementar test de flujo de datos
    expect(true).toBe(true);
  });
});
EOF

  success "✅ Test de integración generado: $test_file"
  echo "$test_file"
}

# Función para verificar cobertura
check_coverage() {
  log "Verificando cobertura de tests..."

  if ! command -v npm &>/dev/null; then
    warning "npm no disponible, saltando verificación de cobertura"
    return 0
  fi

  if [[ ! -f "package.json" ]]; then
    warning "package.json no encontrado, saltando verificación de cobertura"
    return 0
  fi

  # Verificar si jest está instalado
  if npm list jest >/dev/null 2>&1; then
    log "Ejecutando tests con cobertura..."

    if npm test -- --coverage --coverageThreshold="{\"global\":{\"statements\":$COVERAGE_THRESHOLD,\"branches\":$COVERAGE_THRESHOLD,\"functions\":$COVERAGE_THRESHOLD,\"lines\":$COVERAGE_THRESHOLD}}" >/dev/null 2>&1; then
      success "✅ Cobertura de tests verificada ($COVERAGE_THRESHOLD%)"
      return 0
    else
      warning "⚠️ Cobertura de tests por debajo del umbral ($COVERAGE_THRESHOLD%)"
      return 1
    fi
  else
    warning "Jest no está instalado, saltando verificación de cobertura"
    return 0
  fi
}

# Función para generar reporte JSON
generate_json_report() {
  local generated_tests=("$@")
  local output_file="test-generation-report.json"

  log "Generando reporte JSON..."

  cat >"$output_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_type": "$TEST_TYPE",
  "framework": "$FRAMEWORK",
  "coverage_threshold": $COVERAGE_THRESHOLD,
  "total_generated": ${#generated_tests[@]},
  "generated_tests": [
EOF

  for i in "${!generated_tests[@]}"; do
    cat >>"$output_file" <<EOF
    "$(echo "${generated_tests[$i]}" | sed 's/"/\\"/g')"$(if [[ $i -lt $((${#generated_tests[@]} - 1)) ]]; then echo ","; fi)
EOF
  done

  cat >>"$output_file" <<EOF
  ],
  "recommendations": [
    "Review generated tests and add specific assertions",
    "Add edge cases and error handling tests",
    "Implement integration tests for complex workflows",
    "Add performance tests for critical functions",
    "Maintain test coverage above $COVERAGE_THRESHOLD%"
  ]
}
EOF

  success "Reporte JSON generado: $output_file"
}

# Función para generar reporte simple
generate_simple_report() {
  local generated_tests=("$@")
  local output_file="test-generation-report.txt"

  log "Generando reporte simple..."

  cat >"$output_file" <<EOF
# 🧪 Reporte de Test Generation

## 📅 Fecha: $(date)

## 📈 Resumen
- **Tipo de test**: $TEST_TYPE
- **Framework**: $FRAMEWORK
- **Umbral de cobertura**: $COVERAGE_THRESHOLD%
- **Tests generados**: ${#generated_tests[@]}

## 🧪 Tests Generados
EOF

  for test in "${generated_tests[@]}"; do
    cat >>"$output_file" <<EOF
- $test
EOF
  done

  cat >>"$output_file" <<EOF

## 💡 Recomendaciones
1. Review generated tests and add specific assertions
2. Add edge cases and error handling tests
3. Implement integration tests for complex workflows
4. Add performance tests for critical functions
5. Maintain test coverage above $COVERAGE_THRESHOLD%

---
*Generado por @test-generator*
EOF

  success "Reporte simple generado: $output_file"
}

# Función principal
main() {
  log "Iniciando generación de tests..."

  # Verificar dependencias
  check_dependencies

  # Analizar archivos de código
  local code_files=($(analyze_code_files "$@"))

  # Analizar archivos de test existentes
  local existing_tests=($(analyze_test_files "$@"))

  local generated_tests=()

  # Generar tests según el tipo
  case "$TEST_TYPE" in
    "unit")
      generated_tests=($(generate_unit_tests "${code_files[@]}"))
      ;;
    "integration")
      generated_tests=($(generate_integration_tests))
      ;;
    "all")
      generated_tests=($(generate_unit_tests "${code_files[@]}"))
      generated_tests+=($(generate_integration_tests))
      ;;
    *)
      error "Tipo de test no soportado: $TEST_TYPE"
      exit 1
      ;;
  esac

  # Verificar cobertura
  if ! check_coverage; then
    warning "Cobertura de tests por debajo del umbral"
  fi

  # Generar reporte
  if [[ $OUTPUT_FORMAT == "json" ]]; then
    generate_json_report "${generated_tests[@]}"
  else
    generate_simple_report "${generated_tests[@]}"
  fi

  success "✅ Generación de tests completada exitosamente"
  log "Tests generados: ${#generated_tests[@]}"

  exit 0
}

# Ejecutar función principal
main "$@"
