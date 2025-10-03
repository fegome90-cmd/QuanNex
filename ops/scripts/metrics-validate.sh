#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://localhost:3000/metrics}"
PAYLOAD="$(curl -fsS --max-time 3 "$URL")"

grep -q '# HELP' <<<"$PAYLOAD"
grep -q '# TYPE' <<<"$PAYLOAD"
grep -q '^quannex_gate_status' <<<"$PAYLOAD"
! grep -Ei '(^|[^+])NaN' <<<"$PAYLOAD"  # permite +Inf/-Inf, rechaza NaN

echo "OK: metrics valid"
