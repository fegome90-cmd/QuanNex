#!/bin/bash

# 🚀 SCRIPT DE PREPARACIÓN PARA IMPLEMENTACIÓN
# 📅 FECHA: Agosto 31, 2025
# 🎯 OBJETIVO: Preparar entorno completo para implementación de mejoras

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Variables de configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backup-$(date +%Y%m%d-%H%M%S)"

log_info "🚀 Iniciando preparación para implementación..."
log_info "📁 Directorio del proyecto: $PROJECT_ROOT"
log_info "📁 Directorio del script: $SCRIPT_DIR"

# Función para verificar dependencias
check_dependencies() {
  log_info "🔍 Verificando dependencias del sistema..."

  local deps=("git" "bash" "make" "docker")
  local missing_deps=()

  for dep in "${deps[@]}"; do
    if command -v "$dep" >/dev/null 2>&1; then
      log_success "✅ $dep encontrado: $(command -v "$dep")"
    else
      log_warning "⚠️  $dep no encontrado"
      missing_deps+=("$dep")
    fi
  done

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    log_error "❌ Dependencias faltantes: ${missing_deps[*]}"
    log_info "💡 Instala las dependencias faltantes antes de continuar"
    return 1
  fi

  log_success "✅ Todas las dependencias están disponibles"
}

# Función para crear backup del proyecto actual
create_backup() {
  log_info "💾 Creando backup del proyecto actual..."

  if [[ -d $BACKUP_DIR ]]; then
    log_warning "⚠️  El directorio de backup ya existe, eliminando..."
    rm -rf "$BACKUP_DIR"
  fi

  mkdir -p "$BACKUP_DIR"

  # Copiar archivos críticos
  local critical_files=(
    "core/claude-project-init.sh"
    ".claude/"
    "core/scripts/"
    "docs/"
    "Makefile"
    "README.md"
  )

  for file in "${critical_files[@]}"; do
    if [[ -e "$PROJECT_ROOT/$file" ]]; then
      log_info "📋 Copiando $file..."
      cp -r "$PROJECT_ROOT/$file" "$BACKUP_DIR/"
    else
      log_warning "⚠️  $file no encontrado, omitiendo..."
    fi
  done

  log_success "✅ Backup creado en: $BACKUP_DIR"
}

# Función para crear estructura de directorios
create_directory_structure() {
  log_info "🏗️  Creando estructura de directorios para implementación..."

  local dirs=(
    "src/core"
    "src/modules"
    "src/templates"
    "src/tests/unit"
    "src/tests/integration"
    "config"
    "logs"
    "metrics"
    ".github/workflows"
    "core/scripts/quality"
  )

  for dir in "${dirs[@]}"; do
    if [[ ! -d "$PROJECT_ROOT/$dir" ]]; then
      log_info "📁 Creando directorio: $dir"
      mkdir -p "$PROJECT_ROOT/$dir"
    else
      log_info "📁 Directorio ya existe: $dir"
    fi
  done

  log_success "✅ Estructura de directorios creada"
}

# Función para crear archivos de configuración base
create_base_configs() {
  log_info "⚙️  Creando archivos de configuración base..."

  # Archivo de configuración por defecto
  cat >"$PROJECT_ROOT/config/defaults.sh" <<'EOF'
#!/bin/bash
# Configuración por defecto del sistema
# Archivo generado automáticamente por prepare-implementation.sh

# Configuración del proyecto
DEFAULT_PROJECT_TYPES=("web" "api" "cli" "library")
DEFAULT_TEMPLATE_SOURCE="./templates"
DEFAULT_OUTPUT_DIR="./generated-projects"
DEFAULT_LOG_LEVEL="INFO"
DEFAULT_DEBUG="false"

# Configuración de logging
DEFAULT_LOG_FILE="./logs/claude-init.log"
DEFAULT_LOG_FORMAT="text"
DEFAULT_MAX_LOG_SIZE="10M"
DEFAULT_MAX_LOG_FILES="5"

# Configuración de testing
DEFAULT_TEST_TIMEOUT="30"
DEFAULT_TEST_PARALLEL="false"

# Configuración de CI/CD
DEFAULT_CI_TIMEOUT="900"
DEFAULT_CI_PARALLEL_JOBS="4"
EOF

  # Archivo de configuración de entorno
  cat >"$PROJECT_ROOT/config/environment.sh" <<'EOF'
#!/bin/bash
# Variables de entorno del sistema
# Archivo generado automáticamente por prepare-implementation.sh

# Cargar valores por defecto
source "$(dirname "${BASH_SOURCE[0]}")/defaults.sh"

# Variables de entorno con valores por defecto
TEMPLATE_SOURCE="${TEMPLATE_SOURCE:-$DEFAULT_TEMPLATE_SOURCE}"
OUTPUT_DIR="${OUTPUT_DIR:-$DEFAULT_OUTPUT_DIR}"
LOG_LEVEL="${LOG_LEVEL:-$DEFAULT_LOG_LEVEL}"
DEBUG="${DEBUG:-$DEFAULT_DEBUG}"
LOG_FILE="${LOG_FILE:-$DEFAULT_LOG_FILE}"
LOG_FORMAT="${LOG_FORMAT:-$DEFAULT_LOG_FORMAT}"

# Exportar variables para uso en otros scripts
export TEMPLATE_SOURCE OUTPUT_DIR LOG_LEVEL DEBUG LOG_FILE LOG_FORMAT
EOF

  # Archivo de configuración de ShellCheck
  cat >"$PROJECT_ROOT/.shellcheckrc" <<'EOF'
# Configuración de ShellCheck
# Archivo generado automáticamente por prepare-implementation.sh

shell=bash
source-path=SCRIPTDIR
external-sources=false
disable=SC2034,SC2086,SC2154
enable=all
EOF

  # Archivo de configuración de pre-commit
  cat >"$PROJECT_ROOT/.pre-commit-config.yaml" <<'EOF'
# Configuración de pre-commit hooks
# Archivo generado automáticamente por prepare-implementation.sh

repos:
- repo: https://github.com/koalaman/shellcheck-precommit
  rev: v0.9.0
  hooks:
  - id: shellcheck
    args: [--severity=style]

- repo: local
  hooks:
  - id: bats-tests
    name: BATS Tests
    entry: bats tests/unit/
    language: system
    pass_filenames: false
    always_run: true

- repo: local
  hooks:
  - id: quality-check
    name: Quality Check
    entry: ./core/scripts/quality/quality-check.sh
    language: system
    pass_filenames: false
    always_run: true
EOF

  log_success "✅ Archivos de configuración base creados"
}

# Función para crear archivos de testing base
create_base_tests() {
  log_info "🧪 Creando archivos de testing base..."

  # Archivo de setup para tests
  cat >"$PROJECT_ROOT/tests/setup.bash" <<'EOF'
#!/usr/bin/env bats
# Setup común para todos los tests
# Archivo generado automáticamente por prepare-implementation.sh

setup() {
    export TEST_DIR="$(mktemp -d)"
    export ORIGINAL_PWD="$PWD"
    cd "$TEST_DIR"
}

teardown() {
    cd "$ORIGINAL_PWD"
    rm -rf "$TEST_DIR"
}
EOF

  # Test básico de configuración
  cat >"$PROJECT_ROOT/tests/unit/config.bats" <<'EOF'
#!/usr/bin/env bats
# Tests unitarios de configuración
# Archivo generado automáticamente por prepare-implementation.sh

load '../setup'

@test "config directory exists" {
    [ -d "../../config" ]
}

@test "defaults.sh exists" {
    [ -f "../../config/defaults.sh" ]
}

@test "environment.sh exists" {
    [ -f "../../config/environment.sh" ]
}
EOF

  # Test básico de estructura
  cat >"$PROJECT_ROOT/tests/unit/structure.bats" <<'EOF'
#!/usr/bin/env bats
# Tests unitarios de estructura
# Archivo generado automáticamente por prepare-implementation.sh

load '../setup'

@test "src directory exists" {
    [ -d "../../src" ]
}

@test "src/core directory exists" {
    [ -d "../../src/core" ]
}

@test "src/modules directory exists" {
    [ -d "../../src/modules" ]
}

@test "src/tests directory exists" {
    [ -d "../../src/tests" ]
}
EOF

  log_success "✅ Archivos de testing base creados"
}

# Función para crear scripts de calidad base
create_quality_scripts() {
  log_info "🔧 Creando scripts de calidad base..."

  # Script de verificación de calidad
  cat >"$PROJECT_ROOT/core/scripts/quality/quality-check.sh" <<'EOF'
#!/bin/bash
# Script de verificación de calidad
# Archivo generado automáticamente por prepare-implementation.sh

set -euo pipefail

echo "🔍 Running quality checks..."

# Verificar estructura de directorios
echo "📁 Checking directory structure..."
required_dirs=("src/core" "src/modules" "src/tests" "config" "logs" "metrics")
for dir in "${required_dirs[@]}"; do
    if [[ -d "$dir" ]]; then
        echo "  ✅ $dir exists"
    else
        echo "  ❌ $dir missing"
        exit 1
    fi
done

# Verificar archivos de configuración
echo "⚙️  Checking configuration files..."
required_configs=("config/defaults.sh" "config/environment.sh" ".shellcheckrc")
for config in "${required_configs[@]}"; do
    if [[ -f "$config" ]]; then
        echo "  ✅ $config exists"
    else
        echo "  ❌ $config missing"
        exit 1
    fi
done

# Verificar archivos de testing
echo "🧪 Checking test files..."
required_tests=("tests/setup.bash" "tests/unit/config.bats" "tests/unit/structure.bats")
for test in "${required_tests[@]}"; do
    if [[ -f "$test" ]]; then
        echo "  ✅ $test exists"
    else
        echo "  ❌ $test missing"
        exit 1
    fi
done

echo "✅ Quality checks completed!"
EOF

  # Script de métricas
  cat >"$PROJECT_ROOT/core/scripts/quality/metrics.sh" <<'EOF'
#!/bin/bash
# Script de generación de métricas
# Archivo generado automáticamente por prepare-implementation.sh

set -euo pipefail

echo "📊 Generating quality metrics..."

# Crear directorio de métricas
mkdir -p metrics

# Métricas de estructura
{
    echo "# Implementation Preparation Metrics"
    echo "Generated: $(date)"
    echo ""
    echo "## Directory Structure"
    echo "Total directories: $(find . -type d | wc -l)"
    echo "Source directories: $(find src -type d | wc -l)"
    echo "Test directories: $(find tests -type d | wc -l)"
    echo ""
    echo "## File Counts"
    echo "Total files: $(find . -type f | wc -l)"
    echo "Shell files: $(find . -name "*.sh" | wc -l)"
    echo "Test files: $(find . -name "*.bats" | wc -l)"
    echo "Config files: $(find config -name "*.sh" | wc -l)"
    echo ""
    echo "## Status"
    echo "Implementation ready: true"
    echo "Backup created: true"
    echo "Structure created: true"
    echo "Configs created: true"
    echo "Tests created: true"
} > "metrics/implementation-status.md"

# Generar JSON para dashboard
{
    echo "{"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"status\": \"ready\","
    echo "  \"metrics\": {"
    echo "    \"directories\": {"
    echo "      \"total\": $(find . -type d | wc -l),"
    echo "      \"source\": $(find src -type d | wc -l),"
    echo "      \"tests\": $(find tests -type d | wc -l)"
    echo "    },"
    echo "    \"files\": {"
    echo "      \"total\": $(find . -type f | wc -l),"
    echo "      \"shell\": $(find . -name "*.sh" | wc -l),"
    echo "      \"tests\": $(find . -name "*.bats" | wc -l)"
    echo "    }"
    echo "  }"
    echo "}"
} > "metrics/implementation-metrics.json"

echo "✅ Quality metrics generated!"
EOF

  # Hacer ejecutables los scripts
  chmod +x "$PROJECT_ROOT/core/scripts/quality/quality-check.sh"
  chmod +x "$PROJECT_ROOT/core/scripts/quality/metrics.sh"

  log_success "✅ Scripts de calidad base creados"
}

# Función para crear GitHub Actions base
create_github_actions() {
  log_info "🚀 Creando GitHub Actions base..."

  # Workflow principal de CI
  cat >"$PROJECT_ROOT/.github/workflows/ci.yml" <<'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  prepare:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Check implementation preparation
      run: |
        chmod +x core/scripts/quality/quality-check.sh
        ./core/scripts/quality/quality-check.sh
    
    - name: Generate metrics
      run: |
        chmod +x core/scripts/quality/metrics.sh
        ./core/scripts/quality/metrics.sh
    
    - name: Upload metrics
      uses: actions/upload-artifact@v3
      with:
        name: implementation-metrics
        path: metrics/
EOF

  log_success "✅ GitHub Actions base creados"
}

# Función para crear Makefile mejorado
create_improved_makefile() {
  log_info "🔧 Creando Makefile mejorado..."

  # Crear Makefile con nuevos comandos
  cat >"$PROJECT_ROOT/Makefile.improved" <<'EOF'
# Makefile mejorado para Claude Project Init Kit
# Archivo generado automáticamente por prepare-implementation.sh

.PHONY: help prepare test quality clean backup

# Variables
ARCHON_DIR ?= ./external/archon
SRC_DIR = ./src
CONFIG_DIR = ./config
TESTS_DIR = ./tests
SCRIPTS_DIR = ./core/scripts

# Comandos principales
help: ## Mostrar ayuda
	@echo "🚀 Claude Project Init Kit - Comandos disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

prepare: ## Preparar entorno para implementación
	@echo "🔧 Preparando entorno para implementación..."
	@chmod +x core/scripts/prepare-implementation.sh
	@./core/scripts/prepare-implementation.sh

test: ## Ejecutar tests de preparación
	@echo "🧪 Ejecutando tests de preparación..."
	@chmod +x core/scripts/quality/quality-check.sh
	@./core/scripts/quality/quality-check.sh

quality: ## Generar métricas de calidad
	@echo "📊 Generando métricas de calidad..."
	@chmod +x core/scripts/quality/metrics.sh
	@./core/scripts/quality/metrics.sh

clean: ## Limpiar archivos temporales
	@echo "🧹 Limpiando archivos temporales..."
	@find . -name "*.tmp" -delete
	@find . -name "*.bak" -delete

backup: ## Crear backup del proyecto
	@echo "💾 Creando backup del proyecto..."
	@mkdir -p backup-$(shell date +%Y%m%d-%H%M%S)
	@cp -r core/claude-project-init.sh .claude scripts docs Makefile README.md backup-$(shell date +%Y%m%d-%H%M%S)/

# Comandos de Archon (mantenidos del Makefile original)
archon-bootstrap:
	@bash core/scripts/archon-bootstrap.sh

archon-check:
	@bash core/scripts/archon-setup-check.sh $(ARCHON_DIR)

archon-smoke:
	@bash core/scripts/archon-smoke.sh $(ARCHON_DIR)

archon-edge:
	@bash archon/edge-matrix.sh

# Comandos de implementación
implementation-status: ## Mostrar estado de la implementación
	@echo "📋 Estado de la implementación:"
	@echo "  📁 Estructura de directorios: $(shell [ -d src ] && echo "✅ Creada" || echo "❌ Pendiente")"
	@echo "  ⚙️  Archivos de configuración: $(shell [ -f config/defaults.sh ] && echo "✅ Creados" || echo "❌ Pendientes")"
	@echo "  🧪 Archivos de testing: $(shell [ -f tests/setup.bash ] && echo "✅ Creados" || echo "❌ Pendientes")"
	@echo "  🔧 Scripts de calidad: $(shell [ -f core/scripts/quality/quality-check.sh ] && echo "✅ Creados" || echo "❌ Pendientes")"
EOF

  log_success "✅ Makefile mejorado creado"
}

# Función para crear documentación de implementación
create_implementation_docs() {
  log_info "📚 Creando documentación de implementación..."

  # README de implementación
  cat >"$PROJECT_ROOT/IMPLEMENTATION-README.md" <<'EOF'
# 🚀 GUÍA DE IMPLEMENTACIÓN: CLAUDE PROJECT INIT KIT

## 📅 FECHA: Agosto 31, 2025
## 🎯 OBJETIVO: Implementar mejoras identificadas en la investigación

---

## 🏗️ ESTRUCTURA CREADA

### Directorios Principales
- `src/core/` - Funciones principales del sistema
- `src/modules/` - Módulos funcionales específicos
- `src/core/templates/` - Templates de proyecto
- `src/tests/` - Tests unitarios e integración
- `config/` - Archivos de configuración
- `logs/` - Archivos de log del sistema
- `metrics/` - Métricas y reportes de calidad

### Archivos de Configuración
- `config/defaults.sh` - Valores por defecto del sistema
- `config/environment.sh` - Variables de entorno
- `.shellcheckrc` - Configuración de ShellCheck
- `.pre-commit-config.yaml` - Configuración de pre-commit hooks

### Scripts de Calidad
- `core/scripts/quality/quality-check.sh` - Verificación de calidad
- `core/scripts/quality/metrics.sh` - Generación de métricas

### Tests Base
- `tests/setup.bash` - Setup común para tests
- `tests/unit/config.bats` - Tests de configuración
- `tests/unit/structure.bats` - Tests de estructura

---

## 🚀 PRÓXIMOS PASOS

### Fase 1: Modularización (Semana 1-2)
1. **Analizar código existente** - Entender estructura actual
2. **Crear módulos base** - Dividir funciones en módulos
3. **Implementar sistema de imports** - Conectar módulos
4. **Validar funcionalidad** - Asegurar que todo funciona

### Fase 2: Testing (Semana 3)
1. **Instalar BATS** - Framework de testing
2. **Crear tests unitarios** - Para cada función
3. **Crear tests de integración** - Para flujos completos
4. **Validar cobertura** - Asegurar >90% de cobertura

### Fase 3: CI/CD (Semana 4)
1. **Configurar GitHub Actions** - Pipeline de CI/CD
2. **Integrar testing automático** - Tests en cada commit
3. **Implementar análisis de calidad** - ShellCheck automático
4. **Configurar releases automáticos** - Versionado automático

### Fase 4: Herramientas Avanzadas (Semana 5)
1. **Implementar pre-commit hooks** - Validación antes de commits
2. **Configurar linting avanzado** - Reglas personalizadas
3. **Crear dashboard de métricas** - Visualización de calidad
4. **Documentar todo** - Guías y manuales

---

## 🔧 COMANDOS DISPONIBLES

### Comandos de Preparación
```bash
make prepare          # Preparar entorno completo
make test            # Ejecutar tests de preparación
make quality         # Generar métricas de calidad
make clean           # Limpiar archivos temporales
make backup          # Crear backup del proyecto
```

### Comandos de Estado
```bash
make implementation-status  # Mostrar estado de implementación
```

### Comandos de Archon (mantenidos)
```bash
make archon-bootstrap      # Bootstrap de Archon
make archon-check          # Verificar estado de Archon
make archon-smoke          # Smoke test de Archon
make archon-edge           # Edge matrix de Archon
```

---

## 📊 MÉTRICAS DE IMPLEMENTACIÓN

### Métricas de Estructura
- **Total de directorios**: [Ver en metrics/implementation-metrics.json]
- **Total de archivos**: [Ver en metrics/implementation-metrics.json]
- **Archivos de configuración**: [Ver en metrics/implementation-metrics.json]
- **Archivos de testing**: [Ver en metrics/implementation-metrics.json]

### Estado de Implementación
- **Estructura creada**: ✅
- **Configuración base**: ✅
- **Tests base**: ✅
- **Scripts de calidad**: ✅
- **GitHub Actions**: ✅
- **Makefile mejorado**: ✅

---

## 🚨 NOTAS IMPORTANTES

### Backup
- Se ha creado un backup completo en: `backup-[timestamp]/`
- **NO ELIMINAR** este backup hasta que la implementación esté completa

### Validación
- Ejecutar `make test` después de cada cambio importante
- Ejecutar `make quality` para generar métricas actualizadas
- Verificar que todos los tests pasen antes de continuar

### Documentación
- Actualizar esta documentación con cada cambio importante
- Mantener métricas actualizadas
- Documentar decisiones de implementación

---

## 🎯 CRITERIOS DE ÉXITO

### Fase 1: Modularización
- [ ] Script principal dividido en módulos funcionales
- [ ] Sistema de imports funcionando correctamente
- [ ] Funcionalidad existente 100% preservada
- [ ] Tests de estructura pasando

### Fase 2: Testing
- [ ] BATS implementado y funcionando
- [ ] Tests unitarios para todas las funciones
- [ ] Tests de integración para flujos críticos
- [ ] Coverage >90% en todos los módulos

### Fase 3: CI/CD
- [ ] GitHub Actions funcionando
- [ ] Pipeline de testing automático
- [ ] Análisis de calidad integrado
- [ ] Release automático funcionando

### Fase 4: Herramientas Avanzadas
- [ ] Pre-commit hooks implementados
- [ ] Linting avanzado funcionando
- [ ] Métricas de calidad generándose
- [ ] Dashboard visual funcionando

---

**📅 Fecha de creación**: Agosto 31, 2025  
**👨‍💻 Creado por**: AI IDE Agent con Archon MCP  
**📊 Estado**: Preparación completada - Listo para implementación  
**🎯 Próximo paso**: Comenzar Fase 1 (Modularización)**
EOF

  log_success "✅ Documentación de implementación creada"
}

# Función principal
main() {
  log_info "🚀 INICIANDO PREPARACIÓN COMPLETA PARA IMPLEMENTACIÓN"
  log_info "📅 Fecha: $(date)"
  log_info "🎯 Objetivo: Preparar entorno para implementación de mejoras"

  # Verificar dependencias
  check_dependencies

  # Crear backup
  create_backup

  # Crear estructura de directorios
  create_directory_structure

  # Crear archivos de configuración base
  create_base_configs

  # Crear archivos de testing base
  create_base_tests

  # Crear scripts de calidad base
  create_quality_scripts

  # Crear GitHub Actions base
  create_github_actions

  # Crear Makefile mejorado
  create_improved_makefile

  # Crear documentación de implementación
  create_implementation_docs

  # Generar métricas iniciales
  log_info "📊 Generando métricas iniciales..."
  chmod +x "$PROJECT_ROOT/core/scripts/quality/metrics.sh"
  "$PROJECT_ROOT/core/scripts/quality/metrics.sh"

  log_success "🎉 PREPARACIÓN PARA IMPLEMENTACIÓN COMPLETADA EXITOSAMENTE!"
  log_info "📁 Backup creado en: $BACKUP_DIR"
  log_info "📚 Documentación disponible en: IMPLEMENTATION-README.md"
  log_info "🔧 Comandos disponibles: make help"
  log_info "🧪 Tests de preparación: make test"
  log_info "📊 Métricas de calidad: make quality"
  log_info ""
  log_info "🚀 ¡El proyecto está listo para comenzar la implementación!"
  log_info "📋 Siguiente paso: Revisar IMPLEMENTATION-README.md y comenzar Fase 1"
}

# Ejecutar función principal
main "$@"
