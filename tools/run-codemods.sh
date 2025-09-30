#!/bin/bash
set -euo pipefail

MODE="check"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      MODE="apply"
      shift
      ;;
    --check)
      MODE="check"
      shift
      ;;
    --help)
      echo "Usage: $0 [--check|--apply] (default --check)" && exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if [[ "$(git status --porcelain)" != "" && "$MODE" = "check" ]]; then
  echo "Working tree dirty. Commit or stash changes before running in --check mode." >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REPORT_DIR="$ROOT_DIR/reports/refactor"
mkdir -p "$REPORT_DIR"
cd "$ROOT_DIR"

run_eslint() {
  if command -v npm >/dev/null 2>&1; then
    npm ci --omit=optional >/dev/null 2>&1 || true
    npx --yes eslint . --ext .js,.mjs --fix --max-warnings=0 || true
  else
    echo "npm not available; skipping eslint codemods" >&2
  fi
}

run_shfmt() {
  if command -v shfmt >/dev/null 2>&1; then
    shfmt -w -i 2 -ci claude-project-init.sh scripts
  else
    echo "shfmt not available; skipping shell formatting" >&2
  fi
}

run_pyupgrade() {
  if command -v python >/dev/null 2>&1; then
    python -m pip install --upgrade pip >/dev/null 2>&1 || true
    if ! python -m pip show pyupgrade >/dev/null 2>&1; then
      python -m pip install pyupgrade >/dev/null 2>&1
    fi
    find analisis-motor-rete/implementacion -name "*.py" -print0 | xargs -0 -r python -m pyupgrade --py311-plus
  else
    echo "python not available; skipping pyupgrade" >&2
  fi
}

run_ruff_fix() {
  if command -v python >/dev/null 2>&1; then
    if ! python -m pip show ruff >/dev/null 2>&1; then
      python -m pip install ruff >/dev/null 2>&1
    fi
    PYTHONPATH="$ROOT_DIR/analisis-motor-rete/implementacion" ruff check analisis-motor-rete --fix --exit-non-zero-on-fix || true
  else
    echo "python not available; skipping ruff codemods" >&2
  fi
}

run_eslint
run_shfmt
run_pyupgrade
run_ruff_fix

git diff >"$REPORT_DIR/diff.patch"
MODIFIED=$(git diff --name-only)
if [[ -z "$MODIFIED" ]]; then
  rm -f "$REPORT_DIR/diff.patch"
fi

if [[ -n "$MODIFIED" && "$MODE" = "check" ]]; then
  echo "Codemods would modify the following files:" >&2
  echo "$MODIFIED" >&2
  git restore --source=HEAD -- $MODIFIED
  rm -f "$REPORT_DIR/diff.patch"
  exit 1
fi

if [[ -z "$MODIFIED" ]]; then
  echo "No codemod changes detected"
else
  echo "Codemods applied to:"
  echo "$MODIFIED"
  echo "Diff stored at $REPORT_DIR/diff.patch"
fi
