#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_BASE="${TMPDIR:-/tmp}/unit-tpl-validate-$$"
TPL="$TMP_BASE/templates"
mkdir -p "$TPL/agents"

# Malformed JSON
echo '{ invalid: json' >"$TPL/agents/bad.json"

OUT="$TMP_BASE/work"
mkdir -p "$OUT"

# Provide a minimal valid manifest to pass manifest check
cat >"$TPL/manifest.json" <<JSON
{
  "version": "1.0.0",
  "min_init_version": "2.0.0",
  "files": [],
  "deps": []
}
JSON

set +e
CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name badtpl --type generic --yes \
  --path "$OUT" --use-templates on \
  --templates-path "$TPL" >/dev/null 2>"$TMP_BASE/err.txt"
code=$?
set -e

if [[ $code -eq 0 ]]; then
  echo "expected failure but got success" >&2
  exit 1
fi
grep -q "Template JSON inválido" "$TMP_BASE/err.txt"
echo "ok templates validation error"
