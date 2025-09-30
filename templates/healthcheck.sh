#!/usr/bin/env bash
set -Eeuo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok(){ echo -e "${GREEN}OK${NC} $*"; }
ko(){ echo -e "${RED}FAIL${NC} $*"; exit 1; }

TYPE='{{PROJECT_TYPE}}'

test -d .claude || ko ".claude directory missing"
test -d .claude/commands || ko ".claude/commands missing"
test -d .claude/agents || ko ".claude/agents missing"
test -f CLAUDE.md || ko "CLAUDE.md missing"
test -f .gitignore || ko ".gitignore missing"
test -f .env.example || ko ".env.example missing"
test -f .claude/mcp.json || ko ".claude/mcp.json missing"
grep -q 'playwright' .claude/mcp.json || ko "MCP playwright not configured"
test -f .claude/hooks.json || ko ".claude/hooks.json missing"
# Hooks safe-by-default: lint fix must be gated by env var
grep -q 'CLAUDE_HOOKS_LINT_FIX' .claude/hooks.json || ko "Hooks not gated by CLAUDE_HOOKS_LINT_FIX"

# .gitignore must ignore .claude/memory with exceptions
grep -q '\.claude/memory/\*' .gitignore || ko ".gitignore must ignore .claude/memory/*"
grep -q '!\.claude/memory/\.gitkeep' .gitignore || ko ".gitignore must keep .gitkeep"
grep -q '!\.claude/memory/project_context\.json' .gitignore || ko ".gitignore must keep project_context.json"

# MCP state reporting (non-fatal if disabled)
if [ -f .claude/mcp.state.json ]; then
  if command -v jq >/dev/null 2>&1; then
    STATE=$(jq -r '.state // "unknown"' .claude/mcp.state.json 2>/dev/null || echo unknown)
    REASON=$(jq -r '.reason // ""' .claude/mcp.state.json 2>/dev/null || true)
  else
    STATE=$(sed -n 's/.*"state"\s*:\s*"\([^"]*\)".*/\1/p' .claude/mcp.state.json 2>/dev/null | head -n1 || echo unknown)
    REASON=$(sed -n 's/.*"reason"\s*:\s*"\([^"]*\)".*/\1/p' .claude/mcp.state.json 2>/dev/null | head -n1 || true)
  fi
  if [ "$STATE" = "disabled" ]; then
    echo -e "${YELLOW}MCP disabled${NC} reason=${REASON:-n/a}"
  else
    ok "MCP state=$STATE"
  fi
else
  echo -e "${YELLOW}MCP state file missing (non-fatal)${NC}"
fi

# Ensure .gitignore blocks memory (except placeholders)
grep -q '.claude/memory/*' .gitignore || ko ".gitignore should ignore .claude/memory/*"

# Agent mapping: any @agent in CLAUDE.md must exist in .claude/agents
if command -v rg >/dev/null 2>&1; then
  AGENTS=$(rg -o '@[A-Za-z0-9_-]+' -N CLAUDE.md | sed 's/@//' | sort -u)
else
  AGENTS=$(grep -o '@[A-Za-z0-9_-]\+' CLAUDE.md | sed 's/@//' | sort -u)
fi
for a in $AGENTS; do
  test -f ".claude/agents/$a.json" || ko "Referenced agent @$a missing (.claude/agents/$a.json)"
done

case "$TYPE" in
  design)
    for d in .claude/memory/market_research .claude/memory/personas .claude/memory/design_tokens .claude/memory/iteration_history variants/A variants/B variants/C design_tokens reports/visual_diff reports/accessibility reports/performance; do
      test -e "$d" || ko "design asset missing: $d"
    done
    for c in anti-iterate design-review uniqueness-check; do
      test -f ".claude/commands/$c.md" || ko "missing command: $c.md"
    done
    # visual-validator requires Playwright MCP
    test -f ".claude/agents/visual-validator.json" || ko "visual-validator agent missing"
    grep -q 'playwright' .claude/mcp.json || ko "Playwright MCP required for visual-validator"
    ;;
  medical)
    grep -qi "Proyecto Medical" CLAUDE.md || ko "CLAUDE.md missing medical section"
    test -f .claude/agents/medical-reviewer.json || ko "medical-reviewer agent missing"
    grep -qi "hipaa" CLAUDE.md || ko "HIPAA notes missing in CLAUDE.md"
    test -x scripts/check-phi.sh || ko "scripts/check-phi.sh missing or not executable (medical)"
    ;;
  frontend)
    grep -qi "Proyecto Frontend" CLAUDE.md || ko "Frontend section missing in CLAUDE.md"
    ;;
  backend)
    grep -qi "Proyecto Backend" CLAUDE.md || ko "Backend section missing in CLAUDE.md"
    ;;
  fullstack)
    grep -qi "Proyecto Fullstack" CLAUDE.md || ko "Fullstack section missing in CLAUDE.md"
    ;;
  generic)
    grep -q "Generic Development - PRIORITY COMMANDS" CLAUDE.md || ko "Generic section missing in CLAUDE.md"
    ;;
  *) :;;
esac

ok "Healthcheck passed for type=$TYPE"

# EOL check (CRLF should not be present in tracked files)
if command -v rg >/dev/null 2>&1; then
  if rg -n $'\r$' -S --glob '!vendor' --glob '!*node_modules*' --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.gif' . | grep -q .; then
    ko "CRLF line endings detected; please normalize to LF"
  fi
else
  if grep -RIl . | xargs grep -n $'\r$' 2>/dev/null | grep -q .; then
    ko "CRLF line endings detected; please normalize to LF"
  fi
fi

# Permissions check for scripts (healthcheck must be 0755)
PERM_OK=false
if command -v stat >/dev/null 2>&1; then
  if [[ "$(uname)" = "Darwin" ]]; then
    perms=$(stat -f "%Lp" ./healthcheck.sh 2>/dev/null || echo "")
  else
    perms=$(stat -c "%a" ./healthcheck.sh 2>/dev/null || echo "")
  fi
  if [[ "$perms" = "755" ]]; then PERM_OK=true; fi
fi
if [[ "$PERM_OK" != true ]]; then
  ko "healthcheck.sh must have permissions 0755"
fi
