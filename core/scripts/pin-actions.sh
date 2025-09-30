#!/usr/bin/env bash
set -Eeuo pipefail

# Pins GitHub Actions in workflow files to specific commit SHAs using gh CLI.
# Requirements: gh CLI authenticated with repo read access.

DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

WORKFLOW=".github/workflows/ci.yml"

echo "🔍 Fetching latest SHAs for actions..."
CHECKOUT_SHA=$(gh api repos/actions/checkout/commits --jq '.[0].sha' | head -n1)
SETUP_NODE_SHA=$(gh api repos/actions/setup-node/commits --jq '.[0].sha' | head -n1)

if [[ -z ${CHECKOUT_SHA:-} || -z ${SETUP_NODE_SHA:-} ]]; then
  echo "Failed to fetch SHAs. Ensure network and gh auth are available." >&2
  exit 1
fi

echo "➡ actions/checkout@${CHECKOUT_SHA}"
echo "➡ actions/setup-node@${SETUP_NODE_SHA}"

# Portable in-place edit: write to temp and move
tmpfile=$(mktemp)
sed \
  -E \
  -e "s#uses: actions/checkout@[^[:space:]]+#uses: actions/checkout@${CHECKOUT_SHA}#g" \
  -e "s#uses: actions/setup-node@[^[:space:]]+#uses: actions/setup-node@${SETUP_NODE_SHA}#g" \
  "$WORKFLOW" >"$tmpfile"

if [[ $DRY -eq 1 ]]; then
  echo "🔎 Dry-run: showing diff for $WORKFLOW"
  if command -v diff >/dev/null 2>&1; then diff -u "$WORKFLOW" "$tmpfile" || true; fi
  rm -f "$tmpfile"
  exit 0
fi

mv "$tmpfile" "$WORKFLOW"

echo "✅ Updated $WORKFLOW with pinned SHAs"
