#!/usr/bin/env bash
set -Eeuo pipefail

# Ejecuta healthcheck de un proyecto y escribe un reporte JSON consolidado
# Uso: bash scripts/validate-project.sh /ruta/al/proyecto

PROJ=${1:-}
if [[ -z $PROJ || ! -d $PROJ ]]; then
  echo "ERROR: Debes indicar la ruta a un proyecto generado" >&2
  exit 1
fi

cd "$PROJ"

STATUS="passed"
MSG="ok"
if [[ ! -x ./healthcheck.sh ]]; then
  STATUS="failed"
  MSG="healthcheck.sh missing or not executable"
else
  set +e
  ./healthcheck.sh >/dev/null 2>hc.err
  code=$?
  set -e
  if [[ $code -ne 0 ]]; then
    STATUS="failed"
    MSG=$(head -n1 hc.err || echo "healthcheck failed")
  fi
fi

mkdir -p reports
START_TS=$(date +%s)

MCP_STATE="unknown"
MCP_REASON=""
if [[ -f .claude/mcp.state.json ]]; then
  if command -v jq >/dev/null 2>&1; then
    MCP_STATE=$(jq -r '.state // "unknown"' .claude/mcp.state.json 2>/dev/null || echo unknown)
    MCP_REASON=$(jq -r '.reason // ""' .claude/mcp.state.json 2>/dev/null || echo "")
  else
    MCP_STATE=$(sed -n 's/.*"state"\s*:\s*"\([^"]*\)".*/\1/p' .claude/mcp.state.json | head -n1 || echo unknown)
    MCP_REASON=$(sed -n 's/.*"reason"\s*:\s*"\([^"]*\)".*/\1/p' .claude/mcp.state.json | head -n1 || echo "")
  fi
fi

cat >reports/validation.json <<JSON
{
  "status": "${STATUS}",
  "message": "${MSG}",
  "mcp": { "state": "${MCP_STATE}", "reason": "${MCP_REASON}" },
  "timestamp": ${START_TS}
}
JSON

echo "Wrote reports/validation.json (${STATUS})"
