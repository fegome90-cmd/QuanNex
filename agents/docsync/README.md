# Docsync Agent

## Purpose

Keeps dependency manifests in sync with ecosystem releases and writes normalized advice for downstream agents.

## Inputs

- `package.json`, `package-lock.json`
- `examples/**/package.json`
- Python discovery via `analisis-motor-rete/implementacion`
- Dockerfiles under `templates/` and `archon/`

## Outputs

- `advice/version_matrix.json` (schema: `schemas/docsync-output.schema.json`)
- Updated changelog snippets under `reports/`

## Commands

```bash
bash tools/node-audit.sh
bash tools/python-audit.sh audit
syft . -o json > reports/sbom.json
npx npm-check-updates --workspace . > reports/npm-updates.txt
```

## Fail Conditions

- Missing manifest (`package.json`, Dockerfile) -> escalate to orchestrator
- Security advisory marked critical/high -> block orchestrator until remediated
