# Repository Guidelines

## Project Structure & Module Organization

- Root `claude-project-init.sh`: interactive initializer that scaffolds new Claude Code projects and writes `.claude/`.
- `scripts/`: maintenance utilities like `verify-dependencies.sh` and `test-claude-init.sh`.
- `templates/`, `docs/`, `ejemplos/`: reference material and starter assets.
- Research tracks: `brainstorm/`, `investigacion/`, and hyphen‑cased folders like `1-prompt-engineering/`.
- Generated projects include `.claude/commands/*.md`, `.claude/agents/*.json`, and a tailored `CLAUDE.md`.

## Build, Test, and Development Commands

- `./scripts/verify-dependencies.sh`: checks Git, GitHub CLI, Node/npm, Playwright.
- `./scripts/test-claude-init.sh`: integration test for `claude-project-init.sh` across project types.
- `./claude-project-init.sh`: run to scaffold a new project (use a fresh directory).

Example:

```
./scripts/verify-dependencies.sh
./claude-project-init.sh
```

## Coding Style & Naming Conventions

- Bash: use `#!/bin/bash` and `set -e` (or `set -euo pipefail`), 2‑space indent.
- Functions: `snake_case` (e.g., `check_dependency`). Constants: UPPER_SNAKE (e.g., `GREEN`, `NC`).
- Directories: hyphen‑case for specialty tracks (`1-prompt-engineering/`).
- Docs: clear headings, fenced code blocks for commands; English by default (Spanish allowed where present).

## Testing Guidelines

- Primary test: `./scripts/test-claude-init.sh` (uses a temp dir and validates generated structure, agents, and commands).
- When changing the initializer, add/adjust checks in the test script; avoid manual verification.
- Optional lint: `shellcheck claude-project-init.sh` for static analysis.

## Commit & Pull Request Guidelines

- Conventional Commits (optionally with emojis): `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`.
- Commit messages: concise, imperative subject; include rationale for structural or default changes.
- PRs: provide description, linked issue, and sample outputs (tree of generated project and key CLI logs). Include notes on backward compatibility; screenshots only if UI assets are affected.

## Security & Configuration Tips

- Run the initializer in a new folder to avoid overwrites.
- Do not commit secrets; keep sensitive data out of `CLAUDE.md` and `.claude/memory/` in generated projects.
- No GitHub Actions by default; pushes are manual unless you add CI.

## MCP Tools Usage Guidelines

### Available MCP Tools

#### 1. Security Agent (`agents/security/agent.js`)
- **Purpose:** Comprehensive security analysis and vulnerability detection
- **Usage:** `node agents/security/agent.js '{"target_path": ".", "check_mode": "scan", "scan_depth": 2}'`
- **Output:** JSON report with findings, severity breakdown, and recommendations
- **When to use:** Before major changes, security audits, vulnerability assessments

#### 2. Orchestrator (`orchestration/orchestrator.js`)
- **Purpose:** Coordinate multiple agents and manage complex workflows
- **Usage:** `node orchestration/orchestrator.js`
- **Configuration:** Defined in `orchestration/plan.json`
- **When to use:** Multi-agent tasks, complex repairs, automated workflows

#### 3. Test Agent (`agents/tests/test-agent.js`)
- **Purpose:** Automated testing and validation
- **Usage:** `node agents/tests/test-agent.js`
- **When to use:** After code changes, validation phases, CI/CD integration

#### 4. Documentation Agent (`agents/docsync/docsync-agent.js`)
- **Purpose:** Update and synchronize documentation
- **Usage:** `node agents/docsync/docsync-agent.js`
- **When to use:** After structural changes, documentation updates

### MCP Usage Workflow

#### For Security Tasks:
1. **Start with Security Agent:** `node agents/security/agent.js`
2. **Analyze findings:** Review JSON output for vulnerabilities
3. **Apply fixes:** Address high/medium severity issues first
4. **Re-scan:** Verify fixes with security agent
5. **Update docs:** Use documentation agent if needed

#### For Complex Repairs:
1. **Activate Orchestrator:** `node orchestration/orchestrator.js`
2. **Define workflow:** Update `orchestration/plan.json` if needed
3. **Execute coordinated tasks:** Let orchestrator manage agents
4. **Monitor progress:** Check agent outputs and logs
5. **Validate results:** Use test agent for final validation

#### For Testing Tasks:
1. **Run Test Agent:** `node agents/tests/test-agent.js`
2. **Review test results:** Analyze failures and coverage
3. **Fix issues:** Address test failures
4. **Re-run tests:** Validate fixes
5. **Update documentation:** Use docsync agent if needed

### MCP Tools Integration

#### With DAST Scanner:
- **Security Agent + DAST:** Use security agent for static analysis, DAST for dynamic testing
- **Orchestrator + DAST:** Coordinate security agent and DAST scanner
- **Test Agent + DAST:** Validate DAST functionality and reports

#### With Project Initialization:
- **Security Agent:** Scan generated projects for vulnerabilities
- **Test Agent:** Validate generated project structure
- **Documentation Agent:** Update project documentation

### MCP Tools Best Practices

1. **Always start with Security Agent** for security-related tasks
2. **Use Orchestrator for complex multi-step processes**
3. **Validate with Test Agent** after significant changes
4. **Update documentation** with Documentation Agent when needed
5. **Check tool outputs** before proceeding to next steps
6. **Log tool usage** for future reference and debugging

### MCP Tools Limitations

- **MCP Archon:** Currently disabled - do not use for task management
  - **Reason:** External dependency not yet integrated
  - **Alternative:** Use internal task management and TODO lists
  - **Status:** Will be enabled in future versions
- **External Dependencies:** Some tools require specific system dependencies (jq, curl)
- **Configuration:** Tools may need specific configuration for optimal performance
- **Error Handling:** Always check tool exit codes and error messages

### MCP Tools Troubleshooting

#### Common Issues:
1. **Permission errors:** Ensure scripts are executable (`chmod +x`)
2. **Dependency missing:** Install required tools (jq, curl, node)
3. **Configuration errors:** Check tool-specific configuration files
4. **Output parsing:** Validate JSON output format before processing

#### Debug Commands:
```bash
# Check tool availability
ls -la agents/*/agent.js
ls -la orchestration/orchestrator.js

# Verify dependencies
which jq curl node

# Test individual tools
node agents/security/agent.js '{"target_path": ".", "check_mode": "scan"}'
node orchestration/orchestrator.js --help
```
