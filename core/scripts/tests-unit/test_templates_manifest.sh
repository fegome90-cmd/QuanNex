#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_BASE="${TMPDIR:-/tmp}/unit-tpl-manifest-$$"
TPL="$TMP_BASE/templates"
mkdir -p "$TPL/claude/generic"

cat >"$TPL/claude/generic/CLAUDE.md" <<'TPL'
# {{PROJECT_NAME}} — Generic
TPL

cat >"$TPL/manifest.json" <<JSON
{
  "version": "1.0.0",
  "min_init_version": "2.0.0",
  "files": ["claude/generic/CLAUDE.md"],
  "deps": []
}
JSON

OUT="$TMP_BASE/work"
mkdir -p "$OUT"

CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name manifestok --type generic --yes \
  --path "$OUT" --use-templates on \
  --templates-path "$TPL" >/dev/null

test -f "$OUT/manifestok/CLAUDE.md"
echo "ok templates manifest valid"
