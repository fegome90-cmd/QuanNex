# Upgrade Guide

## Node.js Stack
- Target runtime: Node 20.10+ (LTS). Update via `npm pkg set engines.node '>=20.10.0'` and rerun `npm install --package-lock-only`.
- Run dependency review: `bash tools/node-audit.sh` then `npx npm-check-updates -u && npm install` for staged upgrades.
- ESLint migration: add `@stylistic/eslint-plugin` and replace deprecated rules. Execute `npx eslint . --fix` after installing the plugin.
- Prettier adoption: format Markdown/JSON via `npx prettier --write "**/*.{md,json}"` to maintain uniform docs.

## Bash Tooling
- Normalize shebangs: `rg -l "#!/usr/bin/env bash" scripts | xargs -I{} sed -i '' '1s|#!/usr/bin/env bash|#!/bin/bash|' {}` (macOS) or use `tools/run-codemods.sh --apply`.
- Enforce `set -euo pipefail` in all scripts and replace static temp paths with `mktemp -d` for safe cleanup.
- Add shell unit coverage with `bats` and export JUnit via `bats --report-junit` for CI ingestion.

## Python Utilities (`analisis-motor-rete`)
- Initialize `pyproject.toml` using `uv init --src analisis-motor-rete/implementacion` and declare dependencies (pytest, pytest-cov, ruff).
- Run `bash tools/python-audit.sh lint` to enforce Ruff; fix flagged imports using isort auto-fix.
- Modernize syntax with `python -m pyupgrade --py311-plus analisis-motor-rete/implementacion/*.py` and rerun tests.
- Configure coverage gates: `bash tools/python-audit.sh test` writes `coverage.xml` suitable for CI badges.

## Docker Images
- Pin base images with digests: `FROM node:20-alpine@sha256:<digest>` checked via `docker build --pull`.
- Drop root privileges: `RUN addgroup -S app && adduser -S app -G app` then `USER app`.
- Embed security scanning: `trivy fs --scanners vuln,secret templates/deployment` before releasing templates.

## CI/CD Rollout
- Enable new workflows sequentially: lint → test → security → modernize. Monitor run durations and adjust job matrices.
- Block merges with required checks once success rate exceeds 3 consecutive green runs per workflow.

