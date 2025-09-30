# @rules Agent

## Purpose
Compiles referenced policy documents into actionable guardrails, flags missing artifacts, and emits advisory guidance with deterministic MCP contracts.

## Inputs
`schemas/agents/rules.input.schema.json` (v1.0.0)

```json
{
  "policy_refs": ["string"],
  "tone": "neutral|formal|friendly|assertive",
  "domain": "string",
  "compliance_level": "none|basic|strict"
}
```

## Outputs
`schemas/agents/rules.output.schema.json` (v1.0.0)

- `schema_version` / `agent_version`
- `rules_compiled[]`, `violations[]`, `advice[]`
- `trace[]`

## Commands
```bash
cat payload.json | node agents/rules/agent.js | jq .

scripts/run-clean.sh rules payload.json
```

## Failure Modes
- Invalid tones/compliance levels or traversal attempts -> validation error.
- Missing/empty policy files -> listed under `violations` (stage will fail while data remains).
- Policies >2MB or directories -> hard failure with `rules.server:error` message.
