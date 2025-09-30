#!/usr/bin/env bash
set -Eeuo pipefail

# Bootstrap de Archon (coleam00/archon) con políticas de estabilidad:
# - No sudo ni auto-instalaciones en host (solo usa Docker si está disponible)
# - Paso a paso con validaciones y mensajes accionables

ARCHON_DIR=${ARCHON_DIR:-"${PWD}/external/archon"}
REPO_URL=${REPO_URL:-"https://github.com/coleam00/archon.git"}

echo "Destino: ${ARCHON_DIR}"
mkdir -p "$(dirname "$ARCHON_DIR")"

# 1) Clonado (si no existe)
if [[ ! -d "$ARCHON_DIR/.git" ]]; then
  if command -v git >/dev/null 2>&1; then
    echo "Clonando Archon (coleam00/archon)..."
    git clone "$REPO_URL" "$ARCHON_DIR"
  else
    echo "ERROR: git no está instalado. Clona manualmente $REPO_URL en $ARCHON_DIR" >&2
    exit 1
  fi
else
  echo "Repo Archon ya presente. Ejecutando git pull..."
  (cd "$ARCHON_DIR" && git pull --ff-only || true)
fi

# 2) .env
if [[ ! -f "$ARCHON_DIR/.env" ]]; then
  if [[ -f "$ARCHON_DIR/.env.example" ]]; then
    cp "$ARCHON_DIR/.env.example" "$ARCHON_DIR/.env"
    echo "Crea y edita $ARCHON_DIR/.env con tus credenciales de Supabase."
    echo "IMPORTANTE: Usa service key 'legacy' en cloud; para local: SUPABASE_URL=http://host.docker.internal:8000"
  else
    echo "WARN: .env.example no encontrado en Archon. Revisa la documentación del proyecto."
  fi
else
  echo ".env ya existe."
fi

# 3) Docker Compose
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no instalado. Instálalo para levantar Archon en contenedores." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose no disponible. Actualiza Docker Desktop/Compose." >&2
  exit 1
fi

echo "Levantando servicios: docker compose up --build -d"
(cd "$ARCHON_DIR" && docker compose up --build -d)

# 4) Esperar servicios
HOST=localhost
ARCHON_UI_PORT=3737
ARCHON_SERVER_PORT=8181
ARCHON_MCP_PORT=8051
if [[ -f "$ARCHON_DIR/.env" ]]; then
  # shellcheck disable=SC2046
  eval $(grep -E '^(ARCHON_UI_PORT|ARCHON_SERVER_PORT|ARCHON_MCP_PORT|HOST)=' "$ARCHON_DIR/.env" | sed 's/\r$//') || true
  : "${HOST:=localhost}"
fi

probe_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" || echo 000; }
wait_url() {
  local url="$1" name="$2"
  local i=0
  while ((i < 60)); do
    code=$(probe_code "$url")
    if [[ $code == "200" ]]; then
      echo "OK: $name listo"
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done
  echo "TIMEOUT: $name no respondió a tiempo ($url)"
  return 1
}

UI_URL="http://${HOST}:${ARCHON_UI_PORT}"
API_HEALTH="http://${HOST}:${ARCHON_SERVER_PORT}/health"
MCP_HEALTH="http://${HOST}:${ARCHON_MCP_PORT}/health"

wait_url "$UI_URL" UI || true
wait_url "$API_HEALTH" API || true
wait_url "$MCP_HEALTH" MCP || true

# 5) Smoke final
bash "$(dirname "$0")/archon-smoke.sh" "$ARCHON_DIR" "$HOST"

echo "Archon debería estar operativo. Abre ${UI_URL} para onboarding y API key."
