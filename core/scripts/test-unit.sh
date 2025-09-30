#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DIR="$ROOT/core/scripts/tests-unit"
pass=0
fail=0
for t in "$DIR"/*.sh; do
  echo "Running: $(basename "$t")"
  if bash "$t" >/dev/null; then
    echo "  ✅ $(basename "$t")"
    pass=$((pass + 1))
  else
    echo "  ❌ $(basename "$t")"
    fail=$((fail + 1))
  fi
done
echo "Summary: $pass passed, $fail failed"
if [ $fail -ne 0 ]; then exit 1; fi
