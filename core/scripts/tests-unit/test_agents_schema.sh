#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DIR="$ROOT/core/templates/agents"

fail=0
for f in "$DIR"/*.json; do
  # Parse with python3 to avoid jq dependency
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$f" <<PY || fail=1
import json,sys
data=json.load(open(sys.argv[1],'r'))
req=['name','version','documentacion']
missing=[k for k in req if k not in data]
if missing:
    print(f"Missing keys {missing} in {sys.argv[1]}")
    sys.exit(1)
doc=data['documentacion']
if 'README' not in doc:
    print(f"Missing documentacion.README in {sys.argv[1]}")
    sys.exit(1)
PY
  else
    # Very basic grep fallback
    if ! grep -q '"name"' "$f" || ! grep -q '"version"' "$f" || ! grep -q '"documentacion"' "$f"; then
      echo "Missing basic keys in $f"
      fail=1
    fi
  fi
done

if [[ $fail -ne 0 ]]; then
  exit 1
fi
echo "Agents schema basic validation passed"
