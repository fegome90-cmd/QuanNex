# @context Agent

## Purpose

Aggregates contextual excerpts from repository sources, filters via selectors, and returns provenance-aware bundles with built-in truncation safeguards.

## Inputs

`schemas/agents/context.input.schema.json` (v1.0.0)

```json
{
  "sources": ["string"],
  "selectors": ["string"],
  "max_tokens": 512
}
```

- Max 50 sources/selectors.
- `max_tokens < 256` is auto-adjusted to 256 and recorded.

## Outputs

`schemas/agents/context.output.schema.json` (v1.0.0)

- `schema_version` / `agent_version`
- `context_bundle`
- `provenance[]`
- `stats`: `tokens_estimated`, `chunks`, `matched`, `truncated`, `adjusted`
- Optional `trace[]` (includes adjustments)

## Commands

```bash
cat payload.json | node agents/context/agent.js | jq .

core/scripts/run-clean.sh context payload.json
```

## Failure Modes

- Traversal (`..`) or absolute paths -> rejected.
- Source lists >50 or files >2MB -> hard failure.
- Selector misses -> empty bundle with `stats.matched = 0`.
