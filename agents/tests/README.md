# Tests Agent

## Purpose

Executes all available test suites and enforces minimal coverage gates.

## Inputs

- Node scripts (`scripts/test-claude-init.sh`, `scripts/test-unit.sh`)
- Python tests (`analisis-motor-rete/tests`)
- Bats harness when available

## Outputs

- `reports/tests/junit.xml` (future enhancement)
- `coverage.xml` from `bash tools/python-audit.sh test`
- JSON summary (schema: `schemas/test-report.schema.json`)

## Commands

```bash
npm test --silent
bash scripts/test-unit.sh
bash scripts/bats-run.sh
bash tools/python-audit.sh test
```

## Fail Conditions

- Coverage < 70%
- Any suite exits with non-zero status (other than optional bats skip)
- Missing test assets -> orchestrator opens backlog task
