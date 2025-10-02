# Artifact & Cleanup Policy

## Temporary Layout
- All ephemeral data is scoped to `tmp/run-<agent>-<timestamp>/`.
- Logs are written to `tmp/run-*/run.log` and removed automatically unless `KEEP_ARTIFACTS=1`.
- Security-sensitive outputs are never stored outside `process.cwd()`; traversal, symlinks, oversized files, and source lists >50 are rejected.

## Contract Outputs
- `core/scripts/run-clean.sh <agent> payload.json` validates payloads, executes the agent, and stores validated artifacts in:
  - `out/prompt.json`
  - `out/context.json`
  - `out/rules.json`
- Failed runs keep their sandbox for inspection; successful runs remove it.
- CI workflows (`agents-core.yml`, `restructure-check.yml`) call `tools/cleanup.mjs` so no residue (tmp/, .reports/, *.log) survives a green run; manual runs should follow the same expectation.

## Cleanup Utilities
- `tools/cleanup.mjs` removes `tmp/`, `.reports/`, and `coverage/tmp` folders, plus loose `*.log` files.
- `.github/workflows/agents-core.yml` and `.github/workflows/restructure-check.yml` perform post-job cleanup to guarantee a spotless workspace, even on failure.

## Preventing Noise in Git
- `.gitignore` / `.dockerignore` exclude logs, tmp data, and ephemeral reports.
- `.githooks/pre-commit` blocks commits that include `tmp/`, `.reports/`, `coverage/`, or `*.log` artifacts.

Adhering to these rules keeps MCP agents reproducible, lean, and secure.
