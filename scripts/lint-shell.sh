#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔍 Shell lint & format check${NC}"

has_cmd() { command -v "$1" >/dev/null 2>&1; }

fail=0

if has_cmd shellcheck; then
  echo -e "${GREEN}▶ shellcheck${NC}"
  shellcheck claude-project-init.sh scripts/*.sh || fail=1
else
  echo -e "${YELLOW}⚠ shellcheck not found. Skipping static analysis.${NC}"
fi

if has_cmd shfmt; then
  echo -e "${GREEN}▶ shfmt (diff only)${NC}"
  # Show formatting diff; do not modify files automatically here
  shfmt -d -i 2 -ci -s claude-project-init.sh scripts || fail=1
else
  echo -e "${YELLOW}⚠ shfmt not found. Skipping format check.${NC}"
fi

if [ "$fail" -ne 0 ]; then
  echo -e "${RED}❌ Lint/format issues detected.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Shell scripts clean.${NC}"
