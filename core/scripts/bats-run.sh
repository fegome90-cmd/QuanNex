#!/usr/bin/env bash
set -Eeuo pipefail

if ! command -v bats >/dev/null 2>&1; then
  echo "bats not installed; skipping bats tests (optional)."
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DIR="$ROOT/tests-bats"
if [[ ! -d $DIR ]]; then
  echo "No bats tests found in $DIR; skipping."
  exit 0
fi

echo "Running bats tests in $DIR"
bats "$DIR"
