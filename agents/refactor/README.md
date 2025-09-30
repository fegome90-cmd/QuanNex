# Refactor Agent

## Purpose

Applies deterministic codemods to keep scripts and libraries aligned with supported runtimes.

## Inputs

- `tools/run-codemods.sh`
- Codemod recipes under `plans/` (future extensions)
- ESLint + Ruff + pyupgrade

## Outputs

- `reports/refactor/diff.patch`
- Summary JSON (schema: `schemas/refactor-report.schema.json`)

## Commands

```bash
bash tools/run-codemods.sh --apply
git diff > reports/refactor/diff.patch
```

## Fail Conditions

- Git diff not empty after codemods (requires manual review)
- Tool missing (pyupgrade, shfmt) -> raise task for Docsync/Tooling agent
- Conflicts with local modifications -> orchestrator reruns after clean checkout
