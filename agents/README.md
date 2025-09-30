# Core MCP Agents

This phase delivers the three foundational agents required by the MCP-first blueprint. Each agent combines a deterministic MCP driver and a thin orchestration layer that enforces JSON contracts (schema version 1.0.0).

- `@rules`: `agents/rules/server.js` driver + `agents/rules/agent.js` wrapper using `schemas/agents/rules.*.json`
- `@context`: `agents/context/server.js` driver + `agents/context/agent.js` wrapper using `schemas/agents/context.*.json`
- `@prompting`: `agents/prompting/server.js` driver + `agents/prompting/agent.js` wrapper using `schemas/agents/prompting.*.json`

Contract tests live alongside each agent under `tests/` and run via `.github/workflows/agents-core.yml`.

## Local Test Commands

```bash
node --test agents/rules/tests/contract.test.js
node --test agents/context/tests/contract.test.js
node --test agents/prompting/tests/contract.test.js
```

## Artifact & Cleanup Policy

- Runtime outputs are created via `core/scripts/run-clean.sh <agent> payload.json` and stored in `out/` iff validation succeeds.
- Temporary sandboxes live in `tmp/run-*/` and are removed automatically (set `KEEP_ARTIFACTS=1` to retain).
- `tools/cleanup.mjs` removes `tmp/`, `.reports/`, and `coverage/tmp` to keep the workspace pristine.
