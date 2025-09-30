#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_DIR="${TMPDIR:-/tmp}/unit-hooks-$$"
mkdir -p "$TMP_DIR"

CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name unit-hooks --type generic --yes \
  --path "$TMP_DIR" >/dev/null

cd "$TMP_DIR/unit-hooks/.claude"

test -f hooks.json
grep -q "CLAUDE_HOOKS_LINT_FIX" hooks.json
echo "ok hooks safe default"
