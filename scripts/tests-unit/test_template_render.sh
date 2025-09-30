#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_BASE="${TMPDIR:-/tmp}/unit-template-$$"
TEMPLATES="$TMP_BASE/templates"
mkdir -p "$TEMPLATES/claude/generic"

cat >"$TEMPLATES/claude/generic/CLAUDE.md" <<'TPL'
# {{PROJECT_NAME}} — Project Guidance

### Generic Development - PRIORITY COMMANDS
```bash
npm run dev
```

Date: {{DATE_ISO}} | Type: {{PROJECT_TYPE}}
TPL

PROJ_DIR="$TMP_BASE/work"
mkdir -p "$PROJ_DIR"

cat >"$TEMPLATES/manifest.json" <<JSON
{
  "version": "1.0.0",
  "min_init_version": "2.0.0",
  "files": ["claude/generic/CLAUDE.md"],
  "deps": []
}
JSON

CLAUDE_INIT_SKIP_DEPS=1 bash "$ROOT/claude-project-init.sh" \
  --name unit-generic --type generic --yes \
  --path "$PROJ_DIR" \
  --use-templates on \
  --templates-path "$TEMPLATES" >/dev/null

cd "$PROJ_DIR/unit-generic"

grep -q "Generic Development - PRIORITY COMMANDS" CLAUDE.md
grep -q "unit-generic" CLAUDE.md
! grep -q "{{[A-Z_\-]*}}" CLAUDE.md
echo "ok template render"
