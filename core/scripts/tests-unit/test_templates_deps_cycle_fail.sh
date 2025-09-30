#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_BASE="${TMPDIR:-/tmp}/unit-tpl-deps-cycle-$$"
TPL="$TMP_BASE/templates"
mkdir -p "$TPL/claude/generic"

cat >"$TPL/claude/generic/a.md" <<'EOF'
A
EOF
cat >"$TPL/claude/generic/b.md" <<'EOF'
B
EOF

cat >"$TPL/manifest.json" <<JSON
{
  "version": "1.0.0",
  "min_init_version": "2.0.0",
  "files": ["claude/generic/a.md", "claude/generic/b.md"],
  "deps": [
    {"from": "claude/generic/a.md", "to": "claude/generic/b.md"},
    {"from": "claude/generic/b.md", "to": "claude/generic/a.md"}
  ]
}
JSON

OUT="$TMP_BASE/work"
mkdir -p "$OUT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "skip (no python3)"
  exit 0
fi

set +e
CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/core/claude-project-init.sh" \
  --name depscycle --type generic --yes \
  --path "$OUT" --use-templates on \
  --templates-path "$TPL" >/dev/null 2>"$TMP_BASE/err.txt"
code=$?
set -e

if [[ $code -eq 0 ]]; then
  echo "expected failure due to deps cycle" >&2
  exit 1
fi
grep -qi "Cycle detected" "$TMP_BASE/err.txt"
echo "ok deps cycle detection"
