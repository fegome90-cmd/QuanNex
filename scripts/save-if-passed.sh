#!/bin/bash

set -euo pipefail

# Verificar argumento
if [ $# -ne 1 ]; then
  echo "Usage: $0 <agent_name>"
  exit 1
fi

AGENT_NAME=$1

# Crear directorio temporal para RUN
RUN=$(mktemp -d)

# Función de limpieza
cleanup() {
  local exit_code=$?
  if [ "$exit_code" -eq 0 ] && [ "${KEEP_ARTIFACTS:-0}" != "1" ]; then
    rm -rf "$RUN"
  fi
}

# Configurar trap para limpieza
trap cleanup EXIT

# Ejecutar el agente y redirigir salida
node "agents/$AGENT_NAME/agent.js" > "$RUN/output.json"

# Validar con jq si tiene schema_version y agent_version
if jq -e '.schema_version and .agent_version' "$RUN/output.json" > /dev/null 2>&1; then
  # Pasó: mover a out/
  mkdir -p out
  mv "$RUN/output.json" "out/$AGENT_NAME.json"
  echo "Validation passed: output moved to out/$AGENT_NAME.json"
else
  # Falló: dejar logs en $RUN
  echo "Validation failed: logs and artifacts left in $RUN"
  exit 1
fi
