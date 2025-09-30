#!/bin/bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUTPUT_DIR="$ROOT_DIR/reports"
OUTPUT_FILE="$OUTPUT_DIR/sbom.json"

mkdir -p "$OUTPUT_DIR"

if command -v syft >/dev/null 2>&1; then
  syft "$ROOT_DIR" -o json >"$OUTPUT_FILE"
  echo "SBOM written to $OUTPUT_FILE"
else
  echo "syft not found. Install via 'curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin'" >&2
  exit 1
fi
