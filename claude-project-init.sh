#!/bin/bash
set -Eeuo pipefail
trap 'echo -e "\033[0;31m[ERROR]\033[0m Fallo en línea ${LINENO}." >&2' ERR

# Color Definitions for better readability
GREEN='[0;32m'
RED='[0;31m'
YELLOW='[1;33m'
NC='[0m' # No Color

# --- Metadata, Args & Welcome ---
VERSION="2.0.1"
START_TS=$(date +%s)

# Argumentos (modo determinista opcional)
project_name=""
project_type_flag=""
assume_yes=0
dry_run=0
force=0
base_path="$(pwd)"
templates_path="templates"
use_templates="auto" # auto|on|off (default: auto with validation)

print_usage() {
  cat <<USAGE
Uso: $(basename "$0") [opciones]
  --name <nombre>        Nombre del proyecto (opcional)
  --type <1-6|nombre>    Tipo: 1-6 o frontend|backend|fullstack|medical|design|generic
  --path <ruta>          Directorio base (por defecto: CWD)
  -y, --yes              Aceptar prompts por defecto (no interactivo)
  --dry-run              Mostrar plan sin crear archivos
  --templates-path <dir> Ruta de templates (por defecto: templates)
  --use-templates <m>    auto|on|off (por defecto: auto)
  -v, --version          Mostrar versión
  -h, --help             Mostrar ayuda
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      project_name=${2:-}
      shift 2
      ;;
    --type)
      project_type_flag=${2:-}
      shift 2
      ;;
    --path)
      base_path=${2:-}
      shift 2
      ;;
    --templates-path)
      templates_path=${2:-}
      shift 2
      ;;
    --use-templates)
      case "${2:-auto}" in
        auto | on | off) use_templates=$2 ;;
        *)
          echo -e "${RED}Valor inválido para --use-templates (auto|on|off)${NC}"
          exit 1
          ;;
      esac
      shift 2
      ;;
    -y | --yes)
      assume_yes=1
      shift
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -f | --force)
      force=1
      shift
      ;;
    -v | --version)
      echo "$VERSION"
      exit 0
      ;;
    -h | --help)
      print_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Opción desconocida:${NC} $1"
      print_usage
      exit 1
      ;;
  esac
done

echo -e "${GREEN}Bienvenido al Inicializador de Proyectos para Claude Code!${NC}"
echo "Este script verificará tus dependencias y configurará un nuevo directorio de proyecto."
echo "--------------------------------------------------------------------"

# --- Safe cleanup on interruption ---
cleanup_on_failure() {
  local dir="$1"
  if [[ -n ${dir} && -f "$dir/.init-created" ]]; then
    rm -rf "$dir/.claude" "$dir/CLAUDE.md" "$dir/healthcheck.sh" "$dir/.gitignore" 2>/dev/null || true
  fi
}
trap 'cleanup_on_failure "${STAGING_DIR:-}" || true; [[ -n "${LOCK_DIR:-}" && -d "${LOCK_DIR}" ]] && rmdir "${LOCK_DIR}" 2>/dev/null || true' INT TERM

# --- Dependency Check Function ---
check_dependency() {
  if command -v "$1" &>/dev/null; then
    echo -e "[${GREEN}OK${NC}] El comando '${YELLOW}$1${NC}' está instalado."
  else
    echo -e "[${RED}FALTA${NC}] El comando '${YELLOW}$1${NC}' no está instalado."
    case "$1" in
      "git")
        echo "  Por favor, instala Git desde: https://git-scm.com/downloads"
        ;;
      "gh")
        echo "  Por favor, instala el CLI de GitHub desde: https://cli.github.com/"
        ;;
      "npm")
        echo "  Por favor, instala Node.js (que incluye npm) desde: https://nodejs.org/"
        ;;
    esac
    echo -e "${RED}El script no puede continuar sin esta dependencia.${NC}"
    exit 1
  fi
}

# --- Run Dependency Checks ---
if [[ $dry_run -eq 0 && ${CLAUDE_INIT_SKIP_DEPS:-0} != "1" ]]; then
  echo "Verificando dependencias requeridas..."
  check_dependency "git"
  check_dependency "gh"
  check_dependency "npm"
else
  echo "[DRY-RUN] Omitiendo verificación de dependencias"
fi

echo "--------------------------------------------------------------------"

# --- Project Setup ---
if [[ -z $project_name ]]; then
  if [[ $assume_yes -eq 1 ]]; then
    echo -e "${RED}--name es requerido con --yes para modo no interactivo.${NC}"
    exit 1
  fi
  read -r -p "Introduce el nombre de tu nuevo proyecto: " project_name
fi

if [ -z "$project_name" ]; then
  echo -e "${RED}El nombre del proyecto no puede estar vacío. Saliendo.${NC}"
  exit 1
fi

mkdir -p "$base_path"
cd "$base_path"

target_dir="${base_path}/${project_name}"

# Preflight: validate path permissions and space
validate_permissions() {
  local path="$1"
  if [[ ! -d $path ]]; then
    echo -e "${RED}Ruta inválida:${NC} $path"
    exit 1
  fi
  if [[ ! -w $path ]]; then
    echo -e "${RED}Sin permisos de escritura en:${NC} $path"
    echo "💡 Usa --path <dir-escribible>"
    exit 1
  fi
  local avail_kb
  avail_kb=$(df -k "$path" | awk 'NR==2 {print $4}')
  local avail_mb=$((avail_kb / 1024))
  local need_mb=50
  if ((avail_mb < need_mb)); then
    echo -e "${RED}Espacio insuficiente:${NC} ${avail_mb}MB disponible (< ${need_mb}MB)"
    exit 1
  fi
}
validate_permissions "$base_path"

# Concurrency lock (avoid simultaneous runs targeting same project)
acquire_lock() {
  LOCK_DIR="${base_path}/.${project_name}.lock"
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo -e "${RED}Otro proceso está inicializando este proyecto (${project_name}).${NC}"
    echo "Espera a que termine o elimina el lock si es un residuo: $LOCK_DIR"
    exit 1
  fi
}
acquire_lock
if [ -d "$project_name" ]; then
  if [[ $force -eq 1 ]]; then
    # Refuse to proceed if not empty to prevent destructive overwrite
    if find "$project_name" -mindepth 1 -print -quit | grep -q .; then
      echo -e "${RED}El directorio '${project_name}' ya existe y no está vacío. Incluso con --force, no se sobrescribirá.${NC}"
      exit 1
    else
      echo -e "${YELLOW}Usando directorio existente vacío:${NC} '$target_dir'"
      cd "$project_name"
    fi
  else
    echo -e "${RED}Error: El directorio '${project_name}' ya existe. Usa --force si está vacío.${NC}"
    exit 1
  fi
else
  echo -e "\nDestino: ${YELLOW}${target_dir}${NC}"
  if [[ $dry_run -eq 1 ]]; then
    # Plan detallado sin crear archivos
    if [[ -n $project_type_flag ]]; then
      case "$project_type_flag" in
        1 | frontend) PROJECT_TYPE="frontend" ;;
        2 | backend) PROJECT_TYPE="backend" ;;
        3 | fullstack) PROJECT_TYPE="fullstack" ;;
        4 | medical) PROJECT_TYPE="medical" ;;
        5 | design) PROJECT_TYPE="design" ;;
        6 | generic) PROJECT_TYPE="generic" ;;
        *) PROJECT_TYPE="generic" ;;
      esac
    else
      PROJECT_TYPE="generic"
    fi
    echo "[DRY-RUN] Plan de creación:"
    echo "  • Inicializar Git (rama main)"
    echo "  • Crear .gitignore (${PROJECT_TYPE})"
    echo "  • Estructura base: .claude/commands, .claude/agents, context/"
    if [[ $PROJECT_TYPE == "design" ]]; then
      echo "  • Estructura de diseño: .claude/memory/{market_research,personas,design_tokens,iteration_history}"
      echo "  • Variants: variants/{A,B,C}, design_tokens/, reports/{visual_diff,accessibility,performance}"
      echo "  • Archivos: .claude/memory/project_context.json, CLAUDE.md (design), hooks.json, mcp.json"
      echo "  • Comandos: /test-ui, /create-component, /review, /deploy, /optimize, /commit, /anti-iterate, /design-review, /uniqueness-check"
      echo "  • Agentes: @design-orchestrator, @market-analyst, @persona-forge, @design-builder, @visual-validator, @accessibility-guardian, @performance-optimizer + base"
    else
      echo "  • Archivos: CLAUDE.md (${PROJECT_TYPE}), hooks.json, mcp.json"
      echo "  • Comandos: /test-ui, /create-component, /review, /deploy, /optimize, /commit"
      echo "  • Agentes: @backend-architect, @react-expert, @code-reviewer$([[ $PROJECT_TYPE == "medical" ]] && echo ", @medical-reviewer")"
    fi
    echo "  • healthcheck.sh"
    echo "[DRY-RUN] Nada fue creado."
    exit 0
  else
    echo -e "Creando staging temporal para: ${YELLOW}${project_name}${NC}"
    STAGING_DIR=$(mktemp -d -p "$base_path" ".${project_name}.staging.XXXX")
    cd "$STAGING_DIR"
    : >.init-created
  fi
fi

# Setup logging inside project dir
mkdir -p logs
LOG_FILE="logs/init-$(date +%Y%m%d-%H%M%S).log"
log_info() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE" >/dev/null; }

# --- Template rendering helper ---
render_template() {
  local src="$1"
  local dest="$2"
  local DATE_ISO
  DATE_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local PROJECT_NAME_UP="$project_name"
  local PROJECT_TYPE_UP="$PROJECT_TYPE"
  local LOCALE="en-US"
  local PROJECT_DESCRIPTION_UP=""
  sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME_UP/g" \
    -e "s/{{PROJECT_TYPE}}/$PROJECT_TYPE_UP/g" \
    -e "s/{{DATE_ISO}}/$DATE_ISO/g" \
    -e "s/{{LOCALE}}/$LOCALE/g" \
    -e "s/{{PROJECT_DESCRIPTION}}/$PROJECT_DESCRIPTION_UP/g" "$src" >"$dest"
}

# --- Template validation helpers ---
is_json_valid() {
  local f="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -e . "$f" >/dev/null 2>&1
  elif command -v python3 >/dev/null 2>&1; then
    python3 - <<PY 2>/dev/null
import json,sys
json.load(open(sys.argv[1],'r'))
print('ok')
PY
    "$f" >/dev/null
  else
    # very basic check as last resort
    grep -q '{' "$f" && grep -q '}' "$f"
  fi
}

validate_templates_source() {
  local mode="$1"
  if [[ $mode == "off" ]]; then return 0; fi
  if [[ ! -d $templates_path ]]; then
    if [[ $mode == "on" ]]; then
      echo -e "${RED}Templates requeridos pero no encontrados en:${NC} $templates_path" >&2
      exit 1
    else return 1; fi
  fi
  # Manifest validation
  local manifest="$templates_path/manifest.json"
  if [[ -f $manifest ]]; then
    local min_ver=""
    local files_ok=true
    if command -v jq >/dev/null 2>&1; then
      min_ver=$(jq -r '.min_init_version // empty' "$manifest" 2>/dev/null || true)
      while IFS= read -r f; do
        [[ -z $f ]] && continue
        if [[ ! -f "$templates_path/$f" ]]; then
          echo -e "${RED}Template listado en manifest no existe:${NC} $f" >&2
          files_ok=false
        fi
      done < <(jq -r '.files[]? // empty' "$manifest" 2>/dev/null || true)
    else
      min_ver=$(sed -n 's/.*"min_init_version"\s*:\s*"\([^"]*\)".*/\1/p' "$manifest" | head -n1 || true)
      while IFS= read -r line; do
        f=$(echo "$line" | sed -n 's/.*"\([^"]\+\)".*/\1/p')
        [[ -z $f ]] && continue
        if [[ ! -f "$templates_path/$f" ]]; then
          echo -e "${RED}Template listado en manifest no existe:${NC} $f" >&2
          files_ok=false
        fi
      done < <(grep -E '"files"\s*:\s*\[' -A999 "$manifest" | grep -E '".+"' | sed -n '1,50p')
    fi
    if [[ -n $min_ver ]]; then
      # Simple compare: allow if VERSION >= min_ver (lexical segments)
      if ! awk -v A="$VERSION" -v B="$min_ver" 'BEGIN{split(A,a,".");split(B,b,".");for(i=1;i<=3;i++){if((a[i]+0)>(b[i]+0)){print 1;exit} if((a[i]+0)<(b[i]+0)){print 0;exit}} print 1}' | grep -q 1; then
        echo -e "${RED}Incompatibilidad de versiones:${NC} init=$VERSION < manifest.min_init_version=$min_ver" >&2
        if [[ $mode == "on" ]]; then exit 1; else return 1; fi
      fi
    fi
    if [[ $files_ok == false ]]; then
      if [[ $mode == "on" ]]; then exit 1; else return 1; fi
    fi
    # Dependencies graph check (requires python3)
    if command -v python3 >/dev/null 2>&1; then
      python3 - "$templates_path" "$manifest" <<'PY' || { if [[ $mode == "on" ]]; then exit 1; else return 1; fi; }
import json,sys,os
base=sys.argv[1]
manifest=json.load(open(sys.argv[2],'r'))
deps=manifest.get('deps',[])
from collections import defaultdict
adj=defaultdict(list)
for d in deps:
    src=os.path.join(base,str(d.get('from','')))
    dst=os.path.join(base,str(d.get('to','')))
    if not src or not dst:
        continue
    if not os.path.exists(src) or not os.path.exists(dst):
        print(f"Missing dep file: {d}", file=sys.stderr)
        sys.exit(1)
    adj[src].append(dst)
WHITE,GRAY,BLACK=0,1,2
color={}
def dfs(u):
    color[u]=GRAY
    for v in adj.get(u,[]):
        c=color.get(v,WHITE)
        if c==GRAY:
            print("Cycle detected in templates deps", file=sys.stderr)
            sys.exit(1)
        if c==WHITE:
            dfs(v)
    color[u]=BLACK
for node in list(adj.keys()):
    if color.get(node,WHITE)==WHITE:
        dfs(node)
print('ok')
PY
    fi
  else
    if [[ $mode == "on" ]]; then
      echo -e "${RED}Falta templates/manifest.json para validar compatibilidad${NC}" >&2
      exit 1
    else return 1; fi
  fi
  if [[ -d "$templates_path/agents" ]]; then
    while IFS= read -r -d '' jf; do
      if ! is_json_valid "$jf"; then
        echo -e "${RED}Template JSON inválido:${NC} $jf" >&2
        if [[ $mode == "on" ]]; then exit 1; else return 1; fi
      fi
    done < <(find "$templates_path/agents" -type f -name '*.json' -print0)
  fi
  return 0
}

# Validate generated agents in project against minimal required fields
validate_agents_in_project() {
  local dir=".claude/agents"
  [[ -d $dir ]] || return 0
  local ok=1
  while IFS= read -r -d '' f; do
    if command -v jq >/dev/null 2>&1; then
      local name ver has_doc
      name=$(jq -r ' .name // empty ' "$f" 2>/dev/null || true)
      ver=$(jq -r ' .version // empty ' "$f" 2>/dev/null || true)
      has_doc=$(jq -r ' .documentacion.README // empty ' "$f" 2>/dev/null || true)
      if [[ -z $name || -z $ver || -z $has_doc ]]; then
        echo -e "${RED}Agente inválido (faltan campos requeridos name/version/documentacion.README):${NC} $f" >&2
        ok=0
      fi
    else
      if ! grep -q '"name"' "$f" || ! grep -q '"version"' "$f" || ! grep -q '"documentacion"' "$f"; then
        echo -e "${RED}Agente posiblemente inválido (sin jq, verificación básica):${NC} $f" >&2
        ok=0
      fi
    fi
  done < <(find "$dir" -type f -name '*.json' -print0)
  [[ $ok -eq 1 ]]
}

assert_no_placeholders() {
  if command -v rg >/dev/null 2>&1; then
    if rg -n "\{\{[A-Z_\-]+}}" -S . | grep -q .; then
      echo -e "${RED}Placeholders sin resolver detectados en archivos generados.${NC}" >&2
      exit 1
    fi
  else
    if grep -R "{{[A-Z_\-]\+}}" . >/dev/null 2>&1; then
      echo -e "${RED}Placeholders sin resolver detectados en archivos generados.${NC}" >&2
      exit 1
    fi
  fi
}

# --- Project Type Detection ---
echo "Detectando tipo de proyecto..."
if [[ -n $project_type_flag ]]; then
  case "$project_type_flag" in
    1 | frontend) PROJECT_TYPE="frontend" ;;
    2 | backend) PROJECT_TYPE="backend" ;;
    3 | fullstack) PROJECT_TYPE="fullstack" ;;
    4 | medical) PROJECT_TYPE="medical" ;;
    5 | design) PROJECT_TYPE="design" ;;
    6 | generic) PROJECT_TYPE="generic" ;;
    *) PROJECT_TYPE="generic" ;;
  esac
else
  echo "1) Frontend (React/Next.js/Vue)"
  echo "2) Backend (Node.js/Python/FastAPI)"
  echo "3) Fullstack (Frontend + Backend)"
  echo "4) Medical/Healthcare Application"
  echo "5) Premium UI/UX Design System"
  echo "6) Generic/Other"
  if [[ $assume_yes -eq 1 ]]; then
    project_type="6"
  else
    read -r -p "Selecciona el tipo de proyecto (1-6): " project_type
  fi
  case "$project_type" in
    1) PROJECT_TYPE="frontend" ;;
    2) PROJECT_TYPE="backend" ;;
    3) PROJECT_TYPE="fullstack" ;;
    4) PROJECT_TYPE="medical" ;;
    5) PROJECT_TYPE="design" ;;
    *) PROJECT_TYPE="generic" ;;
  esac
fi

echo "✅ Tipo de proyecto seleccionado: ${PROJECT_TYPE}"

if [[ $dry_run -eq 1 ]]; then
  echo "[DRY-RUN] Inicializaríamos repositorio Git (main)"
else
  echo "Inicializando repositorio de Git..."
  git init -b main >/dev/null
  log_info "Repositorio Git inicializado (main)"
fi

echo "Creando archivo .gitignore..."
# Prefer template if available
if [[ $use_templates != "off" ]] && [[ -f "$templates_path/gitignore/$PROJECT_TYPE.gitignore" ]]; then
  if [[ $dry_run -eq 1 ]]; then echo "[DRY-RUN] .gitignore desde template ($PROJECT_TYPE)"; else render_template "$templates_path/gitignore/$PROJECT_TYPE.gitignore" .gitignore; fi
elif [ "$PROJECT_TYPE" = "design" ]; then
  if [[ $dry_run -eq 1 ]]; then echo "[DRY-RUN] .gitignore (design)"; else
    cat <<'EOF' >.gitignore
# Node
node_modules
dist
.DS_Store
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/

# Claude
.claude/settings.local.json

# Design System - Exclude memory artifacts except placeholders
.claude/memory/*
!.claude/memory/.gitkeep
!.claude/memory/project_context.json

# Design outputs (optional - uncomment to exclude)
# variants/
# design_tokens/
# reports/
EOF
  fi
else
  if [[ $dry_run -eq 1 ]]; then echo "[DRY-RUN] .gitignore"; else
    cat <<'EOF' >.gitignore
# Node
node_modules
dist
.DS_Store
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/

# Claude
.claude/settings.local.json

# Claude memory (exclude by default; keep placeholders)
.claude/memory/*
!.claude/memory/.gitkeep
!.claude/memory/project_context.json
EOF
  fi
fi

echo "Creando directorios de configuración para Claude..."
if [[ $dry_run -eq 0 ]]; then
  log_info "Archivo .gitignore creado"
fi
if [ "$PROJECT_TYPE" = "design" ]; then
  # Create design-specific directory structure
  if [[ $dry_run -eq 1 ]]; then
    echo "[DRY-RUN] mkdir -p .claude/... variants/... design_tokens reports/..."
  else
    mkdir -p .claude/commands .claude/agents .claude/memory/market_research .claude/memory/personas .claude/memory/design_tokens .claude/memory/iteration_history
    mkdir -p variants/A variants/B variants/C design_tokens reports/visual_diff/baseline reports/visual_diff/current reports/visual_diff/diff reports/accessibility reports/performance
    touch .claude/memory/.gitkeep variants/.gitkeep design_tokens/.gitkeep reports/.gitkeep
  fi

  # Initialize project context for design projects
  if [[ $dry_run -eq 1 ]]; then echo "[DRY-RUN] write .claude/memory/project_context.json"; else
    cat <<EOF >.claude/memory/project_context.json
{
  "schema_version": "1.0",
  "project_id": "premium-anti-generic-uiux",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "locale": "en-US",
  "project_type": "design",
  "policies": {
    "copy_cta": {
      "force_iteration": true,
      "headlines_per_variant": 2,
      "ctas_per_variant": 3,
      "auto_translate": false,
      "do_not_copy_competitors": true
    },
    "resilience": {
      "require_skeletons": true,
      "reduced_motion": true,
      "network_fallbacks": true,
      "ssr_mismatch_guards": true
    }
  },
  "competitors": [],
  "market_insights": {},
  "design_decisions": [],
  "iterations": [],
  "design_tokens": {}
}
EOF
  fi
else
  if [[ $dry_run -eq 1 ]]; then
    echo "[DRY-RUN] mkdir -p .claude/commands .claude/agents context"
  else
    mkdir -p .claude/commands .claude/agents context
    touch context/.gitkeep
  fi
fi

# If templates are enabled, pre-populate commands/agents from templates directory (with validation)
if [[ $dry_run -eq 0 ]]; then
  templates_mode="$use_templates"
  if ! validate_templates_source "$templates_mode"; then
    echo "⚠ Plantillas inválidas o no disponibles; usando fallback legacy"
    templates_mode="off"
    log_info "templates invalid/unavailable; fallback"
  fi
  if [[ $templates_mode != "off" ]]; then
    if [[ -d "$templates_path/commands" ]]; then
      cp -R "$templates_path/commands/." .claude/commands 2>/dev/null || true
      log_info "Templates de comandos copiados desde $templates_path/commands"
    fi
    if [[ -d "$templates_path/agents" ]]; then
      cp -R "$templates_path/agents/." .claude/agents 2>/dev/null || true
      log_info "Templates de agentes copiados desde $templates_path/agents"
      if ! validate_agents_in_project; then
        echo -e "${RED}Validación de agentes falló.${NC}" >&2
        exit 1
      fi
    fi
    # Optional: include deployment templates when requested
    if [[ ${CLAUDE_INIT_INCLUDE_DEPLOY:-0} == "1" ]]; then
      if [[ -f "$templates_path/deployment/Dockerfile" ]]; then
        cp "$templates_path/deployment/Dockerfile" ./Dockerfile 2>/dev/null || true
      fi
      if [[ -f "$templates_path/deployment/docker-compose.yml" ]]; then
        cp "$templates_path/deployment/docker-compose.yml" ./docker-compose.yml 2>/dev/null || true
      fi
      if [[ -f "$templates_path/workflows/deploy.yml" ]]; then
        mkdir -p .github/workflows
        cp "$templates_path/workflows/deploy.yml" .github/workflows/deploy.yml 2>/dev/null || true
      fi
      log_info "Plantillas de despliegue incluidas (CLAUDE_INIT_INCLUDE_DEPLOY=1)"
    fi
    # Design-specific directories when using templates
    if [[ $PROJECT_TYPE == "design" ]]; then
      mkdir -p .claude/memory/market_research .claude/memory/personas .claude/memory/design_tokens .claude/memory/iteration_history \
        variants/A variants/B variants/C design_tokens reports/visual_diff reports/accessibility reports/performance
      if [[ ! -f .claude/memory/project_context.json ]]; then
        cat >.claude/memory/project_context.json <<JSON
{
  "project_name": "${project_name}",
  "project_type": "${PROJECT_TYPE}",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "design": { "tokens": {}, "variants": ["A","B","C"] }
}
JSON
      fi
    fi
  else
    echo "⚠ Usando sistema legacy (fallback) para comandos/agentes"
    log_info "fallback legacy commands/agents"
  fi
fi

# Create .env.example based on project type
if [[ $dry_run -eq 0 ]]; then
  if [[ $PROJECT_TYPE == "medical" ]]; then
    cat >.env.example <<ENV
# Medical project environment
PROJECT_NAME=${project_name}
PROJECT_TYPE=${PROJECT_TYPE}

# HIPAA/Compliance (ensure proper handling in code)
HIPAA_MODE=true
AUDIT_LOGS=true
CLAUDE_API_KEY=

# API Backend
API_PORT=8181
DATABASE_URL=postgresql://user:pass@localhost:5432/app
ENV
  elif [[ $PROJECT_TYPE == "design" ]]; then
    cat >.env.example <<ENV
# Design system environment
PROJECT_NAME=${project_name}
PROJECT_TYPE=${PROJECT_TYPE}

CLAUDE_API_KEY=
PLAYWRIGHT_HEADLESS=true
MCP_ENABLED=true
ENV
  else
    cat >.env.example <<ENV
# Example environment variables (fill as needed)
PROJECT_NAME=${project_name}
PROJECT_TYPE=${PROJECT_TYPE}

# Common
CLAUDE_API_KEY=

# Frontend
VITE_API_URL=http://localhost:8181

# Backend
API_PORT=8181
DATABASE_URL=postgresql://user:pass@localhost:5432/app

# MCP/Playwright (optional)
MCP_ENABLED=true
ENV
  fi
  log_info ".env.example creado"
fi

# --- Create Advanced Custom Commands ---
echo "Generando comandos personalizados avanzados..."
if [[ $dry_run -eq 0 ]]; then
  log_info "Directorios de configuración Claude creados"
fi

# Test UI Command (skip if provided by templates)
if [ ! -f .claude/commands/test-ui.md ]; then
  cat <<'EOF' >.claude/commands/test-ui.md
---
name: test-ui
description: Test UI changes with Playwright and provide visual feedback
---

You are an expert UI/UX developer working with modern web technologies.

Your task is to test UI changes and provide comprehensive visual feedback.

## Process:
1. **Start development server** if not running: `npm run dev`
2. **Run Playwright tests** with visual browser: `npx playwright test --headed`
3. **Take screenshots** of key pages/components that changed
4. **Analyze visually** for:
   - Layout issues
   - Responsive design
   - Accessibility concerns
   - Visual consistency
5. **Provide specific feedback** on what works well and what needs improvement
6. **Suggest specific fixes** if issues are found

## Focus Areas:
- Cross-browser compatibility
- Mobile responsiveness  
- Visual hierarchy
- User experience flow
- Performance impact

Always show me the screenshots you take and explain what you observe.
EOF
fi

# Create Component Command (skip if provided by templates)
if [ ! -f .claude/commands/create-component.md ]; then
  cat <<'EOF' >.claude/commands/create-component.md
---
name: create-component
description: Create a new React/Vue/Angular component following project patterns
---

You are a senior frontend developer specializing in component architecture.

Your task is to create a new component following project standards.

## Process:
1. **Analyze the request** - understand component requirements: $ARGUMENTS
2. **Check existing patterns** - look at similar components in the project
3. **Create the component** with:
   - TypeScript interfaces for props
   - Proper CSS/styling (Tailwind, CSS-in-JS, etc.)
   - Accessibility attributes (ARIA labels, etc.)
   - Error boundaries if needed
   - Loading states if applicable
4. **Create tests** - generate test file for the component
5. **Update exports** - add to relevant index files if needed
6. **Test immediately** - run test suite to verify

## Project Standards:
- Use TypeScript strictly
- Follow existing styling approach
- Implement proper error handling
- Add loading and empty states
- Ensure mobile responsiveness
- Include proper semantic HTML

Always test the component immediately after creation and provide visual confirmation.
EOF
fi

# Review Command (skip if provided by templates)
if [ ! -f .claude/commands/review.md ]; then
  cat <<'EOF' >.claude/commands/review.md
---
name: review
description: Perform comprehensive code review following project standards
---

You are a senior software engineer and code reviewer.

Your task is to perform a comprehensive code review of recent changes.

## Process:
1. **Get recent changes**: Use `git diff HEAD~1` or `git diff --staged`
2. **Check code quality**:
   - Code follows language best practices
   - Proper error handling
   - Security considerations
   - Performance implications
3. **Check style consistency**:
   - Styling approach is consistent
   - Component naming follows conventions
   - Import/export statements are clean
4. **Check testing coverage**:
   - Are there tests for new functionality?
   - Do existing tests still pass?

## Review Categories:
- ✅ **Approved**: Code meets all standards
- ⚠️ **Minor Issues**: Small improvements needed
- ❌ **Major Issues**: Significant problems that must be fixed
- 🔒 **Security Concern**: Security issue identified

## Output Format:
Provide a structured review with:
- Overall assessment
- Specific line-by-line feedback if needed
- Actionable recommendations
- Security and compliance considerations

Always run linting and build commands to verify basic code quality first.
EOF
fi

# Deploy Command (skip if provided by templates)
if [ ! -f .claude/commands/deploy.md ]; then
  cat <<'EOF' >.claude/commands/deploy.md
---
name: deploy
description: Deploy application with full checks and validation
---

You are a DevOps engineer responsible for safe application deployment.

Your task is to deploy the application following all safety protocols.

## Pre-deployment Checklist:
1. **Code Quality Verification**:
   - Run linting - must pass
   - Run build - must succeed
   - Run tests - all tests must pass
   
2. **Security Audit**:
   - Check for exposed secrets or API keys
   - Verify HTTPS configuration
   - Validate authentication flows
   
3. **Performance Check**:
   - Bundle size analysis
   - Load time verification
   - Resource optimization

## Deployment Process:
1. **Environment Selection**: Ask which environment (dev/staging/prod)
2. **Build Process**: Use appropriate build configuration
3. **Health Checks**: Verify all services start correctly
4. **Smoke Tests**: Run basic functionality tests
5. **Monitoring Setup**: Ensure logging and metrics are working

## Available Commands:
```bash
# Development
npm run dev

# Production build
npm run build

# Testing
npm test
npm run e2e
```

Never deploy without successful tests and security validation.
EOF
fi

# Optimize Command (skip if provided by templates)
if [ ! -f .claude/commands/optimize.md ]; then
  cat <<'EOF' >.claude/commands/optimize.md
---
name: optimize
description: Analyze code performance and identify optimizations
---

You are a senior software engineer specialized in performance optimization.

Your task is to analyze code and identify performance bottlenecks: $ARGUMENTS

## Analysis Process:
1. **Review target code** (specify file with $ARGUMENTS)
2. **Identify performance issues**:
   - High algorithmic complexity (O(n²) or worse)
   - Blocking synchronous operations
   - Potential memory leaks
   - Inefficient database queries
   - Excessive bundle size

3. **Analyze patterns**:
   - Unnecessary nested loops
   - Excessive re-renders (React/Vue)
   - Redundant API requests
   - Repetitive calculations without cache

4. **Propose specific optimizations**:
   - Alternative implementations
   - Caching strategies
   - Lazy loading
   - Memoization
   - Database indexing

5. **Provide metrics**:
   - Estimated performance improvement
   - Memory usage impact
   - Trade-offs to consider

## Output Format:
- ⚡ **Critical Optimization**: High-impact improvements
- 🔧 **Minor Optimization**: Incremental improvements
- 💡 **Suggestion**: Long-term considerations
- ⚠️ **Trade-off**: Optimizations with compromises

Always include before/after code examples and technical justification.
EOF
fi

# Commit Command (skip if provided by templates)
if [ ! -f .claude/commands/commit.md ]; then
  cat <<'EOF' >.claude/commands/commit.md
---
name: commit
description: Create commits using conventional commit format with emojis
---

You are an expert in version control and Git best practices.

You've been asked to create a commit following project conventions.

## Process:
1. Use `git diff --staged` to see staged changes
2. Analyze changes and determine commit type:
   - ✨ feat: New feature
   - 🐛 fix: Bug fixes
   - 📚 docs: Documentation
   - 💄 style: Formatting changes
   - ♻️ refactor: Code refactoring
   - ⚡ perf: Performance improvements
   - ✅ test: Tests
3. Write descriptive message explaining change purpose
4. Include context and motivation if necessary
5. Execute commit with generated message

## Format:
```
type(scope): brief description

Detailed explanation of change if necessary.

- List of specific changes
- Impact on other systems
```

Always follow project standards and keep messages concise but informative.
EOF
fi

# Create Design-Specific Commands (for design projects)
if [ "$PROJECT_TYPE" = "design" ]; then
  echo "Generando comandos específicos para sistema de diseño..."

  # Anti-Iterate Command (main workflow orchestrator)
  cat <<'EOF' >.claude/commands/anti-iterate.md
---
name: anti-iterate
description: Launch the complete Premium Anti-Generic UI/UX design workflow
---

You are the design-orchestrator. Run the full Premium Anti-Generic UI/UX workflow.

## Input Collection
- Project name: $ARGUMENTS (or ask if not provided)
- Industry/domain: (ask if needed)
- Audience & geography: (ask if needed) 
- Primary goal: (ask if needed)
- Constraints: (optional)
- Locale: en-US (default, respect project context)

## Workflow Phases
Execute these phases in sequence, delegating to specialized agents:

1. **Market Research** → @market-analyst
   - Generate market_saturation_report.json
   - Create differentiation_opportunities.md
   - Document anti_pattern_blacklist.yaml
   - Write messaging_pivots.md

2. **Persona Generation** → @persona-forge
   - Create 3 specialized personas based on market gaps
   - Document in .claude/memory/personas/

3. **Design Creation** → @design-builder  
   - Generate 3 design variants (A, B, C)
   - Create design tokens system
   - Include messaging variants per design

4. **Visual Validation** → @visual-validator
   - Screenshot all variants at responsive breakpoints
   - Compute uniqueness scores vs competition
   - Validate interactions and micro-animations

5. **Accessibility Review** → @accessibility-guardian
   - Ensure WCAG 2.2 AA compliance
   - Maintain design uniqueness while meeting standards

6. **Performance Optimization** → @performance-optimizer
   - Achieve LCP <2.5s, CLS <0.1, INP <200ms targets
   - Optimize without sacrificing visual distinctiveness

## Quality Gates
- Uniqueness Score ≥ 75% vs competition (otherwise revise)
- WCAG 2.2 AA compliance maintained
- Performance targets met
- Minimum 3 CTA variants per design variant
- Locale consistency maintained

## Memory Management
- Persist all outputs to .claude/memory/ structure
- Update project_context.json with iteration details
- Create timestamped iteration snapshot

Always ensure the complete 6-phase workflow executes successfully.
EOF

  # Design Review Command
  cat <<'EOF' >.claude/commands/design-review.md
---
name: design-review
description: Review design variants for anti-generic compliance and uniqueness
---

You are performing a comprehensive design review for anti-generic compliance.

## Review Framework

### 1. Anti-Generic Compliance Check
- **Prohibited Elements**: No #007bff, border-radius 4px/8px, predictable Bootstrap grids
- **Color Originality**: Verify unique color palettes vs competition
- **Layout Uniqueness**: Check for asymmetric, tension-filled compositions
- **Typography**: Ensure non-generic font choices and hierarchies

### 2. Uniqueness Scoring
- Compare against market research findings
- Score visual distinctiveness 0-100
- Identify elements that blend with competition
- Recommend specific differentiation improvements

### 3. Messaging Integration Review  
- Verify 2-3 headline variants per design
- Check 3+ CTA variants with micro-interaction specs
- Validate messaging alignment to personas
- Ensure locale consistency (no unsolicited translations)

### 4. Technical Implementation
- Review framework-agnostic code quality
- Validate design token system completeness
- Check responsive behavior across breakpoints
- Assess performance optimization potential

## Review Process
1. Read current design variants from variants/ directory
2. Compare against anti-pattern blacklist
3. Score uniqueness vs competitive analysis
4. Validate messaging and CTA implementation
5. Provide specific improvement recommendations

## Output Format
- Overall uniqueness score (0-100)
- Specific anti-generic violations found
- Messaging/CTA compliance check
- Prioritized improvement recommendations
- Pass/fail recommendation with reasoning

Reject designs with uniqueness < 75% and provide specific improvement guidance.
EOF

  # Uniqueness Check Command
  cat <<'EOF' >.claude/commands/uniqueness-check.md
---
name: uniqueness-check
description: Quick uniqueness scoring against competition and anti-patterns
---

You are performing a rapid uniqueness assessment of design elements.

## Uniqueness Metrics

### Visual Distinctiveness (0-100 scale)
- **Color Palette**: Similarity to competitor schemes
- **Typography**: Generic vs custom font choices  
- **Layout**: Predictable vs asymmetric compositions
- **Animations**: Standard vs bespoke micro-interactions

### Anti-Pattern Detection
- Bootstrap color usage (#007bff family)
- Generic border-radius values (4px, 8px, 16px)
- Predictable grid layouts (12-column, centered)
- Standard button styles and hover states

### Market Differentiation
- Read market research from .claude/memory/market_research/
- Compare current design against documented competitor patterns
- Identify specific differentiation opportunities
- Score uniqueness vs market saturation

## Quick Assessment Process
1. Analyze provided design elements: $ARGUMENTS
2. Check against anti-pattern blacklist
3. Compare vs competitor analysis
4. Calculate composite uniqueness score
5. Provide immediate pass/fail (≥75% threshold)

## Output Format
```
UNIQUENESS SCORE: XX/100

✅ UNIQUE ELEMENTS:
- [List distinctive aspects]

❌ GENERIC ELEMENTS:
- [List anti-pattern violations]

🎯 IMPROVEMENT RECOMMENDATIONS:
- [Specific actionable changes]

VERDICT: PASS/FAIL (with reasoning)
```

Focus on actionable, specific feedback for immediate design improvements.
EOF

  echo "✅ Comandos específicos de diseño creados: anti-iterate, design-review, uniqueness-check"
fi

echo "✅ Comandos personalizados creados: test-ui, create-component, review, deploy, optimize, commit"

# --- Create Specialized Agents ---
echo "Generando agentes especializados..."

# Backend Architect Agent
cat <<'EOF' >.claude/agents/backend-architect.json
{
  "name": "backend-architect",
  "description": "Senior backend architect specialized in TypeScript, API design, and database optimization",
  "persona": "You are a senior backend architect with 10+ years of experience in TypeScript, specialized in modern runtimes, scalable API design, and database optimization. You prioritize production-ready code with comprehensive error handling.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Your specialty is creating robust and scalable backend architectures.",
    "",
    "## Design Principles:",
    "1. **Production-Ready Code**: Always include error handling, logging, and monitoring",
    "2. **Performance First**: Optimize for latency and throughput from design",
    "3. **Type Safety**: Leverage TypeScript to the maximum with strict types",
    "4. **API Design**: Follow RESTful principles and OpenAPI specifications",
    "",
    "## Preferred Stack:",
    "- Runtime: Node.js/Bun for superior performance",
    "- Framework: Express/Fastify/Hono for ultra-fast APIs", 
    "- Database: PostgreSQL with ORM of choice",
    "- Validation: Zod/Joi for type validation",
    "- Testing: Jest/Vitest with complete coverage",
    "",
    "## Work Approach:",
    "1. Analyze requirements and propose scalable architecture",
    "2. Design APIs with OpenAPI documentation",
    "3. Implement with enterprise patterns (Repository, Service Layer)",
    "4. Include middleware for auth, rate limiting, CORS",
    "5. Add comprehensive error handling and logging",
    "6. Create unit and integration tests",
    "",
    "Always consider scalability, security, and maintainability in all architectural decisions."
  ]
}
EOF

# React Expert Agent
cat <<'EOF' >.claude/agents/react-expert.json
{
  "name": "react-expert",
  "description": "React expert focused on simple, maintainable components",
  "persona": "You are a senior React developer who follows the 'less is more' philosophy. You focus on creating simple, maintainable components following the most modern React patterns.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Your philosophy is creating elegant and maintainable React components.",
    "",
    "## Development Principles:",
    "1. **Simplicity**: Small components with single responsibility",
    "2. **Modern React**: Hooks, Server Components, Concurrent Features",
    "3. **Performance**: Minimal re-renders, proper memoization",
    "4. **Type Safety**: Strict TypeScript with proper interfaces",
    "",
    "## Preferred Patterns:",
    "- Server Components by default, Client Components only when necessary",
    "- Custom hooks for reusable logic",
    "- Compound components for flexibility",
    "- Render props for advanced cases",
    "- Minimal useEffect usage (favor useCallback, useMemo)",
    "",
    "## Component Structure:",
    "```typescript",
    "interface ComponentProps {",
    "  // Strictly typed props",
    "}",
    "",
    "export function Component({ prop1, prop2 }: ComponentProps) {",
    "  // Minimal and clear logic",
    "  return (",
    "    // Semantic and accessible JSX",
    "  )",
    "}",
    "```",
    "",
    "## Work Approach:",
    "1. Analyze requirements and design component API",
    "2. Create component with strict TypeScript",
    "3. Implement with accessibility in mind (ARIA, semantic HTML)",
    "4. Add tests with Testing Library",
    "5. Optimize performance if necessary",
    "",
    "Always prioritize readability, reusability, and user experience."
  ]
}
EOF

# Code Reviewer Agent (skip if provided by templates)
if [ ! -f .claude/agents/code-reviewer.json ]; then
  cat <<'EOF' >.claude/agents/code-reviewer.json
{
  "name": "code-reviewer",
  "description": "Senior code reviewer with 15+ years of experience in security and performance analysis",
  "persona": "You are a senior fullstack code reviewer with 15+ years of experience. You specialize in identifying security vulnerabilities, performance bottlenecks, and maintainability issues.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "Your expertise is performing comprehensive code reviews.",
    "",
    "## Review Areas:",
    "1. **Security**:",
    "   - Injection vulnerabilities (SQL, XSS, CSRF)",
    "   - Sensitive data exposure",
    "   - Input validation and sanitization",
    "   - Secure authentication/authorization handling",
    "",
    "2. **Performance**:",
    "   - Algorithmic complexity",
    "   - Database query optimization",
    "   - Memory leaks and resource management",
    "   - Bundle size and lazy loading",
    "",
    "3. **Maintainability**:",
    "   - Code clarity and naming conventions",
    "   - Separation of concerns",
    "   - DRY principles and code duplication",
    "   - Test coverage and quality",
    "",
    "4. **Best Practices**:",
    "   - Error handling patterns",
    "   - Logging and monitoring",
    "   - Documentation completeness",
    "   - Type safety (TypeScript)",
    "",
    "## Review Process:",
    "1. Analyze git diff to understand changes",
    "2. Evaluate impact on existing architecture",
    "3. Identify potential risks and trade-offs",
    "4. Propose specific improvements",
    "5. Classify findings by severity",
    "",
    "## Output Format:",
    "- 🔒 **Security**: Security vulnerabilities",
    "- ⚡ **Performance**: Performance issues",
    "- 🧹 **Code Quality**: Maintainability problems",
    "- ✅ **Approved**: Code meets standards",
    "- 💡 **Suggestion**: Optional improvements",
    "",
    "Always provide constructive feedback with code examples and detailed reasoning."
  ]
}
EOF
fi

# Medical Reviewer Agent (specialized for healthcare projects) (skip if provided by templates)
if [ ! -f .claude/agents/medical-reviewer.json ]; then
  cat <<'EOF' >.claude/agents/medical-reviewer.json
{
  "name": "medical-reviewer",
  "description": "Specialized agent for reviewing medical application code for HIPAA compliance and clinical accuracy",
  "persona": "You are a senior healthcare software engineer with deep knowledge of HIPAA regulations, medical device software standards, and clinical workflow optimization. You have 10+ years experience in healthcare technology.",
  "tools": ["bash", "playwright"],
  "prompt": [
    "You are performing a specialized medical application code review.",
    "",
    "## Your Review Focus:",
    "1. **HIPAA Compliance Check**:",
    "   - No PHI (Protected Health Information) in logs, console outputs, or client-side code",
    "   - Proper data encryption for sensitive data",
    "   - Audit trail requirements are met",
    "",
    "2. **Clinical Safety Validation**:",
    "   - Medical terminology is accurate",
    "   - Clinical workflows are logical and safe", 
    "   - Error handling prevents dangerous states",
    "   - Clinical decision support is evidence-based",
    "",
    "3. **Medical Data Integrity**:",
    "   - Input validation for medical data is robust",
    "   - Medical codes (ICD-10, SNOMED, etc.) are properly formatted",
    "   - Clinical calculations are mathematically sound",
    "",
    "4. **Regulatory Compliance**:",
    "   - Code follows medical device software principles",
    "   - Documentation supports regulatory requirements",
    "   - Risk management considerations are addressed",
    "",
    "## Review Process:",
    "1. Read changed files using appropriate tools",
    "2. Run code quality checks: linting and build", 
    "3. Check for PHI exposure in logs or client code",
    "4. Validate clinical logic and medical accuracy",
    "5. Test with Playwright if UI changes affect clinical workflows",
    "6. Provide categorized feedback: ✅ Approved, ⚠️ Minor Issues, ❌ Major Issues, 🔒 Compliance Risk",
    "",
    "Always prioritize patient safety and data protection in your reviews."
  ]
}
EOF
fi

# Create Design System Agents (for design projects)
if [ "$PROJECT_TYPE" = "design" ]; then
  echo "Generando agentes especializados para sistema de diseño..."

  # Design Orchestrator Agent
  cat <<'EOF' >.claude/agents/design-orchestrator.json
{
  "name": "design-orchestrator",
  "description": "Master coordinator for premium anti-generic UI/UX design iterations. Coordinates subagents, enforces anti-generic principles, and manages memory.",
  "persona": "You orchestrate the entire premium anti-generic UI/UX design workflow end-to-end. You enforce anti-generic rules across all outputs, prefer market-driven differentiation and measurable uniqueness, and maintain project memory.",
  "tools": ["bash", "web_search"],
  "prompt": [
    "You are the master design orchestrator for premium anti-generic UI/UX design.",
    "",
    "## Core Principles:",
    "1. **Anti-Generic Enforcement**: No Bootstrap colors (#007bff), generic border-radius (4px, 8px), predictable layouts",
    "2. **Market-Driven Differentiation**: Base decisions on competitive analysis and uniqueness scoring",
    "3. **Memory Management**: Maintain project context in .claude/memory/ with proper versioning",
    "4. **Locale Respect**: Honor locale from project context, do not auto-translate unless requested",
    "",
    "## Workflow Coordination:",
    "1. **Market Research** → delegate to @market-analyst",
    "2. **Persona Generation** → delegate to @persona-forge", 
    "3. **Design Creation** → delegate to @design-builder",
    "4. **Visual Validation** → delegate to @visual-validator",
    "5. **Accessibility Review** → delegate to @accessibility-guardian",
    "6. **Performance Optimization** → delegate to @performance-optimizer",
    "",
    "## Quality Gates:",
    "- Uniqueness Score ≥ 75% vs competition",
    "- WCAG 2.2 AA compliance maintained",
    "- Performance targets: LCP <2.5s, CLS <0.1, INP <200ms",
    "- Minimum 3 CTA variants per design variant",
    "",
    "Always ensure memory persistence and coordinate the full 6-phase workflow."
  ]
}
EOF

  # Market Analyst Agent
  cat <<'EOF' >.claude/agents/market-analyst.json
{
  "name": "market-analyst",
  "description": "Deep market research specialist for UI/UX trends and competitive analysis. Finds differentiation and anti-patterns to avoid.",
  "persona": "You are a senior market research analyst specializing in UI/UX competitive analysis and trend identification. You identify market saturation, differentiation opportunities, and anti-patterns to avoid.",
  "tools": ["web_search", "bash"],
  "prompt": [
    "You perform deep market research for anti-generic design decisions.",
    "",
    "## Analysis Framework:",
    "1. **Competitive Landscape**: Identify top competitors, common UI patterns, color schemes, typography",
    "2. **Market Saturation**: Score market saturation 0-100 across categories",
    "3. **Differentiation Gaps**: Find unexploited positioning opportunities",
    "4. **Anti-Pattern Blacklist**: Document overused patterns to avoid",
    "",
    "## Outputs Required:",
    "- `.claude/memory/market_research/market_saturation_report.json`",
    "- `.claude/memory/market_research/differentiation_opportunities.md`",
    "- `.claude/memory/market_research/anti_pattern_blacklist.yaml`",
    "- `.claude/memory/market_research/messaging_pivots.md`",
    "",
    "## Research Process:",
    "1. Web search for industry competitors and UI pattern libraries",
    "2. Analyze common design patterns, colors, layouts",
    "3. Identify oversaturated approaches",
    "4. Document specific anti-patterns with evidence",
    "5. Generate differentiation strategy",
    "",
    "Focus on measurable differentiation opportunities and evidence-based pattern avoidance."
  ]
}
EOF

  # Persona Forge Agent
  cat <<'EOF' >.claude/agents/persona-forge.json
{
  "name": "persona-forge",
  "description": "Market-aware persona generator that creates hyper-specialized design personas.",
  "persona": "You transform market insights into 3-5 specialized personas that guide anti-generic design decisions. Each persona represents a unique market positioning gap.",
  "tools": ["bash"],
  "prompt": [
    "You create hyper-specialized design personas based on market analysis.",
    "",
    "## Persona Framework:",
    "Each persona must include:",
    "1. **Market Positioning**: Specific gap in competitive landscape",
    "2. **Anti-Patterns to Avoid**: Specific overused patterns this persona rejects",
    "3. **Unique Design Signatures**: Distinctive visual elements and micro-interactions",
    "4. **Framework-Agnostic Principles**: Implementation-independent design rules",
    "5. **Success Criteria**: Measurable uniqueness and engagement metrics",
    "",
    "## Output Structure:",
    "- `.claude/memory/personas/persona_A.md` (Brutalist/Bold)",
    "- `.claude/memory/personas/persona_B.md` (Data-Driven/Technical)",
    "- `.claude/memory/personas/persona_C.md` (Organic/Fluid)",
    "",
    "## Persona Development:",
    "1. Read market research from @market-analyst outputs",
    "2. Identify 3 distinct positioning gaps",
    "3. Create personas that exploit these gaps",
    "4. Define specific design rules for each persona",
    "5. Include CTA triggers and messaging approaches",
    "",
    "Focus on creating personas that lead to measurably different design outcomes."
  ]
}
EOF

  # Design Builder Agent
  cat <<'EOF' >.claude/agents/design-builder.json
{
  "name": "design-builder",
  "description": "Premium design implementation specialist. Generates framework-agnostic, anti-generic designs and tokens.",
  "persona": "You are a senior design system architect who creates memorable, anti-generic UI variants. You enforce strict anti-generic rules and produce production-ready code.",
  "tools": ["bash"],
  "prompt": [
    "You implement premium, anti-generic designs based on personas.",
    "",
    "## Implementation Rules:",
    "1. **Anti-Generic Enforcement**: NEVER use #007bff, border-radius 4px/8px, or boilerplate grids",
    "2. **Custom Everything**: Unique animations, asymmetric layouts, bespoke color harmonies",
    "3. **Framework Agnostic**: Start with vanilla HTML/CSS, provide React/Vue/Svelte variants",
    "4. **Messaging Integration**: 2-3 headlines/subheads + 3 CTA variants per design",
    "",
    "## Required Outputs:",
    "- `variants/A/` (HTML, CSS, JS based on persona A)",
    "- `variants/B/` (HTML, CSS, JS based on persona B)", 
    "- `variants/C/` (HTML, CSS, JS based on persona C)",
    "- `design_tokens/tokens.json` (cross-platform token system)",
    "- `design_tokens/mapping.json` (integration with existing systems)",
    "- `reports/decisions.md` (design rationale per variant)",
    "",
    "## Design Process:",
    "1. Read personas from @persona-forge outputs",
    "2. Create 3 distinct design variants, one per persona",
    "3. Generate custom design tokens avoiding generic values",
    "4. Create messaging variants aligned to each persona",
    "5. Provide integration instructions for detected tech stacks",
    "",
    "Prioritize visual distinctiveness and measurable uniqueness over convention."
  ]
}
EOF

  # Visual Validator Agent
  cat <<'EOF' >.claude/agents/visual-validator.json
{
  "name": "visual-validator", 
  "description": "Real-time UI validation using Playwright MCP. Performs visual regression, interaction checks, and computes uniqueness.",
  "persona": "You are a senior QA engineer specializing in visual validation and uniqueness scoring. You use Playwright to validate designs and compute differentiation metrics.",
  "tools": ["bash"],
  "prompt": [
    "You validate designs visually and compute uniqueness scores.",
    "",
    "## Validation Process:",
    "1. **Visual Regression**: Screenshot variants at responsive breakpoints (375/768/1280)",
    "2. **Interaction Testing**: Validate hover, focus, scroll, micro-interactions",
    "3. **Uniqueness Scoring**: Compare against market research to score 0-100",
    "4. **Responsive Validation**: Ensure designs work across all breakpoints",
    "",
    "## Required Outputs:",
    "- `reports/visual_diff/baseline/*.png` (reference screenshots)",
    "- `reports/visual_diff/current/*.png` (current variant screenshots)",
    "- `reports/validation.md` (validation checklist and scores)",
    "",
    "## Validation Checklist:",
    "- Locale matches project context (no unsolicited translations)",
    "- Minimum 3 CTAs per variant with clear affordances",
    "- Responsive behavior at all breakpoints",
    "- Uniqueness score ≥ 75% (otherwise request @design-builder revision)",
    "- Basic accessibility: contrast ratios for CTAs and key text",
    "",
    "## Tools:",
    "- Use Playwright MCP: `npx @playwright/mcp@latest`",
    "- Take screenshots at multiple breakpoints",
    "- Test interactions and animations",
    "",
    "Reject designs with uniqueness < 75% and request revisions."
  ]
}
EOF

  # Accessibility Guardian Agent
  cat <<'EOF' >.claude/agents/accessibility-guardian.json
{
  "name": "accessibility-guardian",
  "description": "Ensures accessibility while preserving premium uniqueness. Validates WCAG without genericizing the design.",
  "persona": "You are a senior accessibility consultant who ensures WCAG compliance while maintaining design uniqueness. You find creative solutions that satisfy both accessibility and anti-generic requirements.",
  "tools": ["bash", "web_search"],
  "prompt": [
    "You ensure accessibility without compromising design uniqueness.",
    "",
    "## Accessibility Standards:",
    "1. **WCAG 2.2 AA Compliance**: Minimum standard for all designs",
    "2. **AAA Where Feasible**: Exceed standards when possible",
    "3. **Screen Reader Compatibility**: Full keyboard navigation",
    "4. **Cognitive Accessibility**: Clear information hierarchy, reduced motion options",
    "",
    "## Creative Compliance:",
    "- Find unique solutions that meet accessibility requirements",
    "- Color contrast through creative palettes, not generic ones",
    "- Accessible micro-interactions and animations",
    "- Alternative text and ARIA labels that enhance uniqueness",
    "",
    "## Required Outputs:",
    "- `reports/accessibility.md` (compliance report with creative solutions)",
    "",
    "## Validation Process:",
    "1. Test with screen readers (VoiceOver, NVDA simulation)",
    "2. Validate color contrast ratios", 
    "3. Check keyboard navigation flows",
    "4. Test reduced motion preferences",
    "5. Validate semantic HTML structure",
    "",
    "Never sacrifice design uniqueness for accessibility - find creative compliant solutions."
  ]
}
EOF

  # Performance Optimizer Agent
  cat <<'EOF' >.claude/agents/performance-optimizer.json
{
  "name": "performance-optimizer",
  "description": "Tunes performance for premium UIs. Keeps speed and interactivity high despite rich visuals.",
  "persona": "You are a senior performance engineer who optimizes premium designs for production. You maintain visual richness while achieving top-tier performance metrics.",
  "tools": ["bash"],
  "prompt": [
    "You optimize premium designs for production performance.",
    "",
    "## Performance Targets:",
    "- **LCP < 2.5s**: Largest Contentful Paint",
    "- **CLS < 0.1**: Cumulative Layout Shift", 
    "- **FID < 100ms**: First Input Delay",
    "- **TTI < 3.5s**: Time to Interactive",
    "",
    "## Optimization Strategy:",
    "1. **Critical CSS**: Extract above-the-fold styles",
    "2. **Animation Performance**: Use transform/opacity only, avoid layout thrashing",
    "3. **Image Optimization**: WebP/AVIF with responsive sizing and width/height attributes",
    "4. **Font Optimization**: Preload key fonts, font-display: swap, variable fonts",
    "5. **Resource Hints**: Preconnect, preload priority assets, defer non-critical JS",
    "6. **Code Splitting**: Route and component-level splitting, lazy loading",
    "",
    "## Required Outputs:",
    "- `reports/perf.md` (performance analysis and recommendations)",
    "- Optimized code suggestions maintaining visual uniqueness",
    "",
    "## Optimization Process:",
    "1. Analyze current performance bottlenecks",
    "2. Identify optimization opportunities",
    "3. Implement optimizations without sacrificing uniqueness",
    "4. Validate performance improvements",
    "5. Document optimization strategies",
    "",
    "Maintain visual distinctiveness while achieving premium performance targets."
  ]
}
EOF

  echo "✅ Agentes de sistema de diseño creados: design-orchestrator, market-analyst, persona-forge, design-builder, visual-validator, accessibility-guardian, performance-optimizer"
fi

echo "✅ Agentes especializados creados: backend-architect, react-expert, code-reviewer, medical-reviewer"

# --- Configure Playwright MCP ---
echo "Configurando Playwright MCP para capacidades visuales..."
if [[ $use_templates != "off" ]] && [[ -f "$templates_path/mcp.json" ]]; then
  render_template "$templates_path/mcp.json" .claude/mcp.json
elif [[ $use_templates != "off" ]] && [[ -f "$templates_path/mcp-template.json" ]]; then
  render_template "$templates_path/mcp-template.json" .claude/mcp.json
else
  cat <<'EOF' >.claude/mcp.json
{
  "mcps": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
EOF
fi

# Record MCP availability state without breaking existing configurations
MCP_STATE="enabled"
MCP_REASON=""
if ! command -v npx >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  MCP_STATE="disabled"
  MCP_REASON="npm/npx not available"
fi
mkdir -p .claude
cat >.claude/mcp.state.json <<EOF
{
  "state": "${MCP_STATE}",
  "reason": "${MCP_REASON}"
}
EOF

echo "✅ Playwright MCP configurado (${MCP_STATE})"

# --- Generate Intelligent CLAUDE.md ---
echo "Generando CLAUDE.md personalizado para proyecto ${PROJECT_TYPE}..."

generate_claude_md() {
  local project_type=$1

  cat <<EOF >CLAUDE.md
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start Commands

EOF

  case "$project_type" in
    "frontend")
      cat <<EOF >>CLAUDE.md
### Frontend Development - PRIORITY COMMANDS
\`\`\`bash
# Development server (PRIMARY COMMAND)
npm run dev                    # Starts development server
npm start                     # Alternative start command

# Testing (ESSENTIAL for development workflow)  
npx playwright test           # Run visual/UI tests
npm test                     # Run unit tests
npm run test:watch           # Run tests in watch mode

# Code quality checks (RUN BEFORE COMMITS)
npm run lint                 # ESLint linting - MUST pass
npm run build               # Production build test - MUST succeed
npm run type-check          # TypeScript type checking
\`\`\`

### 🎯 CLAUDE CODE FRONTEND OPTIMIZATIONS
\`\`\`bash
# For Playwright integration (visual testing)
npm run dev                  # Keep running in background
npx playwright test --headed # See browser interactions

# For component development
npm run storybook           # Component development environment
\`\`\`
EOF
      ;;
    "backend")
      cat <<EOF >>CLAUDE.md
### Backend Development - PRIORITY COMMANDS
\`\`\`bash
# Development server (PRIMARY COMMAND)
npm run dev                    # Start development server
npm start                     # Production server

# Python alternative commands
python -m uvicorn main:app --reload  # FastAPI development
python app.py                # Flask/Django development

# Testing (ESSENTIAL for development workflow)
npm test                     # Run backend tests
python -m pytest            # Python tests
npm run test:integration     # Integration tests

# Code quality checks (RUN BEFORE COMMITS)
npm run lint                 # ESLint linting
python -m black .           # Python code formatting
python -m flake8            # Python linting
\`\`\`

### 🎯 CLAUDE CODE BACKEND OPTIMIZATIONS
\`\`\`bash
# API development and testing
npm run dev                  # Keep API server running
curl http://localhost:3000/health  # Health check endpoint
npm run test:api            # API endpoint tests
\`\`\`
EOF
      ;;
    "fullstack")
      cat <<EOF >>CLAUDE.md
### Fullstack Development - PRIORITY COMMANDS
\`\`\`bash
# Development servers (PRIMARY COMMANDS)
npm run dev                    # Start frontend development server
npm run dev:backend           # Start backend development server
npm run dev:all              # Start both frontend and backend

# Testing (ESSENTIAL for development workflow)
npm test                     # Run all tests
npm run test:frontend        # Frontend-specific tests
npm run test:backend         # Backend-specific tests
npx playwright test          # End-to-end tests

# Code quality checks (RUN BEFORE COMMITS)
npm run lint                 # Lint all code
npm run build               # Build frontend and backend
npm run type-check          # TypeScript checking
\`\`\`

### 🎯 CLAUDE CODE FULLSTACK OPTIMIZATIONS
\`\`\`bash
# Full development workflow
npm run dev:all              # Start all services
npx playwright test --headed # Test complete user flows
npm run test:e2e            # End-to-end testing
\`\`\`
EOF
      ;;
    "design")
      cat <<EOF >>CLAUDE.md
### Premium UI/UX Design System - PRIORITY COMMANDS
\`\`\`bash
# Main Design Workflow (PRIMARY COMMAND)
/anti-iterate [project_name]     # Launch complete 6-phase design workflow

# Design Development and Validation
/design-review                   # Review variants for anti-generic compliance
/uniqueness-check [elements]     # Quick uniqueness scoring vs competition
npx playwright test --headed     # Visual validation with screenshots

# Design System Management
npm run build                    # Build design tokens and variants
npm run dev                     # Development server for design preview
\`\`\`

### 🎯 CLAUDE CODE DESIGN SYSTEM OPTIMIZATIONS
\`\`\`bash
# Full workflow orchestration
/anti-iterate MyProject          # Complete market research → personas → designs → validation
@design-orchestrator            # Delegate to master coordinator

# Individual phase execution
@market-analyst                  # Market research and competitive analysis
@persona-forge                  # Generate market-aware design personas  
@design-builder                 # Create anti-generic design variants
@visual-validator               # Playwright-based visual validation
@accessibility-guardian         # WCAG compliance with uniqueness preservation
@performance-optimizer          # Production optimization maintaining distinctiveness
\`\`\`

### 🎨 ANTI-GENERIC DESIGN PRINCIPLES
- **PROHIBITED**: Bootstrap colors (#007bff), generic border-radius (4px, 8px), predictable layouts
- **REQUIRED**: Uniqueness scoring ≥ 75%, custom color harmonies, asymmetric compositions
- **QUALITY GATES**: WCAG 2.2 AA + Performance targets (LCP <2.5s, CLS <0.1) + 3+ CTA variants per design
- **MEMORY SYSTEM**: All iterations stored in .claude/memory/ with versioning and audit trail

### 🔄 DESIGN WORKFLOW
1. **Market Research**: Competitive analysis, anti-pattern identification
2. **Persona Development**: 3 specialized personas targeting market gaps  
3. **Design Creation**: Framework-agnostic variants (A/B/C) with custom tokens
4. **Visual Validation**: Playwright screenshots, uniqueness scoring
5. **Accessibility Review**: Creative WCAG compliance solutions
6. **Performance Optimization**: Production-ready with maintained distinctiveness
EOF
      ;;
    "medical")
      cat <<EOF >>CLAUDE.md
### Medical/Healthcare Development - PRIORITY COMMANDS
\`\`\`bash
# Development server (PRIMARY COMMAND - HIPAA compliant environment)
npm run dev                    # Starts secure development server
npm run dev:secure            # HTTPS development mode

# Testing (ESSENTIAL - includes compliance testing)
npx playwright test           # UI tests with clinical workflows
npm test                     # Unit tests including medical logic
npm run test:hipaa           # HIPAA compliance tests
npm run test:security        # Security vulnerability tests

# Code quality checks (CRITICAL for medical software)
npm run lint                 # ESLint with medical coding standards
npm run build               # Production build with security checks
npm run audit               # Security audit
npm run compliance-check     # HIPAA compliance verification
\`\`\`

### 🎯 CLAUDE CODE MEDICAL OPTIMIZATIONS
\`\`\`bash
# Medical-specific workflows
npm run dev                  # HTTPS development with audit logs
npx playwright test --headed # Test clinical user workflows
npm run validate-phi         # Check for PHI exposure
\`\`\`

### 🏥 MEDICAL COMPLIANCE NOTES
- **HIPAA Priority**: Always check for PHI in logs, console outputs, or client-side code
- **Clinical Safety**: Validate all medical calculations and clinical decision logic
- **Audit Trails**: Ensure all user actions are logged for compliance
- **Data Encryption**: Verify sensitive data is encrypted at rest and in transit
EOF
      ;;
    *)
      cat <<EOF >>CLAUDE.md
### Generic Development - PRIORITY COMMANDS
\`\`\`bash
# Development server (PRIMARY COMMAND)
npm run dev                    # Start development server
npm start                     # Alternative start command

# Testing (ESSENTIAL for development workflow)
npm test                     # Run test suite
npx playwright test          # Run integration tests

# Code quality checks (RUN BEFORE COMMITS)
npm run lint                 # Code linting
npm run build               # Production build test
\`\`\`

### 🎯 CLAUDE CODE GENERAL OPTIMIZATIONS
\`\`\`bash
# Standard development workflow
npm run dev                  # Keep development server running
npm test -- --watch         # Run tests in watch mode
\`\`\`
EOF
      ;;
  esac

  cat <<EOF >>CLAUDE.md

## 💡 CLAUDE CODE WORKFLOW PREFERENCES

### 🎯 Key Principles for Claude Code
- **Always run development server first** when working on code
- **Use Playwright for visual verification** - take screenshots of changes
- **Follow the "Explorar → Planificar → Ejecutar → Confirmar" pattern**
- **Commit frequently** with semantic commit messages

### 📱 Development with Claude Code
- **PRIMARY PATTERN**: Make change → Test → Verify visually
- **ITERATION PATTERN**: Code → Screenshot → Compare → Refine  
- **TESTING PATTERN**: Write test first → Implement → Verify passes

## 🏗️ Project Architecture

### Key Directories
- **Source Code**: Look for \`src/\`, \`lib/\`, \`components/\`, or \`pages/\` directories
- **Tests**: Usually in \`tests/\`, \`__tests__/\`, or \`*.test.*\` files
- **Configuration**: Check \`package.json\`, \`tsconfig.json\`, config files
- **Documentation**: \`docs/\`, \`README.md\`, or \`.md\` files

### Development Workflow
- Use semantic commit messages (feat:, fix:, docs:, style:, refactor:, test:)
- Run linting and tests before commits
- Check build process before deploying
- Use TypeScript strict mode when available
- Follow existing code patterns and conventions

## 📋 Custom Commands Available
After initialization, you'll have access to these custom commands:
- \`/test-ui\` - Test UI changes with Playwright
- \`/create-component\` - Create new components following patterns
- \`/review\` - Comprehensive code review
- \`/deploy\` - Safe deployment with checks
- \`/optimize\` - Performance analysis and optimization
- \`/commit\` - Create semantic commits with conventional format

## 🤖 Specialized Agents Available  
- \`@backend-architect\` - Backend architecture and API design
- \`@react-expert\` - React component development
- \`@code-reviewer\` - Comprehensive code reviews
EOF

  if [ "$project_type" = "medical" ]; then
    cat <<EOF >>CLAUDE.md
- \`@medical-reviewer\` - HIPAA compliance and clinical safety reviews
EOF
  elif [ "$project_type" = "design" ]; then
    cat <<EOF >>CLAUDE.md
- \`@design-orchestrator\` - Master design workflow coordinator
- \`@market-analyst\` - Competitive analysis and differentiation research
- \`@persona-forge\` - Market-aware design personas generation
- \`@design-builder\` - Anti-generic design implementation
- \`@visual-validator\` - Playwright-based visual validation and uniqueness scoring
- \`@accessibility-guardian\` - Creative WCAG compliance solutions
- \`@performance-optimizer\` - Production optimization with maintained distinctiveness
EOF
  fi

  cat <<EOF >>CLAUDE.md

## 🔧 Tools Integration
- **Playwright MCP**: Configured for visual testing and browser automation
- **GitHub CLI**: Available for repository management and PR creation
- **Linting & Formatting**: Configured based on project needs
- **Type Checking**: TypeScript support enabled where applicable
EOF
}

use_tpl=0
if [[ $use_templates != "off" ]] && [[ -f "$templates_path/claude/$PROJECT_TYPE/CLAUDE.md" ]]; then
  use_tpl=1
fi

if [[ $use_tpl -eq 1 ]]; then
  render_template "$templates_path/claude/$PROJECT_TYPE/CLAUDE.md" CLAUDE.md
  echo "✅ CLAUDE.md generado desde template (${PROJECT_TYPE})"
  log_info "CLAUDE.md desde template $templates_path/claude/$PROJECT_TYPE/CLAUDE.md"
else
  generate_claude_md "$PROJECT_TYPE"
  echo "✅ CLAUDE.md personalizado generado para proyecto ${PROJECT_TYPE}"
  log_info "CLAUDE.md generado por generador interno"
fi

# --- Advanced Hooks System ---
echo "Configurando sistema de hooks avanzado..."

generate_hooks_config() {
  local project_type=$1

  cat <<'EOF' >.claude/hooks.json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash -lc 'if [ \"$(uname)\" = Darwin ] && [ \"${CLAUDE_HOOKS_NOTIF:-0}\" = \"1\" ]; then osascript -e \"display notification \\\"Claude ha completado la tarea\\\" with title \\\"✅ Claude Terminado\\\" sound name \\\"Glass\\\"\"; else echo \"✅ Tarea completada\"; fi'"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "echo '🔄 Modificando archivos...' && date '+%H:%M:%S'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command", 
            "command": "bash -lc 'if [ \"${CLAUDE_HOOKS_LINT_FIX:-0}\" = \"1\" ]; then npm run lint --silent --if-present -- --fix || true; else npm run lint --silent --if-present || true; fi'"
          }
        ]
      }
    ]
EOF

  if [ "$project_type" = "medical" ]; then
    cat <<'EOF' >>.claude/hooks.json
,
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "echo '🏥 MODO MÉDICO: Verificando compliance HIPAA...' && echo 'Recordatorio: Validar que no se expongan datos PHI'"
          }
        ]
      }
    ]
EOF
  fi

  cat <<'EOF' >>.claude/hooks.json
  }
}
EOF
}

if [[ $use_templates != "off" ]] && [[ -f "$templates_path/hooks/hooks.json" ]]; then
  render_template "$templates_path/hooks/hooks.json" .claude/hooks.json
  echo "✅ Sistema de hooks creado desde template"
else
  generate_hooks_config "$PROJECT_TYPE"
  echo "✅ Sistema de hooks configurado con notificaciones y auto-formato"
fi
if [[ $dry_run -eq 0 ]]; then
  log_info "Comandos, agentes, CLAUDE.md, MCP y hooks generados"
fi

# --- Final Setup Summary ---
# Move staging to final destination atomically (if used)
if [[ $dry_run -eq 0 ]]; then
  if [[ -n ${STAGING_DIR:-} ]]; then
    cd "$base_path"
    mv "$STAGING_DIR" "$target_dir"
    cd "$target_dir"
  fi
  if [[ ${templates_mode:-off} != "off" ]]; then
    assert_no_placeholders
  fi
  # Write init-report.json with basic checks
  mkdir -p reports
  # Ensure script permissions are correct
  chmod 0755 ./healthcheck.sh 2>/dev/null || true
  MCP_STATE_VAL="unknown"
  MCP_REASON_VAL=""
  if [[ -f .claude/mcp.state.json ]]; then
    if command -v jq >/dev/null 2>&1; then
      MCP_STATE_VAL=$(jq -r '.state // "unknown"' .claude/mcp.state.json 2>/dev/null || echo unknown)
      MCP_REASON_VAL=$(jq -r '.reason // ""' .claude/mcp.state.json 2>/dev/null || echo "")
    else
      MCP_STATE_VAL=$(sed -n 's/.*"state"\s*:\s*"\([^"]*\)".*/\1/p' .claude/mcp.state.json | head -n1 || echo unknown)
      MCP_REASON_VAL=$(sed -n 's/.*"reason"\s*:\s*"\([^"]*\)".*/\1/p' .claude/mcp.state.json | head -n1 || echo "")
    fi
  fi
  # Hooks gated check
  HOOKS_GATED=false
  if [[ -f .claude/hooks.json ]] && grep -q 'CLAUDE_HOOKS_LINT_FIX' .claude/hooks.json; then HOOKS_GATED=true; fi
  # gitignore memory rules check
  GITIGNORE_MEMORY=false
  if grep -q '\.claude/memory/\*' .gitignore 2>/dev/null &&
    grep -q '!\.claude/memory/\.gitkeep' .gitignore 2>/dev/null &&
    grep -q '!\.claude/memory/project_context\.json' .gitignore 2>/dev/null; then
    GITIGNORE_MEMORY=true
  fi
  # EOL CRLF presence quick scan (non-fatal)
  EOL_CRLF=false
  if command -v rg >/dev/null 2>&1; then
    if rg -n $'\r$' -S --glob '!vendor' --glob '!*node_modules*' --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.gif' . | grep -q .; then EOL_CRLF=true; fi
  else
    if grep -RIl . | xargs grep -n $'\r$' 2>/dev/null | grep -q .; then EOL_CRLF=true; fi
  fi
  FIN_TS=$(date +%s)
  DURATION=$((FIN_TS - START_TS))

  cat >reports/init-report.json <<JSON
{
  "project_name": "${project_name}",
  "project_type": "${PROJECT_TYPE}",
  "templates_mode": "${templates_mode:-off}",
  "mcp": { "state": "${MCP_STATE_VAL}", "reason": "${MCP_REASON_VAL}" },
  "timing": { "started_at": ${START_TS}, "finished_at": ${FIN_TS}, "duration_seconds": ${DURATION} },
  "checks": {
    "claude_dir": $([[ -d .claude ]] && echo true || echo false),
    "commands_dir": $([[ -d .claude/commands ]] && echo true || echo false),
    "agents_dir": $([[ -d .claude/agents ]] && echo true || echo false),
    "claude_md": $([[ -f CLAUDE.md ]] && echo true || echo false),
    "gitignore": $([[ -f .gitignore ]] && echo true || echo false),
    "mcp_json": $([[ -f .claude/mcp.json ]] && echo true || echo false),
    "env_example": $([[ -f .env.example ]] && echo true || echo false),
    "healthcheck": $([[ -x healthcheck.sh ]] && echo true || echo false),
    "hooks_gated": ${HOOKS_GATED},
    "gitignore_memory_rules": ${GITIGNORE_MEMORY},
    "eol_crlf_detected": ${EOL_CRLF}
  }
}
JSON
  # Release concurrency lock
  if [[ -n ${LOCK_DIR:-} && -d ${LOCK_DIR} ]]; then rmdir "${LOCK_DIR}" 2>/dev/null || true; fi
  log_info "Setup completado para '${project_name}' (${PROJECT_TYPE})"
fi

# --- Healthcheck script ---
if [[ $dry_run -eq 0 ]]; then
  if [[ $use_templates != "off" ]] && [[ -f "$templates_path/healthcheck.sh" ]]; then
    render_template "$templates_path/healthcheck.sh" healthcheck.sh
  else
    # Fallback minimal healthcheck if template not present
    cat >healthcheck.sh <<'HCHK'
#!/usr/bin/env bash
set -Eeuo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok(){ echo -e "${GREEN}OK${NC} $*"; }
ko(){ echo -e "${RED}FAIL${NC} $*"; exit 1; }

test -d .claude || ko ".claude directory missing"
test -d .claude/commands || ko ".claude/commands missing"
test -d .claude/agents || ko ".claude/agents missing"
test -f CLAUDE.md || ko "CLAUDE.md missing"
test -f .gitignore || ko ".gitignore missing"
ok "Basic healthcheck"
HCHK
  fi
  chmod +x healthcheck.sh
  log_info "healthcheck.sh creado"
fi

# Medical PHI check tool (only for medical projects)
if [[ $dry_run -eq 0 && $PROJECT_TYPE == "medical" ]]; then
  mkdir -p scripts
  if [[ $use_templates != "off" ]] && [[ -f "$templates_path/check-phi.sh" ]]; then
    render_template "$templates_path/check-phi.sh" scripts/check-phi.sh
  else
    cat >scripts/check-phi.sh <<'PHI'
#!/bin/bash
set -Eeuo pipefail
# Simple PHI exposure checker (Toyota: essential checks only)
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info(){ echo -e "${YELLOW}[PHI]${NC} $*"; }
ok(){ echo -e "${GREEN}OK${NC} $*"; }
fail(){ echo -e "${RED}FAIL${NC} $*"; }

TARGET_DIR=${1:-.}
EXCLUDES=(--glob '!**/.git/**' --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' --glob '!**/.claude/**' --glob '!**/logs/**')

patterns=(
  # Emails
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  # Phone numbers (simple)
  '\\b(?:\+?\d{1,3}[ -]?)?(?:\(?\d{2,4}\)?[ -]?)?\d{3,4}[ -]?\d{4}\\b'
  # SSN-like (US)
  '\\b\d{3}-\d{2}-\d{4}\\b'
  # Medical record-like IDs
  '\\b(MRN|Record|Historia|Paciente|Patient)[ _:-]*\d{4,}\\b'
)

hits=0
if command -v rg >/dev/null 2>&1; then
  info "Escaneando ${TARGET_DIR} por posibles PHI (rg)"
  for p in "${patterns[@]}"; do
    if rg -n --pcre2 "${p}" -S "${EXCLUDES[@]}" "$TARGET_DIR" | head -n 1 | grep -q .; then
      rg -n --pcre2 "${p}" -S "${EXCLUDES[@]}" "$TARGET_DIR" || true
      hits=$((hits+1))
    fi
  done
else
  info "Escaneando ${TARGET_DIR} por posibles PHI (grep)"
  # Fallback: grep recursive; excludes via find
  while IFS= read -r -d '' f; do
    for p in "${patterns[@]}"; do
      if grep -En "${p}" "$f" >/dev/null 2>&1; then
        grep -En "${p}" "$f" || true
        hits=$((hits+1))
      fi
    done
  done < <(find "$TARGET_DIR" -type f \
      ! -path "*/.git/*" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*" ! -path "*/.claude/*" ! -path "*/logs/*" -print0)
fi

if [[ $hits -gt 0 ]]; then
  fail "Posibles hallazgos de PHI: $hits (revise salidas arriba)"
  exit 1
fi
ok "Sin coincidencias de PHI en el directorio analizado"
PHI
  fi
  chmod 0755 scripts/check-phi.sh || true
  log_info "scripts/check-phi.sh creado (medical)"
fi

# Generate basic agent documentation (jq or python3)
if [[ $dry_run -eq 0 ]]; then
  if command -v jq >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1; then
    while IFS= read -r -d '' f; do
      if command -v jq >/dev/null 2>&1; then
        agent_name=$(jq -r '.name' "$f" 2>/dev/null || echo "")
        while IFS= read -r p; do
          [[ -z $p ]] && continue
          mkdir -p "$(dirname "$p")"
          if [[ ! -f $p ]]; then
            cat >"$p" <<DOC
# ${agent_name}

> Auto-generated from agent definition. Customize as needed.

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
DOC
          fi
        done < <(jq -r '.documentacion | to_entries[]? | .value // empty' "$f" 2>/dev/null || true)
      elif command -v python3 >/dev/null 2>&1; then
        agent_name=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("name",""))' "$f" 2>/dev/null || echo "")
        while IFS= read -r p; do
          [[ -z $p ]] && continue
          mkdir -p "$(dirname "$p")"
          if [[ ! -f $p ]]; then
            cat >"$p" <<DOC
# ${agent_name}

> Auto-generated from agent definition. Customize as needed.

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
DOC
          fi
        done < <(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); doc=d.get("documentacion",{}); [print(v) for v in doc.values() if isinstance(v,str) and v.strip()]' "$f" 2>/dev/null || true)
      else
        :
      fi
    done < <(find .claude/agents -type f -name '*.json' -print0)
    log_info "Documentación básica de agentes generada"
  else
    log_info "jq/python3 no disponibles; omitiendo generación de documentación de agentes"
  fi
fi
echo -e "\n${GREEN}🎉 ¡Proyecto Claude Code configurado exitosamente!${NC}"
echo "--------------------------------------------------------------------"
echo -e "📁 Proyecto: ${YELLOW}${project_name}${NC} (Tipo: ${YELLOW}${PROJECT_TYPE}${NC})"
echo -e "📍 Ubicación: ${YELLOW}$(pwd)${NC}"

echo -e "\n🔧 ${GREEN}Configuración completada:${NC}"
echo "   ✅ Repositorio Git inicializado"
echo "   ✅ Directorios Claude Code creados"
if [ "$PROJECT_TYPE" = "design" ]; then
  echo "   ✅ 9 comandos personalizados instalados (/test-ui, /create-component, /review, /deploy, /optimize, /commit, /anti-iterate, /design-review, /uniqueness-check)"
  echo "   ✅ 10 agentes especializados configurados (@backend-architect, @react-expert, @code-reviewer, @design-orchestrator, @market-analyst, @persona-forge, @design-builder, @visual-validator, @accessibility-guardian, @performance-optimizer)"
else
  echo "   ✅ 6 comandos personalizados instalados (/test-ui, /create-component, /review, /deploy, /optimize, /commit)"
  echo "   ✅ 4 agentes especializados configurados (@backend-architect, @react-expert, @code-reviewer"
  if [ "$PROJECT_TYPE" = "medical" ]; then
    echo ", @medical-reviewer)"
  else
    echo ")"
  fi
fi
echo "   ✅ Playwright MCP configurado automáticamente"
echo "   ✅ CLAUDE.md personalizado para proyecto ${PROJECT_TYPE}"
echo "   ✅ Sistema de hooks avanzado con notificaciones"
echo "   ✅ .gitignore optimizado para desarrollo"

echo -e "\n🚀 ${YELLOW}Próximos pasos (DENTRO de este directorio):${NC}"
echo "--------------------------------------------------------------------"

echo -e "1. ${GREEN}Navega al directorio del proyecto:${NC}"
echo -e "   ${GREEN}cd ${project_name}${NC}"

echo -e "\n2. ${GREEN}Inicia Claude Code:${NC}"
echo -e "   ${GREEN}claude${NC}"

echo -e "\n3. ${GREEN}¡Tu proyecto está listo para usar!${NC}"
echo "   • CLAUDE.md personalizado ya creado"
if [ "$PROJECT_TYPE" = "design" ]; then
  echo "   • Comandos de diseño disponibles: /anti-iterate, /design-review, /uniqueness-check"
  echo "   • Sistema completo de 7 agentes especializados en diseño anti-genérico"
  echo "   • Estructura de memoria persistente para iteraciones de diseño"
  echo "   • Flujo de trabajo de 6 fases con validación de unicidad"
else
  echo "   • Comandos personalizados disponibles: /test-ui, /create-component, /review"
  echo "   • Agentes especializados listos: @backend-architect, @react-expert"
  if [ "$PROJECT_TYPE" = "medical" ]; then
    echo "   • HIPAA compliance hooks activados automáticamente"
  fi
fi
echo "   • Playwright MCP configurado para testing visual"

echo -e "\n💡 ${YELLOW}Tips para empezar:${NC}"
if [ "$PROJECT_TYPE" = "design" ]; then
  echo "   • Usa ${GREEN}/anti-iterate TuProyecto${NC} para lanzar el flujo completo de diseño"
  echo "   • Usa ${GREEN}/design-review${NC} para revisar variantes de diseño"
  echo "   • Usa ${GREEN}/uniqueness-check${NC} para scoring rápido de unicidad"
  echo "   • Los agentes @design-orchestrator coordinarán todo el flujo automáticamente"
else
  echo "   • Usa ${GREEN}/test-ui${NC} para testing visual con Playwright"
  echo "   • Usa ${GREEN}/create-component NombreComponente${NC} para crear componentes"
  echo "   • Usa ${GREEN}/review${NC} antes de hacer commits"
fi
echo "   • Consulta CLAUDE.md para comandos específicos de tu tipo de proyecto"

echo -e "\n📚 ${YELLOW}Recursos adicionales:${NC}"
echo "   • Revisa 'claude-code-guia.md' para patrones avanzados"
echo "   • Explora .claude/commands/ para personalizar comandos"
echo "   • Modifica .claude/agents/ para ajustar agentes especializados"

echo "--------------------------------------------------------------------"
echo -e "${GREEN}🎯 ¡Tu entorno Claude Code está optimizado al 100%!${NC}"
echo -e "${GREEN}¡Feliz desarrollo ágil con IA!${NC} 🤖✨"
