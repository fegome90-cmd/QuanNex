# Orchestrator Agent

## Purpose

Coordinates Docsync → Lint → Refactor → Tests → SecScan, enforces gates, and publishes status artifacts.

## Inputs

- Agent manifests (`agents/**/README.md`)
- `orchestration/PLAN.yaml`
- Prior run metadata (stored in `reports/edge/`)

## Outputs

- `reports/orchestration/status.json` (schema: `schemas/orchestrator-status.schema.json`)
- Pull request comment payload with summary + links to artifacts

## Commands

```bash
yq -o=json orchestration/PLAN.yaml > reports/orchestration/plan.json
gh workflow run modernize.yml --ref "$GITHUB_REF"
```

## Fail Conditions

- Any dependency agent reports `status: fail`
- Missing artifacts when required by PLAN gates
- Metrics drift beyond thresholds in `metrics/README.md`
