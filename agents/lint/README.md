# Lint Agent

## Purpose

Runs static analysis across Bash, Node.js, and Python sources with reproducible outputs.

## Inputs

- Workspace checkout (full repository)
- Config files: `eslint.config.js`, `ruff.toml`, `.prettierrc.json`

## Outputs

- `reports/lint/eslint.json`
- `reports/lint/ruff.txt`
- `reports/lint/shellcheck.sarif`
- Combined summary (schema: `schemas/lint-report.schema.json`)

## Commands

```bash
npm run lint --silent
bash scripts/lint-shell.sh
bash tools/python-audit.sh lint
shellcheck claude-project-init.sh scripts/*.sh --format sarif > reports/lint/shellcheck.sarif
```

## Fail Conditions

- Any linter exit code > 0
- SARIF report contains severity `error`
- Missing lint config -> request Docsync to regenerate
