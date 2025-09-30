#!/bin/bash
set -euo pipefail

MODE="${1:-lint}"
ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PY_SRC="analisis-motor-rete/implementacion"
PY_TESTS="analisis-motor-rete/tests"
SEC_DIR="$ROOT_DIR/reports/security"
mkdir -p "$SEC_DIR"

if ! command -v python >/dev/null 2>&1; then
  echo "Python is required for $MODE mode." >&2
  exit 1
fi

python -m pip install --upgrade pip >/dev/null 2>&1 || true

ensure_tool() {
  local package="$1"
  local module="${2:-$1}"
  if ! python -m pip show "$package" >/dev/null 2>&1; then
    python -m pip install "$package" >/dev/null 2>&1
  fi
  python -m "$module" --version >/dev/null 2>&1 || true
}

case "$MODE" in
  lint)
    ensure_tool "ruff"
    PYTHONPATH="$ROOT_DIR/$PY_SRC" ruff check "$ROOT_DIR/$PY_SRC" "$ROOT_DIR/$PY_TESTS"
    ;;
  audit)
    ensure_tool "pip-audit"
    REQUIREMENTS_FILE="${PYTHON_REQUIREMENTS:-$ROOT_DIR/requirements.txt}"
    TEMP_FILE=""
    if [[ ! -f "$REQUIREMENTS_FILE" ]]; then
      TEMP_FILE="$ROOT_DIR/tools/requirements.tmp.txt"
      printf "# generated placeholder\n" >"$TEMP_FILE"
      REQUIREMENTS_FILE="$TEMP_FILE"
    fi
    pip-audit -r "$REQUIREMENTS_FILE" --format json >"$SEC_DIR/pip-audit.json"
    if [[ -n "$TEMP_FILE" ]]; then
      rm -f "$TEMP_FILE"
    fi
    ;;
  test)
    ensure_tool "pytest"
    ensure_tool "pytest-cov"
    PYTHONPATH="$ROOT_DIR/$PY_SRC" pytest "$ROOT_DIR/$PY_TESTS" --cov="$ROOT_DIR/$PY_SRC" --cov-report=xml --cov-report=term --cov-fail-under=70
    ;;
  *)
    echo "Unknown mode '$MODE'. Use lint|audit|test." >&2
    exit 1
    ;;
esac
