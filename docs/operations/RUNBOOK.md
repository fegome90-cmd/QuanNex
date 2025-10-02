# RUNBOOK (Gate 1)

## Arranque
- `npm run mcp:init` → valida health de agentes
- `npm run mcp:smoke` → pruebas rápidas (router/FSM/policy/contracts)

## Diagnóstico rápido
- Logs: `logs/*.json` (buscar `error` o `policy_ok:false`)
- KPIs: `npm run mcp:kpis` (latencia p95, errores)

## Remediación
- Reinicio resiliencia: `npm run mcp:resilience`
- Rollback: `npm run mcp:rollback` (v0-baseline)
- Circuit-breaker rules: editar `config/rules-protection.json`

## CI/CD
- Gate 1: `npm run ci:gate1` (lint + typecheck + contracts + init + smoke)
- Falla típica:
  - `INVALID_SCHEMA_MIN` → faltan campos en request
  - `handshake missing` → agente no responde `{type:"hello",...}`

## Cursor
- Instalar deps MCP: `npm i -E @modelcontextprotocol/sdk`
- Verificar servidor: `node orchestration/mcp/server.js --health`
- Archivo `.cursor/mcp.json` apunta a servidores locales del repo.

## Troubleshooting

### Agentes no responden
1. Verificar health: `npm run mcp:init`
2. Revisar logs: `tail -f logs/*.json`
3. Reiniciar: `npm run mcp:resilience`

### Contratos fallan
1. Verificar handshake: `echo '{"type":"hello","agent":"context"}' | node agents/context/agent-v2.js`
2. Verificar schema: `echo '{"requestId":"test","agent":"context","capability":"context.resolve","payload":{},"ts":"2025-01-01T00:00:00Z"}' | node agents/context/agent-v2.js`

### CI/CD falla
1. Lint: `npm run lint`
2. Contratos: `npm run mcp:contracts`
3. Init: `npm run mcp:init`

## Policy Context (v2)
- Usar `ctx.meta.*` para acceder a metadata de decisión (alias legacy: `ctx.metadata`).
- El plan del planner se expone en `ctx.plan` como snapshot inmutable (Object.freeze).
- Precedencia por defecto: `task.metadata` sobre `plan.metadata`.
- Ajustar precedencia mediante `TASK_META_OVER_PLAN=0` cuando se requiera plan > task.
- Activar debug puntual con `DEBUG_POLICY_CONTEXT=1` para ver precedence, claves de meta y hash del plan.
- Mantener la whitelist de metadata en `orchestration/build-policy-context.js`.
