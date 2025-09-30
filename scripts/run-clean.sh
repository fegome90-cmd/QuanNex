#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent:(prompting|context|rules)> [--stdin-json] [--out <file>] [payload.json] [agent-args...]" >&2
  exit 1
fi

AGENT="$1"
shift

# Parse arguments
STDIN_JSON=false
OUT_FILE=""
PAYLOAD=""
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --stdin-json)
      STDIN_JSON=true
      shift
      ;;
    --out)
      OUT_FILE="$2"
      shift 2
      ;;
    *)
      if [[ -z "$PAYLOAD" ]]; then
        PAYLOAD="$1"
      else
        EXTRA_ARGS+=("$1")
      fi
      shift
      ;;
  esac
done

# Set default output file if not specified
if [[ -z "$OUT_FILE" ]]; then
  case "$AGENT" in
    prompting) OUT_FILE="out/prompting.json" ;;
    context) OUT_FILE="out/context.json" ;;
    rules) OUT_FILE="out/rules.json" ;;
    *) OUT_FILE="out/${AGENT}.json" ;;
  esac
fi

# Validate payload
if [[ "$STDIN_JSON" == "false" && -z "$PAYLOAD" ]]; then
  echo "Error: Either --stdin-json or payload file required" >&2
  exit 1
fi

if [[ "$STDIN_JSON" == "false" && ! -f "$PAYLOAD" ]]; then
  echo "Payload file not found: $PAYLOAD" >&2
  exit 1
fi

case "$AGENT" in
  prompting)
    CMD=(node agents/prompting/agent.js)
    ;;
  context)
    CMD=(node agents/context/agent.js)
    ;;
  rules)
    CMD=(node agents/rules/agent.js)
    ;;
  *)
    echo "Unsupported agent: $AGENT" >&2
    exit 1
    ;;
esac

if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
  CMD+=("${EXTRA_ARGS[@]}")
fi

ROOT_DIR="$(pwd)"
TMP_ROOT="$ROOT_DIR/tmp"
RUN_ID="run-${AGENT}-$(date +%Y%m%d%H%M%S)"
RUN_DIR="$TMP_ROOT/$RUN_ID"
LOG_FILE="$RUN_DIR/run.log"
OUT_TMP="$RUN_DIR/output.json"

mkdir -p "$RUN_DIR" "${OUT_FILE%/*}" "$TMP_ROOT"

cleanup_on_exit() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo "Run failed. Logs preserved at $RUN_DIR" >&2
  elif [[ "${KEEP_ARTIFACTS:-0}" != "1" ]]; then
    rm -rf "$RUN_DIR"
  else
    echo "KEEP_ARTIFACTS=1, preserved sandbox at $RUN_DIR"
  fi
  exit $exit_code
}
trap cleanup_on_exit EXIT

set +e
if [[ "$STDIN_JSON" == "true" ]]; then
  "${CMD[@]}" >"$OUT_TMP" 2>"$LOG_FILE"
else
  cat "$PAYLOAD" | "${CMD[@]}" >"$OUT_TMP" 2>"$LOG_FILE"
fi
STATUS=$?
set -e

if [[ $STATUS -ne 0 ]]; then
  echo "Agent execution failed (status $STATUS). See $LOG_FILE" >&2
  exit $STATUS
fi

mv "$OUT_TMP" "$OUT_FILE"
# Output the JSON content to stdout for the orchestrator
cat "$OUT_FILE"
