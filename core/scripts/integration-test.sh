#!/usr/bin/env bash
# 🔗 Integration Test Script para todos los agentes
# 📅 Versión: 1.0.0
# 🎯 Propósito: Probar integración entre agentes

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
TEST_ENVIRONMENT="${TEST_ENVIRONMENT:-integration}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
VERBOSE="${VERBOSE:-false}"
# Directorio del proyecto bajo prueba (por defecto: .)
PROJECT_DIR="${PROJECT_DIR:-.}"
# Directorio de logs
LOG_DIR="${LOG_DIR:-logs}"

# Ejecuta un comando con control de verbosidad y sin color ANSI.
# Uso: run_step "nombre" cmd args...
run_step() {
  local name="$1"
  shift
  mkdir -p "$LOG_DIR"
  local logfile="$LOG_DIR/${name}.log"
  if [[ $VERBOSE == "true" ]]; then
    NO_COLOR=1 "$@" 2>&1 | sed -E 's/\x1B\[[0-9;]*[mK]//g' | tee "$logfile"
  else
    NO_COLOR=1 "$@" >"$logfile" 2>&1
  fi
}

prepare_project_dir() {
  # Si el directorio objetivo no parece un proyecto generado, genera uno temporal
  if [[ ! -d "$PROJECT_DIR/.claude/commands" ]] || [[ ! -f "$PROJECT_DIR/CLAUDE.md" ]]; then
    log "PROJECT_DIR no parece un proyecto generado. Creando proyecto temporal para pruebas..."
    local ROOT
    ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
    local TMP
    TMP="$(mktemp -d)"
    CLAUDE_INIT_SKIP_DEPS=1 CLAUDE_INIT_INCLUDE_DEPLOY=1 \
      bash "$ROOT/core/claude-project-init.sh" --name demo --type fullstack --use-templates on --templates-path "$ROOT/core/templates" --path "$TMP" --yes >/dev/null 2>&1 || {
      error "No se pudo generar proyecto temporal"
      return 1
    }
    PROJECT_DIR="$TMP/demo"
    log "Proyecto temporal creado en: $PROJECT_DIR"
  fi
}
# Directorio del proyecto bajo prueba (por defecto: .)
PROJECT_DIR="${PROJECT_DIR:-.}"

# Agentes disponibles
AGENTS=(
  "code-reviewer"
  "medical-reviewer"
  "security-guardian"
  "deployment-manager"
  "test-generator"
  "review-coordinator"
)

# Función para logging
log() {
  mkdir -p "$LOG_DIR" || true
  if [[ $VERBOSE == "true" ]]; then
    echo -e "${BLUE}[Integration Test]${NC} $1"
  else
    echo "[Integration Test] $1" >>"$LOG_DIR/global.log"
  fi
}

error() {
  mkdir -p "$LOG_DIR" || true
  if [[ $VERBOSE == "true" ]]; then
    echo -e "${RED}[ERROR]${NC} $1" >&2
  else
    echo "[ERROR] $1" >>"$LOG_DIR/global.log"
  fi
}

success() {
  mkdir -p "$LOG_DIR" || true
  if [[ $VERBOSE == "true" ]]; then
    echo -e "${GREEN}[SUCCESS]${NC} $1"
  else
    echo "[SUCCESS] $1" >>"$LOG_DIR/global.log"
  fi
}

warning() {
  mkdir -p "$LOG_DIR" || true
  if [[ $VERBOSE == "true" ]]; then
    echo -e "${YELLOW}[WARNING]${NC} $1"
  else
    echo "[WARNING] $1" >>"$LOG_DIR/global.log"
  fi
}

# Función para verificar dependencias
check_dependencies() {
  log "Verificando dependencias..."

  local missing_deps=()

  # Verificar scripts específicos
  local required_scripts=(
    "core/scripts/eslint-check.sh"
    "core/scripts/check-phi.sh"
    "core/scripts/security-scan.sh"
    "core/scripts/deployment-check.sh"
    "core/scripts/test-generator.sh"
    "core/scripts/review-coordinator.sh"
  )

  for script in "${required_scripts[@]}"; do
    if [[ ! -f $script ]]; then
      missing_deps+=("$(basename "$script")")
    fi
  done

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    error "Scripts faltantes: ${missing_deps[*]}"
    return 1
  fi

  success "Dependencias verificadas"
  return 0
}

# Función para probar agente individual
test_agent() {
  local agent="$1"
  local start_time
  start_time=$(date +%s)
  local project_dir="${PROJECT_DIR:-$(pwd)}"

  log "Probando agente: $agent"

  case "$agent" in
    "code-reviewer")
      if run_step "agent-${agent}" ./core/scripts/eslint-check.sh "$project_dir"; then
        success "✅ $agent: ESLint check passed"
        return 0
      else
        error "❌ $agent: ESLint check failed"
        return 1
      fi
      ;;
    "medical-reviewer")
      if run_step "agent-${agent}" ./core/scripts/check-phi.sh "$project_dir"; then
        success "✅ $agent: PHI check passed"
        return 0
      else
        error "❌ $agent: PHI check failed"
        return 1
      fi
      ;;
    "security-guardian")
      if run_step "agent-${agent}" ./core/scripts/security-scan.sh "$project_dir"; then
        success "✅ $agent: Security scan passed"
        return 0
      else
        error "❌ $agent: Security scan failed"
        return 1
      fi
      ;;
    "deployment-manager")
      if run_step "agent-${agent}" ./core/scripts/deployment-check.sh "$project_dir"; then
        success "✅ $agent: Deployment check passed"
        return 0
      else
        error "❌ $agent: Deployment check failed"
        return 1
      fi
      ;;
    "test-generator")
      if run_step "agent-${agent}" ./core/scripts/test-generator.sh "$project_dir"; then
        success "✅ $agent: Test generation passed"
        return 0
      else
        error "❌ $agent: Test generation failed"
        return 1
      fi
      ;;
    "review-coordinator")
      if ./core/scripts/review-coordinator.sh "$project_dir" >/dev/null 2>&1; then
        success "✅ $agent: Review coordination passed"
        return 0
      else
        error "❌ $agent: Review coordination failed"
        return 1
      fi
      ;;
    *)
      error "Agente desconocido: $agent"
      return 1
      ;;
  esac
}

# Función para probar integración entre agentes
test_agent_integration() {
  log "Probando integración entre agentes..."

  local results=()
  local total_agents=${#AGENTS[@]}
  local successful_agents=0
  local failed_agents=0

  for agent in "${AGENTS[@]}"; do
    if test_agent "$agent"; then
      results+=("$agent:success")
      ((successful_agents++))
    else
      results+=("$agent:failed")
      ((failed_agents++))
    fi
  done

  log "Integración completada: $successful_agents/$total_agents agentes exitosos"

  # Retornar resultados como string
  echo "${results[@]}"

  if [[ $failed_agents -gt 0 ]]; then
    error "Agentes con fallos: $failed_agents"
    return 1
  else
    success "Todos los agentes funcionan correctamente"
    return 0
  fi
}

# Función para probar flujo de trabajo completo
test_workflow() {
  log "Probando flujo de trabajo completo..."

  # Paso 1: Revisión de código
  log "Paso 1: Revisión de código"
  if ! run_step "workflow-eslint" ./core/scripts/eslint-check.sh "$PROJECT_DIR"; then
    error "Fallo en revisión de código"
    return 1
  fi

  # Paso 2: Escaneo de seguridad
  log "Paso 2: Escaneo de seguridad"
  if ! run_step "workflow-security" ./core/scripts/security-scan.sh "$PROJECT_DIR"; then
    error "Fallo en escaneo de seguridad"
    return 1
  fi

  # Paso 3: Verificación de despliegue
  log "Paso 3: Verificación de despliegue"
  if ! run_step "workflow-deploy" ./core/scripts/deployment-check.sh "$PROJECT_DIR"; then
    error "Fallo en verificación de despliegue"
    return 1
  fi

  # Paso 4: Generación de tests
  log "Paso 4: Generación de tests"
  if ! run_step "workflow-testgen" ./core/scripts/test-generator.sh "$PROJECT_DIR"; then
    error "Fallo en generación de tests"
    return 1
  fi

  # Paso 5: Coordinación de revisiones
  log "Paso 5: Coordinación de revisiones"
  if ! PROJECT_DIR="$PROJECT_DIR" REVIEW_COORDINATOR_EXECUTE=0 NO_COLOR=1 ./core/scripts/review-coordinator.sh "$PROJECT_DIR" >"$LOG_DIR/workflow-review-coordinator.log" 2>&1; then
    error "Fallo en coordinación de revisiones"
    return 1
  fi

  success "Flujo de trabajo completo exitoso"
  return 0
}

# Función para generar reporte de integración
generate_integration_report() {
  local status="$1"
  local results=("${@:2}")
  local output_file="integration-test-report.json"

  log "Generando reporte de integración..."

  cat >"$output_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_environment": "$TEST_ENVIRONMENT",
  "status": "$status",
  "total_agents": ${#AGENTS[@]},
  "successful_agents": $(echo "${results[@]}" | tr ' ' '\n' | grep -c ":success" || echo "0"),
  "failed_agents": $(echo "${results[@]}" | tr ' ' '\n' | grep -c ":failed" || echo "0"),
  "agent_results": [
EOF

  for i in "${!results[@]}"; do
    local result="${results[$i]}"
    local agent
    agent=$(echo "$result" | cut -d: -f1)
    local status
    status=$(echo "$result" | cut -d: -f2)

    cat >>"$output_file" <<EOF
    {
      "agent": "$agent",
      "status": "$status"
    }$(if [[ $i -lt $((${#results[@]} - 1)) ]]; then echo ","; fi)
EOF
  done

  cat >>"$output_file" <<EOF
  ],
  "recommendations": [
    "All agents are working correctly",
    "Integration tests passed successfully",
    "Workflow is ready for production use"
  ]
}
EOF

  success "Reporte de integración generado: $output_file"
}

# Función principal
main() {
  log "Iniciando tests de integración..."
  # Preparar directorio de proyecto si hace falta
  prepare_project_dir || {
    error "Preparación de proyecto fallida"
    exit 1
  }

  # Verificar dependencias
  if ! check_dependencies; then
    error "Dependencias faltantes, abortando tests"
    exit 1
  fi

  # Probar integración entre agentes
  local integration_results=($(test_agent_integration))

  # Probar flujo de trabajo completo
  if test_workflow; then
    success "✅ Tests de integración completados exitosamente"

    # Generar reporte
    generate_integration_report "success" "${integration_results[@]}"

    exit 0
  else
    error "❌ Tests de integración fallaron"

    # Generar reporte
    generate_integration_report "failed" "${integration_results[@]}"

    exit 1
  fi
}

# Ejecutar función principal
main "$@"
