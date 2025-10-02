# Prompt Ultra Corto - Testing Workflows

## 🎯 TAREA

1. Crea `workflow-[tu-nombre].json`
2. Ejecuta agentes paso a paso
3. Si falla Rules Agent, usa Quannex para solucionar
4. Documenta en `REPORTE-[tu-nombre].md`

## Comandos

```bash
# Context → Prompting → Rules
echo '{"sources":["archivo.js"],"selectors":["funciones"],"max_tokens":1000}' | node agents/context/agent.js
echo '{"goal":"objetivo","context":"[output anterior]","style":"technical","constraints":["constraint1"]}' | node agents/prompting/agent.js
echo '{"policy_refs":["archivo.js"],"compliance_level":"strict","code":"[output anterior]","rules":["rule1"]}' | node agents/rules/agent.js
```

## Si Falla

Usa Quannex para analizar y crear `utils/solucion-[tu-nombre].mjs`

**Objetivo**: Workflow funcional + solución documentada
