#!/usr/bin/env bash
# 🚀 Deployment Check Script para @deployment-manager
# 📅 Versión: 1.0.0
# 🎯 Propósito: Verificar configuraciones de despliegue

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
ENVIRONMENT="${ENVIRONMENT:-development}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"
STRATEGY="${STRATEGY:-rolling}"
DEPLOY_STRICT="${DEPLOY_STRICT:-0}"

# Archivos de configuración requeridos
REQUIRED_FILES=(
  "package.json"
  "Dockerfile"
  "docker-compose.yml"
  ".github/workflows/deploy.yml"
)

# Función para logging
log() {
  echo -e "${BLUE}[Deployment Check]${NC} $1"
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

  if ! command -v docker &>/dev/null; then
    warning "Docker no está instalado"
  fi

  if ! command -v kubectl &>/dev/null; then
    warning "kubectl no está instalado"
  fi

  if ! command -v jq &>/dev/null; then
    warning "jq no está instalado, usando formato simple"
    OUTPUT_FORMAT="simple"
  fi

  success "Dependencias verificadas"
}

# Función para verificar archivos requeridos
check_required_files() {
  log "Verificando archivos requeridos..."

  local missing_files=()
  local total_files=${#REQUIRED_FILES[@]}
  local found_files=0

  for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f $file ]]; then
      ((found_files++))
      success "✅ $file encontrado"
    else
      missing_files+=("$file")
      warning "❌ $file no encontrado"
    fi
  done

  log "Archivos encontrados: $found_files/$total_files"

  if [[ ${#missing_files[@]} -gt 0 ]]; then
    warning "Archivos faltantes: ${missing_files[*]}"
    return 1
  else
    success "Todos los archivos requeridos están presentes"
    return 0
  fi
}

# Función para verificar configuración de Docker
check_docker_config() {
  log "Verificando configuración de Docker..."

  local issues=()

  # Verificar Dockerfile
  if [[ -f "Dockerfile" ]]; then
    if grep -q "FROM" Dockerfile; then
      success "✅ Dockerfile válido"
    else
      issues+=("Dockerfile sin FROM")
    fi

    if grep -q "EXPOSE" Dockerfile; then
      success "✅ Puerto expuesto en Dockerfile"
    else
      warning "⚠️ No se encontró EXPOSE en Dockerfile"
    fi
  fi

  # Verificar docker-compose.yml
  if [[ -f "docker-compose.yml" ]]; then
    if command -v docker-compose &>/dev/null; then
      if docker-compose config >/dev/null 2>&1; then
        success "✅ docker-compose.yml válido"
      else
        issues+=("docker-compose.yml inválido")
      fi
    else
      warning "⚠️ docker-compose no disponible para validación"
    fi
  fi

  if [[ ${#issues[@]} -gt 0 ]]; then
    error "Problemas encontrados: ${issues[*]}"
    return 1
  else
    success "Configuración de Docker verificada"
    return 0
  fi
}

# Función para verificar configuración de CI/CD
check_cicd_config() {
  log "Verificando configuración de CI/CD..."

  local issues=()

  # Verificar GitHub Actions
  if [[ -d ".github/workflows" ]]; then
    local workflow_files
    workflow_files=$(find .github/workflows -name "*.yml" -o -name "*.yaml")
    if [[ -n $workflow_files ]]; then
      success "✅ Workflows de GitHub Actions encontrados"

      # Verificar que hay workflow de deploy
      if find .github/workflows -name "*deploy*" | grep -q .; then
        success "✅ Workflow de despliegue encontrado"
      else
        warning "⚠️ No se encontró workflow de despliegue"
      fi
    else
      issues+=("No hay workflows de GitHub Actions")
    fi
  else
    issues+=("Directorio .github/workflows no encontrado")
  fi

  if [[ ${#issues[@]} -gt 0 ]]; then
    error "Problemas encontrados: ${issues[*]}"
    return 1
  else
    success "Configuración de CI/CD verificada"
    return 0
  fi
}

# Función para verificar configuración de Kubernetes
check_kubernetes_config() {
  log "Verificando configuración de Kubernetes..."

  local issues=()

  # Buscar archivos de Kubernetes
  local k8s_files
  k8s_files=$(find . -name "*.yaml" -o -name "*.yml" | grep -E "(k8s|kubernetes|deployment|service)" || true)

  if [[ -n $k8s_files ]]; then
    success "✅ Archivos de Kubernetes encontrados"

    # Verificar que hay deployment
    if find . -name "*.yaml" -o -name "*.yml" | xargs grep -l "kind: Deployment" >/dev/null 2>&1; then
      success "✅ Deployment de Kubernetes encontrado"
    else
      warning "⚠️ No se encontró Deployment de Kubernetes"
    fi

    # Verificar que hay service
    if find . -name "*.yaml" -o -name "*.yml" | xargs grep -l "kind: Service" >/dev/null 2>&1; then
      success "✅ Service de Kubernetes encontrado"
    else
      warning "⚠️ No se encontró Service de Kubernetes"
    fi
  else
    warning "⚠️ No se encontraron archivos de Kubernetes"
  fi

  if [[ ${#issues[@]} -gt 0 ]]; then
    error "Problemas encontrados: ${issues[*]}"
    return 1
  else
    success "Configuración de Kubernetes verificada"
    return 0
  fi
}

# Función para verificar variables de entorno
check_environment_variables() {
  log "Verificando variables de entorno..."

  local issues=()

  # Verificar archivos de entorno
  local env_files
  env_files=$(find . -name ".env*" -o -name "*.env" || true)

  if [[ -n $env_files ]]; then
    success "✅ Archivos de entorno encontrados"

    # Verificar que no hay secretos hardcodeados
    if grep -r "password.*=" .env* 2>/dev/null | grep -v "PASSWORD=" | grep -q .; then
      issues+=("Posibles secretos hardcodeados en archivos .env")
    fi

    if grep -r "secret.*=" .env* 2>/dev/null | grep -v "SECRET=" | grep -q .; then
      issues+=("Posibles secretos hardcodeados en archivos .env")
    fi
  else
    warning "⚠️ No se encontraron archivos de entorno"
  fi

  if [[ ${#issues[@]} -gt 0 ]]; then
    error "Problemas encontrados: ${issues[*]}"
    return 1
  else
    success "Variables de entorno verificadas"
    return 0
  fi
}

# Función para generar reporte JSON
generate_json_report() {
  local status="$1"
  local issues=("${@:2}")
  local output_file="deployment-report.json"

  log "Generando reporte JSON..."

  cat >"$output_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "strategy": "$STRATEGY",
  "status": "$status",
  "total_issues": ${#issues[@]},
  "issues": [
EOF

  for i in "${!issues[@]}"; do
    cat >>"$output_file" <<EOF
    "$(echo "${issues[$i]}" | sed 's/"/\\"/g')"$(if [[ $i -lt $((${#issues[@]} - 1)) ]]; then echo ","; fi)
EOF
  done

  cat >>"$output_file" <<EOF
  ],
  "recommendations": [
    "Ensure all required files are present",
    "Validate Docker configuration",
    "Set up CI/CD pipelines",
    "Configure Kubernetes manifests",
    "Secure environment variables"
  ]
}
EOF

  success "Reporte JSON generado: $output_file"
}

# Función para generar reporte simple
generate_simple_report() {
  local status="$1"
  local issues=("${@:2}")
  local output_file="deployment-report.txt"

  log "Generando reporte simple..."

  cat >"$output_file" <<EOF
# 🚀 Reporte de Deployment Check

## 📅 Fecha: $(date)

## 📈 Resumen
- **Ambiente**: $ENVIRONMENT
- **Estrategia**: $STRATEGY
- **Estado**: $status
- **Total de problemas**: ${#issues[@]}

## 🔍 Problemas Encontrados
EOF

  for issue in "${issues[@]}"; do
    cat >>"$output_file" <<EOF
- $issue
EOF
  done

  cat >>"$output_file" <<EOF

## 💡 Recomendaciones
1. Ensure all required files are present
2. Validate Docker configuration
3. Set up CI/CD pipelines
4. Configure Kubernetes manifests
5. Secure environment variables

---
*Generado por @deployment-manager*
EOF

  success "Reporte simple generado: $output_file"
}

# Función principal
main() {
  log "Iniciando verificación de despliegue..."

  # Verificar dependencias
  check_dependencies

  local all_issues=()
  local has_issues=false

  # Ejecutar verificaciones
  if ! check_required_files; then
    has_issues=true
    all_issues+=("Archivos requeridos faltantes")
  fi

  if ! check_docker_config; then
    has_issues=true
    all_issues+=("Problemas en configuración de Docker")
  fi

  if ! check_cicd_config; then
    has_issues=true
    all_issues+=("Problemas en configuración de CI/CD")
  fi

  if ! check_kubernetes_config; then
    has_issues=true
    all_issues+=("Problemas en configuración de Kubernetes")
  fi

  if ! check_environment_variables; then
    has_issues=true
    all_issues+=("Problemas en variables de entorno")
  fi

  # Generar reporte
  if [[ $has_issues == true ]]; then
    error "Se encontraron problemas en la configuración de despliegue"

    if [[ $OUTPUT_FORMAT == "json" ]]; then
      generate_json_report "FAILED" "${all_issues[@]}"
    else
      generate_simple_report "FAILED" "${all_issues[@]}"
    fi

    if [[ $DEPLOY_STRICT == "1" ]]; then
      exit 1
    else
      warning "Modo no estricto: aprobando con advertencias"
      exit 0
    fi
  else
    success "✅ Verificación de despliegue completada exitosamente"

    if [[ $OUTPUT_FORMAT == "json" ]]; then
      generate_json_report "SUCCESS" "${all_issues[@]}"
    else
      generate_simple_report "SUCCESS" "${all_issues[@]}"
    fi

    exit 0
  fi
}

# Ejecutar función principal
main "$@"
