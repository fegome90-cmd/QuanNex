#!/usr/bin/env bash
set -euo pipefail
STATE_FILE=".cache/hotstart_init.json"

ensure_state_file() {
  mkdir -p .cache
  [[ -f "$STATE_FILE" ]] || echo '{"init_done":false,"ts":0,"version":"1.0"}' > "$STATE_FILE"
}

mark_init_done() {
  ensure_state_file
  ts=$(date +%s)
  tmp="$(mktemp)"
  jq --argjson ts "$ts" '.init_done=true | .ts=$ts' "$STATE_FILE" > "$tmp"
  mv "$tmp" "$STATE_FILE"
  echo "🟢 Idempotencia: init_done=true @ $ts"
}

should_skip_long_reads() {
  ensure_state_file
  jq -e '.init_done == true' "$STATE_FILE" >/dev/null
}

case "${1:-}" in
  mark) mark_init_done ;;
  "skip?") if should_skip_long_reads; then echo "skip"; else echo "run"; fi ;;
  *) echo "Uso: $0 {mark|skip?}"; exit 2 ;;
esac
