#!/bin/bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUTPUT_DIR="$ROOT_DIR/reports/security"
AUDIT_REPORT="$OUTPUT_DIR/npm-audit.json"
OUTDATED_REPORT="$OUTPUT_DIR/npm-outdated.txt"

mkdir -p "$OUTPUT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js 20+ before running audits." >&2
  exit 1
fi

npm install --package-lock-only >/dev/null 2>&1 || true

npm audit --omit=dev --json >"$AUDIT_REPORT"
echo "npm audit report -> $AUDIT_REPORT"

npm outdated || true | tee "$OUTDATED_REPORT"
echo "npm outdated summary -> $OUTDATED_REPORT"
