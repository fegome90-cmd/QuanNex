#!/usr/bin/env bash
set -Eeuo pipefail

# Smoke test contra servicios Archon ya levantados con Docker Compose.
# Uso:
#   bash core/scripts/archon-smoke.sh /ruta/a/archon [host]
# Ejemplo:
#   bash core/scripts/archon-smoke.sh ~/code/archon localhost

ARCHON_PATH=${1:-}
HOST_IN=${2:-}

if [[ -z ${ARCHON_PATH} ]]; then
  echo "ERROR: Debes indicar la ruta al repo de Archon (coleam00/archon)." >&2
  exit 1
fi

if [[ ! -d ${ARCHON_PATH} ]]; then
  echo "ERROR: Ruta no existe: ${ARCHON_PATH}" >&2
  exit 1
fi

# Cargar puertos/host desde .env si está disponible
ARCHON_UI_PORT=3737
ARCHON_SERVER_PORT=8181
ARCHON_MCP_PORT=8051
HOST=${HOST_IN:-localhost}

if [[ -f "${ARCHON_PATH}/.env" ]]; then
  # shellcheck disable=SC2046
  eval $(grep -E '^(ARCHON_UI_PORT|ARCHON_SERVER_PORT|ARCHON_MCP_PORT|HOST)=' "${ARCHON_PATH}/.env" | sed 's/\r$//') || true
  : "${HOST:=${HOST_IN:-localhost}}"
fi

pass=0
fail=0
ok() {
  echo -e "\033[0;32mOK\033[0m $*"
  pass=$((pass + 1))
}
ko() {
  echo -e "\033[0;31mFAIL\033[0m $*"
  fail=$((fail + 1))
}

probe_json() {
  local url="$1"
  curl -fsS --max-time 5 "$url" | grep -q '{' >/dev/null 2>&1
}

probe_code() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" || echo 000)
  [[ $code == "200" ]]
}

UI_URL="http://${HOST}:${ARCHON_UI_PORT}"
API_HEALTH="http://${HOST}:${ARCHON_SERVER_PORT}/health"
# MCP does not always expose /health; /mcp may respond 406 Not Acceptable for GET (expected)
MCP_PROBE="http://${HOST}:${ARCHON_MCP_PORT}/mcp"

if probe_code "$UI_URL"; then ok "UI $UI_URL"; else ko "UI no responde en $UI_URL"; fi
if probe_json "$API_HEALTH"; then ok "API $API_HEALTH"; else ko "API health no responde"; fi
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$MCP_PROBE" || echo 000)
if [[ $code == "200" || $code == "406" ]]; then ok "MCP responde (HTTP $code) en $MCP_PROBE"; else ko "MCP no responde correctamente (HTTP $code)"; fi

echo "Resumen: $pass OK, $fail FAIL"
if [[ $fail -ne 0 ]]; then exit 1; fi
echo "Smoke test Archon operativo."
