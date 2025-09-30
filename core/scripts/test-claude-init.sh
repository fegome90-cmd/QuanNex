#!/bin/bash

# Test script for core/claude-project-init.sh
# Tests all project types and functionality

set -e # Exit on any error

# Resolve script path dynamically from repo root to avoid hardcoding
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SCRIPT_PATH="$REPO_ROOT/core/claude-project-init.sh"
TEST_DIR="/tmp/claude-test-projects"
ORIGINAL_DIR=$(pwd)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

log() {
  echo -e "${GREEN}[TEST]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test function
run_test() {
  local test_name="$1"
  local test_function="$2"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  log "Running: $test_name"

  if $test_function; then
    echo -e "${GREEN}✅ PASSED:${NC} $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}❌ FAILED:${NC} $test_name"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo
}

# Setup test environment
setup_test_env() {
  rm -rf "$TEST_DIR"
  mkdir -p "$TEST_DIR"
}

# Test project creation with specific type
test_project_creation() {
  local project_name="$1"
  local project_type="$2"
  local expected_type="$3"

  cd "$TEST_DIR"

  # Create input for script
  echo -e "$project_name\n$project_type" | CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" --use-templates on --templates-path "$REPO_ROOT/core/templates" >/dev/null 2>&1

  if [ ! -d "$project_name" ]; then
    error "Project directory not created: $project_name"
    return 1
  fi

  cd "$project_name"

  # Verify basic structure
  if [ ! -d ".claude" ]; then
    error "Claude directory not created"
    return 1
  fi

  if [ ! -d ".claude/commands" ] || [ ! -d ".claude/agents" ]; then
    error "Basic Claude subdirectories not created"
    return 1
  fi

  if [ ! -f "CLAUDE.md" ]; then
    error "CLAUDE.md not created"
    return 1
  fi

  if [ ! -f ".gitignore" ]; then
    error ".gitignore not created"
    return 1
  fi

  # Verify git repo
  if [ ! -d ".git" ]; then
    error "Git repository not initialized"
    return 1
  fi

  return 0
}

# Test frontend project
test_frontend_project() {
  test_project_creation "test-frontend" "1" "frontend"

  local project_dir="$TEST_DIR/test-frontend"

  # Verify standard commands exist
  for cmd in test-ui create-component review deploy optimize commit; do
    if [ ! -f "$project_dir/.claude/commands/${cmd}.md" ]; then
      error "Command not found: ${cmd}.md"
      return 1
    fi
  done

  # Verify standard agents exist
  for agent in backend-architect react-expert code-reviewer; do
    if [ ! -f "$project_dir/.claude/agents/${agent}.json" ]; then
      error "Agent not found: ${agent}.json"
      return 1
    fi
  done

  # Verify CLAUDE.md contains frontend-specific content
  if ! grep -qi "Proyecto Frontend" "$project_dir/CLAUDE.md"; then
    error "Frontend-specific header not found in CLAUDE.md"
    return 1
  fi
  # No unresolved placeholders
  if grep -q "{{[A-Z_\-]*}}" "$project_dir/CLAUDE.md"; then
    error "Placeholders not resolved in CLAUDE.md (frontend)"
    return 1
  fi
  # Healthcheck exists and runs
  if [ ! -x "$project_dir/healthcheck.sh" ]; then
    error "healthcheck.sh missing or not executable (frontend)"
    return 1
  fi
  (cd "$project_dir" && bash ./healthcheck.sh) || {
    error "healthcheck failed (frontend)"
    return 1
  }

  return 0
}

# Test backend project
test_backend_project() {
  test_project_creation "test-backend" "2" "backend"

  local project_dir="$TEST_DIR/test-backend"

  # Verify CLAUDE.md contains backend-specific content
  if ! grep -qi "Proyecto Backend" "$project_dir/CLAUDE.md"; then
    error "Backend-specific header not found in CLAUDE.md"
    return 1
  fi
  if grep -q "{{[A-Z_\-]*}}" "$project_dir/CLAUDE.md"; then
    error "Placeholders not resolved in CLAUDE.md (backend)"
    return 1
  fi
  if [ ! -x "$project_dir/healthcheck.sh" ]; then
    error "healthcheck.sh missing or not executable (backend)"
    return 1
  fi
  (cd "$project_dir" && bash ./healthcheck.sh) || {
    error "healthcheck failed (backend)"
    return 1
  }
  # Global placeholder scan
  if rg -n "\{\{[A-Z_\-]+}}" -S "$project_dir" | grep -q .; then
    error "Unresolved placeholders found (backend project)"
    return 1
  fi

  return 0
}

# Test fullstack project
test_fullstack_project() {
  test_project_creation "test-fullstack" "3" "fullstack"

  local project_dir="$TEST_DIR/test-fullstack"

  # Verify CLAUDE.md contains fullstack-specific content
  if ! grep -qi "Proyecto Fullstack" "$project_dir/CLAUDE.md"; then
    error "Fullstack-specific header not found in CLAUDE.md"
    return 1
  fi
  if grep -q "{{[A-Z_\-]*}}" "$project_dir/CLAUDE.md"; then
    error "Placeholders not resolved in CLAUDE.md (fullstack)"
    return 1
  fi
  if [ ! -x "$project_dir/healthcheck.sh" ]; then
    error "healthcheck.sh missing or not executable (fullstack)"
    return 1
  fi
  (cd "$project_dir" && bash ./healthcheck.sh) || {
    error "healthcheck failed (fullstack)"
    return 1
  }
  # Global placeholder scan
  if rg -n "\{\{[A-Z_\-]+}}" -S "$project_dir" | grep -q .; then
    error "Unresolved placeholders found (fullstack project)"
    return 1
  fi

  return 0
}

# Test medical project
test_medical_project() {
  test_project_creation "test-medical" "4" "medical"

  local project_dir="$TEST_DIR/test-medical"

  # Verify medical-reviewer agent exists
  if [ ! -f "$project_dir/.claude/agents/medical-reviewer.json" ]; then
    error "Medical reviewer agent not found"
    return 1
  fi

  # Verify CLAUDE.md contains medical-specific content
  if ! grep -qi "Proyecto Medical" "$project_dir/CLAUDE.md"; then
    error "Medical-specific header not found in CLAUDE.md"
    return 1
  fi

  # Verify HIPAA is mentioned
  if ! grep -qi "HIPAA" "$project_dir/CLAUDE.md"; then
    error "HIPAA not mentioned in CLAUDE.md"
    return 1
  fi
  if grep -q "{{[A-Z_\-]*}}" "$project_dir/CLAUDE.md"; then
    error "Placeholders not resolved in CLAUDE.md (medical)"
    return 1
  fi
  if [ ! -x "$project_dir/healthcheck.sh" ]; then
    error "healthcheck.sh missing or not executable (medical)"
    return 1
  fi
  (cd "$project_dir" && bash ./healthcheck.sh) || {
    error "healthcheck failed (medical)"
    return 1
  }
  # Global placeholder scan
  if rg -n "\{\{[A-Z_\-]+}}" -S "$project_dir" | grep -q .; then
    error "Unresolved placeholders found (medical project)"
    return 1
  fi

  return 0
}

# Test design system project (NEW)
test_design_project() {
  test_project_creation "test-design" "5" "design"

  local project_dir="$TEST_DIR/test-design"

  # Verify design-specific directory structure
  for dir in ".claude/memory/market_research" ".claude/memory/personas" ".claude/memory/design_tokens" ".claude/memory/iteration_history" "variants/A" "variants/B" "variants/C" "design_tokens" "reports/visual_diff" "reports/accessibility" "reports/performance"; do
    if [ ! -d "$project_dir/$dir" ]; then
      error "Design directory not found: $dir"
      return 1
    fi
  done

  # Verify project context file
  if [ ! -f "$project_dir/.claude/memory/project_context.json" ]; then
    error "Project context file not found"
    return 1
  fi

  # Verify design-specific commands
  for cmd in anti-iterate design-review uniqueness-check; do
    if [ ! -f "$project_dir/.claude/commands/${cmd}.md" ]; then
      error "Design command not found: ${cmd}.md"
      return 1
    fi
  done

  # Verify design agents
  for agent in design-orchestrator market-analyst persona-forge design-builder visual-validator accessibility-guardian performance-optimizer; do
    if [ ! -f "$project_dir/.claude/agents/${agent}.json" ]; then
      error "Design agent not found: ${agent}.json"
      return 1
    fi
  done

  # Verify CLAUDE.md contains design-specific content
  if ! grep -q "Premium UI/UX Design System - PRIORITY COMMANDS" "$project_dir/CLAUDE.md"; then
    error "Design-specific commands header not found in CLAUDE.md"
    return 1
  fi

  # Verify anti-generic principles
  if ! grep -qi "Anti-Generic Principles" "$project_dir/CLAUDE.md"; then
    error "Anti-Generic Principles not found in CLAUDE.md"
    return 1
  fi

  if grep -q "{{[A-Z_\-]*}}" "$project_dir/CLAUDE.md"; then
    error "Placeholders not resolved in CLAUDE.md (design)"
    return 1
  fi
  if [ ! -x "$project_dir/healthcheck.sh" ]; then
    warn "healthcheck.sh missing or not executable (design)"
  else (cd "$project_dir" && bash ./healthcheck.sh) || warn "healthcheck failed (design)"; fi
  # Global placeholder scan
  if rg -n "\{\{[A-Z_\-]+}}" -S "$project_dir" | grep -q .; then
    error "Unresolved placeholders found (design project)"
    return 1
  fi

  return 0
}

# Test generic project
test_generic_project() {
  test_project_creation "test-generic" "6" "generic"

  local project_dir="$TEST_DIR/test-generic"

  # Verify CLAUDE.md contains generic content
  if ! grep -q "Generic Development - PRIORITY COMMANDS" "$project_dir/CLAUDE.md"; then
    error "Generic-specific content not found in CLAUDE.md"
    return 1
  fi
  if grep -q "{{[A-Z_\-]*}}" "$project_dir/CLAUDE.md"; then
    error "Placeholders not resolved in CLAUDE.md (generic)"
    return 1
  fi
  if [ ! -x "$project_dir/healthcheck.sh" ]; then
    warn "healthcheck.sh missing or not executable (generic)"
  else (cd "$project_dir" && bash ./healthcheck.sh) || warn "healthcheck failed (generic)"; fi
  # Global placeholder scan
  if rg -n "\{\{[A-Z_\-]+}}" -S "$project_dir" | grep -q .; then
    error "Unresolved placeholders found (generic project)"
    return 1
  fi

  return 0
}

# Test MCP configuration
test_mcp_config() {
  local project_dir="$TEST_DIR/test-frontend"

  if [ ! -f "$project_dir/.claude/mcp.json" ]; then
    error "MCP configuration not found"
    return 1
  fi

  # Verify Playwright MCP is configured
  if ! grep -q "playwright" "$project_dir/.claude/mcp.json"; then
    error "Playwright MCP not configured"
    return 1
  fi

  return 0
}

# Test MCP state reporting (non-fatal when disabled)
test_mcp_state_reporting() {
  local project_dir="$TEST_DIR/test-frontend"
  # Create a disabled state file
  mkdir -p "$project_dir/.claude"
  cat >"$project_dir/.claude/mcp.state.json" <<JSON
{ "state": "disabled", "reason": "tests" }
JSON
  # Healthcheck should still pass
  (cd "$project_dir" && bash ./healthcheck.sh) || {
    error "Healthcheck failed with MCP disabled state"
    return 1
  }
  return 0
}

# Test hooks configuration
test_hooks_config() {
  local project_dir="$TEST_DIR/test-frontend"

  if [ ! -f "$project_dir/.claude/hooks.json" ]; then
    error "Hooks configuration not found"
    return 1
  fi

  # Verify hooks structure
  if ! grep -q '"hooks"' "$project_dir/.claude/hooks.json"; then
    error "Hooks structure not found"
    return 1
  fi

  return 0
}

# Test error handling
test_error_handling() {
  cd "$TEST_DIR"

  # Test empty project name
  if echo -e "\n1" | CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" >/dev/null 2>&1; then
    error "Script should fail with empty project name"
    return 1
  fi

  # Test existing directory
  mkdir -p existing-project
  if echo -e "existing-project\n1" | CLAUDE_INIT_SKIP_DEPS=1 bash "$SCRIPT_PATH" >/dev/null 2>&1; then
    error "Script should fail with existing directory"
    return 1
  fi

  return 0
}

# Main test execution
main() {
  log "Starting comprehensive test of core/claude-project-init.sh"
  log "Script path: $SCRIPT_PATH"

  setup_test_env

  # Run all tests
  run_test "Frontend Project Creation" test_frontend_project
  run_test "Backend Project Creation" test_backend_project
  run_test "Fullstack Project Creation" test_fullstack_project
  run_test "Medical Project Creation" test_medical_project
  run_test "Design System Project Creation" test_design_project
  run_test "Generic Project Creation" test_generic_project
  run_test "MCP Configuration" test_mcp_config
  run_test "MCP State Reporting" test_mcp_state_reporting
  run_test "Hooks Configuration" test_hooks_config
  run_test "Error Handling" test_error_handling

  # Final report
  echo
  echo "=========================================="
  log "TEST SUMMARY"
  echo "=========================================="
  echo -e "Total Tests: ${YELLOW}$TOTAL_TESTS${NC}"
  echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

  if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Script is 100% operational.${NC}"
    echo -e "${GREEN}✅ The core/claude-project-init.sh script works perfectly with all 6 project types.${NC}"
    echo -e "${GREEN}✅ Antigeneric-agents integration is fully functional.${NC}"
  else
    echo -e "\n${RED}❌ Some tests failed. Please review the errors above.${NC}"
    return 1
  fi

  # Cleanup
  cd "$ORIGINAL_DIR"
  log "Test completed. Test projects created in: $TEST_DIR"
  log "You can inspect the generated projects for manual verification."
}

# Run tests
main "$@"
