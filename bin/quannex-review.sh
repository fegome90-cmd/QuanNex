#!/usr/bin/env bash
# QuanNex Review - Agnostic Wrapper
# Single source of truth: CLI handles policy resolution via config

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Uso: bin/quannex-review.sh <archivo.md> [policy-override.yaml] [metrics-override.json]"
  echo ""
  echo "El wrapper es agnóstico - la CLI resuelve automáticamente:"
  echo "  - docs/**/*.md → gates/review.docs.policy.yaml"
  echo "  - reports/**/*.md → gates/review.reports.policy.yaml"
  echo "  - specs/**/*.md → gates/review.specs.policy.yaml"
  exit 2
fi

INPUT="${1}"
POLICY_OVERRIDE="${2:-}"
METRICS_OVERRIDE="${3:-}"

# Build command - CLI handles policy resolution
CMD=( node "${ROOT_DIR}/dist/cli/quannex-cli.js" check --input "${INPUT}" )

# Only add overrides if explicitly provided
[[ -n "${POLICY_OVERRIDE}"  ]] && CMD+=( --policy "${POLICY_OVERRIDE}" )
[[ -n "${METRICS_OVERRIDE}" ]] && CMD+=( --metrics "${METRICS_OVERRIDE}" )

"${CMD[@]}"
