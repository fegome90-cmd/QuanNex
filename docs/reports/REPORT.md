# Startkit Modernization & MCP Blueprint Report

## Executive Summary

The repository centers on `claude-project-init.sh` plus ~30 supporting Bash utilities that scaffold Claude/agent projects. Node.js appears only as a thin wrapper for linting (ESLint 9.x) while Python scripts live under `analisis-motor-rete/` without packaging. Current automation mixes legacy/manual assets and lacks consistent CI/CD gates, secret scanning hardening, or deterministic refactors. This blueprint introduces an agent-driven MCP program that raises baseline security, ensures dependency hygiene, and automates upgrades across Bash, Node, and Python surfaces.

## Repository Snapshot

- Languages: Bash (core scripts), Node.js (ESLint + examples), Python (RETE research utilities)
- Entrypoints: `claude-project-init.sh`, `scripts/*.sh`, Python calculators in `analisis-motor-rete/implementacion`
- Infrastructure: two legacy GitHub workflows (`ci.yml`, `ci-legacy.yml`); Docker samples in `templates/deployment/` and `archon/`
- Tests: Bash unit harness in `scripts/tests-unit/`, integration smoke in `scripts/test-claude-init.sh`, Python tests undocumented, JS examples with placeholder Jest specs

## Dependency & Stack Inventory

| Stack | Package | Current | Latest | Status |
| Node | runtime (engines.node) | >=16.0.0 | run `npm view node version` | mismatch |
| Node | eslint | 9.34.0 | run `npm view eslint version` | verify |
| Node (example) | eslint | 8.57.0 | run `npm view eslint version` | outdated |
| Python | stdlib only | n/a | pin via `uv pip list` | unpinned |
| Docker | node:18-alpine | 18.x | check `docker run node:18-alpine node -v` | root |

Use the commands column to pull authoritative latest versions before locking updates.

## Findings

### Obsolescencia

- [High] Node engine constraint conflicts with ESLint 9 runtime (`package.json:26`). Action: `npm pkg set engines.node='>=20.10.0'` then document Node 20 in README.
- [Medium] ESLint style rules deprecated under v9 (`eslint.config.js:20-27`). Action: replace with `@stylistic/eslint-plugin` via `npx eslint --init` or add `plugins: ['@stylistic']` and migrate rules.
- [Medium] `scripts/test-claude-init.sh:6-59` uses `set -e` and a static `/tmp/claude-test-projects` path, risking stale runs. Action: switch to `set -euo pipefail` and `mktemp -d`.
- [Low] Docker images lack digest pinning and run as root (`templates/deployment/Dockerfile:1-7`, `archon/Dockerfile:1-19`). Action: adopt digests and add non-root user (`useradd -m app && USER app`).

### Seguridad

- [High] Placeholder secret committed (`analisis-seguridad-proyecto/PLAN-MEJORAS-SEGURIDAD-NUESTRO-PROYECTO.md` mentions `JWT_SECRET`). Keep masked but flag via `gitleaks detect --redact` and move to `.env.sample`.
- [High] CI installs shellcheck/shfmt with `sudo apt-get install` each run (`.github/workflows/ci.yml`), no lockfiles, no SBOM. Action: enforce package cache, move to action like `luizm/action-sh-checker` or container job; add SBOM workflow using `tools/generate-sbom.sh`.
- [Medium] Dockerfiles miss `USER` and `HEALTHCHECK`, leaving root surfaces. Action: add `USER node` (for node image) and `HEALTHCHECK CMD node /app/healthcheck.js || exit 1` once app exists.
- [Medium] Secret scan scripts rely on regex arrays but no baseline/denylist, so they may spam. Action: add `.semgrepignore` and curated gitleaks rules.

### Calidad y Testing

- [High] No automated Node lint/test gating; placeholders remain unchecked (`examples/eslint-basic/src/index.test.js`). Action: add new `lint.yml` and `test.yml` workflows with fail-fast gates.
- [Medium] Python modules untyped and untested beyond sample file (`analisis-motor-rete/tests/test_confidence_calculator.py`). Action: adopt `ruff`, `pytest`, `coverage` via `uv` and wire into agents.
- [Medium] Bash lint uses `#!/usr/bin/env bash` contrary to repo conventions (`scripts/lint-shell.sh:1`). Action: normalize shebangs (`find scripts -name '*.sh' -exec sed -i '1s|.*|#!/bin/bash|' {}`).
- [Low] Integration script lacks coverage reports. Action: wrap `scripts/test-claude-init.sh` inside `tools/coverage.sh` once instrumentation defined.

## MCP Modernization Plan

### Phase Alpha (Weeks 0-2)

1. Stand up automation assets added in this PR: new GitHub Actions, SBOM & audit scripts, agent schemas.
2. Enforce Node 20 runtime and regenerate lockfiles via `npm install --package-lock-only`.
3. Introduce Python `uv` virtualenv (`uv init --python 3.12`) and `pyproject.toml` scaffolding for RETE tools.

### Phase Beta (Weeks 3-5)

1. Activate Docsync agent to track dependency drift, storing matrix in `advice/version_matrix.json`.
2. Run lint/refactor codemods (ESLint stylistic migration, `pyupgrade`, shell shebang fix) via Refactor agent pipelines.
3. Expand tests: convert Bash harness outputs into JUnit (`bats --formatter junit`) and integrate Python `pytest --cov`.

### Phase Stable (Week 6+)

1. Enforce security gates (SCA, Semgrep, gitleaks) pre-merge; block high CVEs automatically.
2. Orchestrator agent coordinates Docsync → Lint → Refactor → Tests → SecScan and reports SARIF plus metrics.
3. Establish metric exports to `metrics/README.md` and push dashboards.

## Risk Map

- Toolchain drift: Node runtime vs ESLint requirement (blocker) — mitigated by Docsync agent and CI gate.
- Security debt: unpinned images, potential secrets — mitigated by SecScan agent and policy-as-code.
- Testing gaps: placeholders and manual checks — mitigated by Tests agent generating smoke specs.
- Operational noise: regex-based secret scan false positives — mitigated by curated allowlists and agent triage queue.

## Reproducibility Commands

```
# Repo inventory
find . -maxdepth 2 -type d

# Dependency checks
npm pkg get engines.node
npm ls --depth=0
examples/eslint-basic> npm ls --depth=0

# Security scans
bash tools/generate-sbom.sh
bash tools/node-audit.sh
bash tools/python-audit.sh

# Linting & tests
bash scripts/lint-shell.sh
npm run lint
bash tools/run-codemods.sh --check
```

## New Assets Overview

- GitHub Actions: `.github/workflows/lint.yml`, `test.yml`, `security.yml`, `modernize.yml`
- Agents & Schemas: `agents/*/README.md`, JSON schemas in `schemas/`
- Tooling: `tools/generate-sbom.sh`, `tools/node-audit.sh`, `tools/python-audit.sh`, `tools/run-codemods.sh`
- Upgrade guide: `plans/UPGRADE_GUIDE.md`
