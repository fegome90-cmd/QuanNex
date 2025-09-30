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
