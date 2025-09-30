#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_DIR="${TMPDIR:-/tmp}/unit-validate-$$"
mkdir -p "$TMP_DIR"

CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name unit-validate --type generic --yes \
  --path "$TMP_DIR" >/dev/null

cd "$TMP_DIR/unit-validate"
bash "$ROOT/core/scripts/validate-project.sh" . >/dev/null
test -f reports/validation.json
grep -q '"status"' reports/validation.json
echo "ok validate-project"
