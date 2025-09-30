#!/usr/bin/env bash
set -Eeuo pipefail

# Verificador de instalación de Archon (externo al repo)
# Uso:
#   bash scripts/archon-setup-check.sh /ruta/a/archon
# o export ARCHON_PATH=/ruta/a/archon y ejecutar sin argumentos

ARCHON_PATH=${1:-${ARCHON_PATH:-}}
if [[ -z ${ARCHON_PATH} ]]; then
  echo "ERROR: Debes indicar la ruta al repo de Archon (coleam00/archon)." >&2
  echo "Ejemplo: bash scripts/archon-setup-check.sh ~/code/archon" >&2
  exit 1
fi

if [[ ! -d ${ARCHON_PATH} ]]; then
  echo "ERROR: Ruta no existe: ${ARCHON_PATH}" >&2
  exit 1
fi

PASS=0
FAIL=0
ok() {
  echo -e "\033[0;32mOK\033[0m $*"
  PASS=$((PASS + 1))
}
ko() {
  echo -e "\033[0;31mFAIL\033[0m $*"
  FAIL=$((FAIL + 1))
}
warn() { echo -e "\033[1;33mWARN\033[0m $*"; }

pushd "${ARCHON_PATH}" >/dev/null

# 1) Repo clonado
if [[ -d .git ]]; then ok "Repositorio Archon detectado"; else ko "No es un repo Git (clona coleam00/archon)"; fi

# 2) .env presente y variables supabase
if [[ -f .env ]]; then
  ok ".env encontrado"
  SUPABASE_URL=$(grep -E '^\s*SUPABASE_URL=' .env | sed 's/^.*=//') || true
  SUPABASE_SERVICE_KEY=$(grep -E '^\s*SUPABASE_SERVICE_KEY=' .env | sed 's/^.*=//') || true
  if [[ -z ${SUPABASE_URL} ]]; then ko "SUPABASE_URL no configurado en .env"; else ok "SUPABASE_URL configurado"; fi
  if [[ -z ${SUPABASE_SERVICE_KEY} ]]; then ko "SUPABASE_SERVICE_KEY no configurado en .env"; else ok "SUPABASE_SERVICE_KEY configurado"; fi
else
  if [[ -f .env.example ]]; then
    warn ".env no encontrado. Copia .env.example a .env y edita las credenciales"
  else
    ko ".env y .env.example no encontrados"
  fi
fi

# docker-compose file presence
if [[ -f docker-compose.yml ]]; then
  ok "docker-compose.yml presente"
else
  warn "docker-compose.yml no encontrado en ${ARCHON_PATH}; verifica estructura del repo oficial"
fi

# 3) Docker/Compose
if command -v docker >/dev/null 2>&1; then ok "Docker disponible"; else ko "Docker no instalado"; fi
if docker compose version >/dev/null 2>&1; then ok "Docker Compose disponible"; else ko "Docker Compose no disponible"; fi

# 4) Servicios corriendo (si Compose disponible)
if docker compose ps >/dev/null 2>&1; then
  RUNNING=$(docker compose ps --format json | jq -r '.[].Service' 2>/dev/null || echo '')
  if echo "$RUNNING" | grep -q archon-server; then ok "archon-server detectado"; else warn "archon-server no detectado"; fi
  if echo "$RUNNING" | grep -q archon-mcp; then ok "archon-mcp detectado"; else warn "archon-mcp no detectado"; fi
  if echo "$RUNNING" | grep -q archon-ui; then ok "archon-ui detectado"; else warn "archon-ui no detectado"; fi
  if echo "$RUNNING" | grep -q archon-agents; then ok "archon-agents detectado"; else warn "archon-agents no detectado"; fi
else
  warn "No se pudo consultar 'docker compose ps' (¿servicios aún no iniciados?)"
fi

popd >/dev/null

# 5) Endpoints locales (si corriendo en defaults)
probe() {
  local url="$1"
  curl -fsS --max-time 2 "$url" >/dev/null 2>&1
}

if probe http://localhost:3737; then ok "UI http://localhost:3737 accesible"; else warn "UI 3737 no accesible (inicia servicios)"; fi
if probe http://localhost:8181/health; then ok "API http://localhost:8181/health ok"; else warn "API 8181 no responde"; fi
if probe http://localhost:8051/health; then ok "MCP http://localhost:8051/health ok"; else warn "MCP 8051 no responde"; fi

echo
echo "Resumen: $PASS OK, $FAIL FAIL"
if [[ $FAIL -ne 0 ]]; then exit 1; fi
echo "Archon parece correctamente configurado. Continúa con el onboarding en http://localhost:3737"
