#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_DIR="${TMPDIR:-/tmp}/unit-mcp-state-$$"
mkdir -p "$TMP_DIR"

CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/claude-project-init.sh" \
  --name unit-mcp-state --type frontend --yes \
  --path "$TMP_DIR" >/dev/null

cd "$TMP_DIR/unit-mcp-state/.claude"

test -f mcp.state.json
grep -q '"state"' mcp.state.json
echo "ok mcp state"

# Run healthcheck; it should succeed regardless of state
cd "$TMP_DIR/unit-mcp-state"
bash ./healthcheck.sh >/dev/null
echo "ok healthcheck with mcp state"
