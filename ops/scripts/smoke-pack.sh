#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://localhost:3000/metrics}"

bash "$(dirname "$0")/metrics-validate.sh" "$URL"

for i in {1..30}; do 
    curl -s http://localhost:3000/health >/dev/null
done

SRC=$(curl -fsS -D- "$URL" | tr -d '\r' | awk '/X-Metrics-Source/ {print $2}')
echo "Source: $SRC"

# Simular fallos (si el script existe)
if [ -f "scripts/dev/fail-metrics-3x.js" ]; then
    node scripts/dev/fail-metrics-3x.js || true
else
    echo "⚠️ Script de fallos no encontrado, continuando..."
fi

curl -fsS -D- "$URL" | grep -i 'X-Metrics-Source'

echo "SMOKE PACK: OK"
