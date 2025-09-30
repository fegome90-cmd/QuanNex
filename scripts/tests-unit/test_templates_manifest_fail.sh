#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_BASE="${TMPDIR:-/tmp}/unit-tpl-manifest-fail-$$"
TPL="$TMP_BASE/templates"
mkdir -p "$TPL/claude/generic"

# Manifest exige versión mayor que la del init
cat >"$TPL/manifest.json" <<JSON
{
  "version": "1.0.0",
  "min_init_version": "9.9.9",
  "files": ["claude/generic/CLAUDE.md"],
  "deps": []
}
JSON

OUT="$TMP_BASE/work"
mkdir -p "$OUT"

set +e
CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/claude-project-init.sh" \
  --name manifestfail --type generic --yes \
  --path "$OUT" --use-templates on \
  --templates-path "$TPL" >/dev/null 2>"$TMP_BASE/err.txt"
code=$?
set -e

if [[ $code -eq 0 ]]; then
  echo "expected failure due to min_init_version" >&2
  exit 1
fi
grep -q "Incompatibilidad de versiones" "$TMP_BASE/err.txt"
echo "ok templates manifest version fail"
