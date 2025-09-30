#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_BASE="${TMPDIR:-/tmp}/unit-tpl-ph-$$"
TPL="$TMP_BASE/templates"
mkdir -p "$TPL/claude/generic"

cat >"$TPL/claude/generic/CLAUDE.md" <<'TPL'
# {{PROJECT_NAME}} — Generic
Token: {{UNKNOWN_TOKEN}}
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

set +e
CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name phfail --type generic --yes \
  --path "$OUT" --use-templates on \
  --templates-path "$TPL" >/dev/null 2>"$TMP_BASE/err.txt"
code=$?
set -e

if [[ $code -eq 0 ]]; then
  echo "expected failure due to unresolved placeholders" >&2
  exit 1
fi
grep -q "Placeholders sin resolver" "$TMP_BASE/err.txt"
echo "ok placeholders detection"
