#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_DIR="${TMPDIR:-/tmp}/unit-mcp-$$"
mkdir -p "$TMP_DIR"

CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name unit-mcp --type frontend --yes \
  --path "$TMP_DIR" >/dev/null

cd "$TMP_DIR/unit-mcp/.claude"

test -f mcp.json
grep -q "playwright" mcp.json
echo "ok mcp"
