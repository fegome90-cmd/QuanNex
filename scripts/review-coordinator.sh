#!/usr/bin/env bash
# 🤝 Review Coordinator Script para @review-coordinator
# 📅 Versión: 1.0.0
# 🎯 Propósito: Coordinar revisiones entre agentes

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
REVIEW_TYPE="${REVIEW_TYPE:-all}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
NOTIFICATION_LEVEL="${NOTIFICATION_LEVEL:-info}"
# Directorio objetivo para revisar
PROJECT_DIR="${PROJECT_DIR:-.}"
# Evitar ejecutar agentes pesados por defecto desde este coordinador
REVIEW_COORDINATOR_EXECUTE="${REVIEW_COORDINATOR_EXECUTE:-0}"

# Agentes disponibles (usado en coordinación)
# AVAILABLE_AGENTS=(
#     "code-reviewer"
#     "medical-reviewer"
#     "security-guardian"
#     "deployment-manager"
#     "test-generator"
# )

# Tipos de revisión
# REVIEW_TYPES=(
#   "code-review"
#   "security-audit"
#   "deployment-review"
#   "test-review"
#   "medical-compliance"
# )  # Unused variable

# Función para logging
log() {
  echo -e "${BLUE}[Review Coordinator]${NC} $1"
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

  if ! command -v git &>/dev/null; then
    warning "Git no está instalado"
  fi

  if ! command -v jq &>/dev/null; then
    warning "jq no está instalado, usando formato simple"
    OUTPUT_FORMAT="simple"
  fi

  success "Dependencias verificadas"
}

# Función para detectar cambios en el código
detect_changes() {
  log "Detectando cambios en el código..."

  local changes=()
  # Si no hay repo git en PROJECT_DIR, retornar vacío (fast‑path)
  if [[ ! -d "$PROJECT_DIR/.git" ]]; then
    warning "No es un repositorio Git: ${PROJECT_DIR}. Omitiendo detección de cambios."
    echo ""
    return 0
  fi

  # Verificar si hay cambios en el working directory
  if git -C "$PROJECT_DIR" status --porcelain | grep -q .; then
    changes+=("working_directory")
  fi

  # Verificar si hay commits recientes
  if git -C "$PROJECT_DIR" log --oneline -1 --since="1 hour ago" | grep -q .; then
    changes+=("recent_commits")
  fi

  # Verificar si hay archivos modificados
  local modified_files
  modified_files=$(git -C "$PROJECT_DIR" diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
  if [[ -n $modified_files ]]; then
    changes+=("modified_files")
  fi

  log "Cambios detectados: ${changes[*]}"
  echo "${changes[@]}"
}

# Función para determinar agentes necesarios
determine_agents() {
  log "Determinando agentes necesarios..."

  local changes=("$@")
  local needed_agents=()

  # Siempre incluir code-reviewer para cambios de código
  if [[ " ${changes[*]} " =~ " working_directory " ]] || [[ " ${changes[*]} " =~ " modified_files " ]]; then
    needed_agents+=("code-reviewer")
  fi

  # Incluir security-guardian para cambios de seguridad
  if [[ " ${changes[*]} " =~ " modified_files " ]]; then
    # Verificar si hay archivos relacionados con seguridad
    if git -C "$PROJECT_DIR" diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E "(auth|security|config)" >/dev/null; then
      needed_agents+=("security-guardian")
    fi
  fi

  # Incluir test-generator para cambios de código
  if [[ " ${changes[*]} " =~ " modified_files " ]]; then
    needed_agents+=("test-generator")
  fi

  # Incluir deployment-manager si hay cambios en configuración de despliegue
  if [[ " ${changes[*]} " =~ " modified_files " ]]; then
    if git -C "$PROJECT_DIR" diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E "(docker|k8s|deploy|ci)" >/dev/null; then
      needed_agents+=("deployment-manager")
    fi
  fi

  # Incluir medical-reviewer si hay archivos médicos
  if [[ " ${changes[*]} " =~ " modified_files " ]]; then
    if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E "(medical|health|patient|phi)" >/dev/null; then
      needed_agents+=("medical-reviewer")
    fi
  fi

  log "Agentes necesarios: ${needed_agents[*]}"
  echo "${needed_agents[@]}"
}

# Función para ejecutar agente
execute_agent() {
  local agent="$1"
  # local review_type="$2"  # Unused variable
  local root="$PROJECT_DIR"

  log "Ejecutando agente: $agent"

  case "$agent" in
    "code-reviewer")
      if [[ -f "scripts/eslint-check.sh" ]]; then
        ./scripts/eslint-check.sh "$root"
      else
        warning "Script de code-reviewer no encontrado"
      fi
      ;;
    "medical-reviewer")
      if [[ -f "scripts/check-phi.sh" ]]; then
        ./scripts/check-phi.sh "$root"
      else
        warning "Script de medical-reviewer no encontrado"
      fi
      ;;
    "security-guardian")
      if [[ -f "scripts/security-scan.sh" ]]; then
        ./scripts/security-scan.sh "$root"
      else
        warning "Script de security-guardian no encontrado"
      fi
      ;;
    "deployment-manager")
      if [[ -f "scripts/deployment-check.sh" ]]; then
        ./scripts/deployment-check.sh "$root"
      else
        warning "Script de deployment-manager no encontrado"
      fi
      ;;
    "test-generator")
      if [[ -f "scripts/test-generator.sh" ]]; then
        ./scripts/test-generator.sh "$root"
      else
        warning "Script de test-generator no encontrado"
      fi
      ;;
    *)
      warning "Agente desconocido: $agent"
      ;;
  esac
}

# Función para coordinar revisiones
coordinate_reviews() {
  log "Coordinando revisiones..."

  local agents=("$@")
  local results=()
  local total_agents=${#agents[@]}
  local successful_reviews=0
  local failed_reviews=0

  for agent in "${agents[@]}"; do
    log "Iniciando revisión con $agent..."
    local start_time
    start_time=$(date +%s)
    if [[ $REVIEW_COORDINATOR_EXECUTE == "1" ]]; then
      if execute_agent "$agent" "$REVIEW_TYPE"; then
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        results+=("$agent:success:$duration")
        ((successful_reviews++))
        success "✅ Revisión con $agent completada exitosamente (${duration}s)"
      else
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        results+=("$agent:failed:$duration")
        ((failed_reviews++))
        error "❌ Revisión con $agent falló (${duration}s)"
      fi
    else
      # Modo rápido: no ejecutar, solo registrar intención
      results+=("$agent:skipped:0")
      warning "Ejecutar agentes está deshabilitado (REVIEW_COORDINATOR_EXECUTE=0); registro de intención."
    fi
  done

  log "Revisiones completadas: $successful_reviews/$total_agents exitosas"

  echo "${results[@]}"
}

# Función para consolidar reportes
consolidate_reports() {
  log "Consolidando reportes..."

  local results=("$@")
  local consolidated_report="consolidated-review-report.json"

  cat >"$consolidated_report" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "review_type": "$REVIEW_TYPE",
  "total_agents": ${#results[@]},
  "successful_reviews": $(echo "${results[@]}" | tr ' ' '\n' | grep -c ":success:" || echo "0"),
  "failed_reviews": $(echo "${results[@]}" | tr ' ' '\n' | grep -c ":failed:" || echo "0"),
  "results": [
EOF

  for i in "${!results[@]}"; do
    local result="${results[$i]}"
    local agent
    agent=$(echo "$result" | cut -d: -f1)
    local status
    status=$(echo "$result" | cut -d: -f2)
    local duration
    duration=$(echo "$result" | cut -d: -f3)

    cat >>"$consolidated_report" <<EOF
    {
      "agent": "$agent",
      "status": "$status",
      "duration": $duration
    }$(if [[ $i -lt $((${#results[@]} - 1)) ]]; then echo ","; fi)
EOF
  done

  cat >>"$consolidated_report" <<EOF
  ],
  "recommendations": [
    "Review individual agent reports for detailed findings",
    "Address any failed reviews before proceeding",
    "Consider running additional reviews if needed",
    "Update team on review status and findings"
  ]
}
EOF

  success "Reporte consolidado generado: $consolidated_report"
}

# Función para enviar notificaciones
send_notifications() {
  log "Enviando notificaciones..."

  local results=("$@")
  # local successful_count  # Unused variable
  # successful_count=$(echo "${results[@]}" | tr ' ' '\n' | grep -c ":success:" || echo "0")  # Unused variable
  local failed_count
  failed_count=$(echo "${results[@]}" | tr ' ' '\n' | grep -c ":failed:" || echo "0")

  if [[ $failed_count -gt 0 ]]; then
    warning "⚠️ $failed_count revisiones fallaron - Notificación de alerta enviada"
  else
    success "✅ Todas las revisiones completadas exitosamente - Notificación de éxito enviada"
  fi

  # Aquí se podría integrar con Slack, email, etc.
  log "Notificaciones enviadas (simulado)"
}

# Función principal
main() {
  log "Iniciando coordinación de revisiones..."

  # Verificar dependencias
  check_dependencies

  # Detectar cambios
  local changes=($(detect_changes))

  if [[ ${#changes[@]} -eq 0 ]]; then
    warning "No se detectaron cambios, saltando revisiones"
    exit 0
  fi

  # Determinar agentes necesarios
  local needed_agents=($(determine_agents "${changes[@]}"))

  if [[ ${#needed_agents[@]} -eq 0 ]]; then
    warning "No se determinaron agentes necesarios"
    exit 0
  fi

  # Coordinar revisiones
  local results=($(coordinate_reviews "${needed_agents[@]}"))

  # Consolidar reportes
  consolidate_reports "${results[@]}"

  # Enviar notificaciones
  send_notifications "${results[@]}"

  success "✅ Coordinación de revisiones completada exitosamente"

  exit 0
}

# Ejecutar función principal
main "$@"
