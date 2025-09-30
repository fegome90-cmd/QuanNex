#!/bin/bash
set -euo pipefail

# Create workflow from plan.json
CONFIG_FILE="orchestration/plan.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: $CONFIG_FILE not found"
  exit 1
fi

echo "🔨 Creating workflow from $CONFIG_FILE..."

# Create workflow and capture output
OUTPUT=$(cat "$CONFIG_FILE" | node orchestration/orchestrator.js create)
WF_ID=$(echo "$OUTPUT" | jq -r '.workflow_id')

if [ "$WF_ID" = "null" ] || [ -z "$WF_ID" ]; then
  echo "❌ Error: Failed to create workflow"
  echo "Output: $OUTPUT"
  exit 1
fi

# Save workflow ID
echo "$WF_ID" > .wf_id
echo "✅ Workflow created: $WF_ID"
echo "📁 Workflow ID saved to .wf_id"
