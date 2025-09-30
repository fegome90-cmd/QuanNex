#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_DIR="${TMPDIR:-/tmp}/unit-ignore-$$"
mkdir -p "$TMP_DIR"

CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name unit-ignore --type generic --yes \
  --path "$TMP_DIR" >/dev/null

cd "$TMP_DIR/unit-ignore"

grep -q "\.claude/memory/*" .gitignore
grep -q "!\.claude/memory/\.gitkeep" .gitignore
grep -q "!\.claude/memory/project_context\.json" .gitignore
echo "ok gitignore memory rules"
