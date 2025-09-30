#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT"

export LC_ALL=${LC_ALL:-C.UTF-8}

task=${1:-all}

# Limits (soft):
ulimit -n 1024 || true
command -v timeout >/dev/null 2>&1 || timeout() { "$@"; }

run_all() {
  timeout 300s bash -lc "./scripts/lint-shell.sh || true"
  timeout 600s bash -lc "./scripts/test-claude-init.sh"
  timeout 300s bash -lc "./scripts/test-flags.sh"
  timeout 600s bash -lc "./scripts/test-unit.sh"
}

run_edge() {
  bash archon/edge-matrix.sh
}

case "$task" in
  all) run_all ;;
  edge) run_edge ;;
  shell) exec bash ;;
  *) echo "usage: archon-run.sh [all|edge|shell]"; exit 1 ;;
esac
