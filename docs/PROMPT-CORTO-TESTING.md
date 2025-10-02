# Prompt Corto para Testing de Workflows

## 🎯 TAREA: Crear y Probar Workflow con Quannex

### Instrucciones

1. **Crea** un workflow único en `workflow-[tu-nombre].json`
2. **Ejecuta** cada agente paso a paso manualmente
3. **Identifica** fallos específicos
4. **Usa Quannex** (context + prompting + rules agents) para solucionar
5. **Documenta** todo en `REPORTE-[tu-nombre].md`

### Comandos Base

```bash
# Context Agent
echo '{"sources": ["archivo.js"], "selectors": ["funciones"], "max_tokens": 1000}' | node agents/context/agent.js

# Prompting Agent
echo '{"goal": "tu objetivo", "context": "context_bundle del anterior", "style": "technical", "constraints": ["constraint1"]}' | node agents/prompting/agent.js

# Rules Agent (puede fallar por JSON malformado)
echo '{"policy_refs": ["archivo.js"], "compliance_level": "strict", "code": "system_prompt del anterior", "rules": ["rule1"]}' | node agents/rules/agent.js
```

### Si Rules Agent Falla

```bash
# Usa Quannex para analizar
echo '{"sources": ["agents/rules/agent.js"], "selectors": ["error", "json"], "max_tokens": 1000}' | node agents/context/agent.js

# Genera solución
echo '{"goal": "Corregir JSON malformado", "context": "output anterior", "style": "technical", "constraints": ["escapar caracteres", "validar JSON"]}' | node agents/prompting/agent.js
```

### Crear Solución

- Archivo: `utils/solucion-[tu-nombre].mjs`
- Implementa corrección específica
- Incluye tests de validación

### Resultado Esperado

- ✅ Workflow pasa todos los agentes sin errores
- ✅ Solución documentada y probada
- ✅ Reporte completo generado

**Tiempo**: 15-30 min | **Dificultad**: Intermedia
