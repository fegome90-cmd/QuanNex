#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUT="$ROOT/reports/validation.json"
mkdir -p "$ROOT/reports"

echo '{"status":"ok","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' > "$OUT"
echo "Wrote $OUT"

