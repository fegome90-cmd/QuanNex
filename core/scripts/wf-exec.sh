#!/bin/bash
set -euo pipefail

# Execute workflow
WF_ID_FILE=".wf_id"
if [ ! -f "$WF_ID_FILE" ]; then
  echo "❌ Error: $WF_ID_FILE not found. Run 'npm run wf:create' first."
  exit 1
fi

WF_ID=$(cat "$WF_ID_FILE")
if [ -z "$WF_ID" ]; then
  echo "❌ Error: Workflow ID is empty"
  exit 1
fi

echo "🚀 Executing workflow: $WF_ID"

# Execute workflow
node orchestration/orchestrator.js execute "$WF_ID"

echo "✅ Workflow execution completed"
