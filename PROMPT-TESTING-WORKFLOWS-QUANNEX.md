# Prompt para Testing de Workflows con Quannex

## 🎯 Instrucciones Completas

Copia y pega este prompt en múltiples chats de Claude para que ejecuten el mismo proceso de testing de workflows usando Quannex.

---

## 📋 TAREA: Testing Completo de Workflows con Quannex

### Contexto

Estás en el proyecto `/Users/felipe/Developer/startkit-main` que tiene un sistema de agentes (context, prompting, rules) y herramientas de Quannex para testing de rendimiento. Tu tarea es:

1. **Crear un workflow** desde cero
2. **Ejecutarlo paso a paso** usando los agentes directamente
3. **Identificar fallos** específicos
4. **Usar Quannex** para solucionarlos
5. **Documentar el proceso** completo

### Pasos Obligatorios

#### PASO 1: Crear Workflow

```bash
# Crea un archivo workflow-[tu-nombre].json con esta estructura:
{
  "name": "Workflow [Tu Nombre] - [Descripción]",
  "description": "Workflow para [propósito específico]",
  "steps": [
    {
      "step_id": "analizar_archivos",
      "agent": "context",
      "input": {
        "sources": ["archivo1.js", "archivo2.js"],
        "selectors": ["funciones", "errores"],
        "max_tokens": 1000
      }
    },
    {
      "step_id": "generar_solucion",
      "agent": "prompting",
      "depends_on": ["analizar_archivos"],
      "input": {
        "goal": "[Tu objetivo específico]",
        "context": "{{analizar_archivos.output.context_bundle}}",
        "style": "technical",
        "constraints": ["constraint1", "constraint2"]
      }
    },
    {
      "step_id": "validar_solucion",
      "agent": "rules",
      "depends_on": ["generar_solucion"],
      "input": {
        "policy_refs": ["archivo1.js", "archivo2.js"],
        "compliance_level": "strict",
        "code": "{{generar_solucion.output.system_prompt}}",
        "rules": ["rule1", "rule2"]
      }
    }
  ]
}
```

#### PASO 2: Ejecutar Workflow Manualmente

```bash
# Ejecuta cada agente paso a paso:

# Agente 1: Context
echo '{"sources": ["archivo1.js", "archivo2.js"], "selectors": ["funciones", "errores"], "max_tokens": 1000}' | node agents/context/agent.js

# Agente 2: Prompting (usa output del anterior)
echo '{"goal": "[tu objetivo]", "context": "[context_bundle del anterior]", "style": "technical", "constraints": ["constraint1"]}' | node agents/prompting/agent.js

# Agente 3: Rules (usa output del anterior - AQUÍ PUEDE FALLAR)
echo '{"policy_refs": ["archivo1.js"], "compliance_level": "strict", "code": "[system_prompt del anterior]", "rules": ["rule1"]}' | node agents/rules/agent.js
```

#### PASO 3: Identificar Fallos

Si algún agente falla, documenta:

- **Error exacto**: Mensaje de error completo
- **Agente que falla**: context/prompting/rules
- **Causa probable**: JSON malformado, input inválido, etc.
- **Ubicación**: Archivo y línea donde ocurre

#### PASO 4: Usar Quannex para Solucionar

```bash
# Usa Context Agent para analizar el problema
echo '{"sources": ["archivo-problematico.js"], "selectors": ["error", "json", "parsing"], "max_tokens": 1000}' | node agents/context/agent.js

# Usa Prompting Agent para generar solución
echo '{"goal": "Solucionar [problema específico]", "context": "[output del context anterior]", "style": "technical", "constraints": ["corregir error", "validar solución"]}' | node agents/prompting/agent.js

# Usa Rules Agent para validar solución
echo '{"policy_refs": ["archivo.js"], "compliance_level": "strict", "code": "[system_prompt de solución]", "rules": ["validar corrección"]}' | node agents/rules/agent.js
```

#### PASO 5: Crear Solución

Crea un archivo `utils/solucion-[tu-nombre].mjs` que:

- Implemente la corrección identificada
- Incluya tests para validar la solución
- Documente el problema y la solución

#### PASO 6: Probar Solución

```bash
# Ejecuta tu solución
node utils/solucion-[tu-nombre].mjs

# Vuelve a ejecutar el workflow original
# Debe pasar todos los agentes sin errores
```

#### PASO 7: Documentar Resultados

Crea un archivo `REPORTE-[tu-nombre]-workflow.md` con:

- **Workflow creado**: Contenido del JSON
- **Fallos encontrados**: Errores específicos
- **Análisis con Quannex**: Output de los agentes
- **Solución implementada**: Código de corrección
- **Resultados finales**: Estado del workflow después de corrección
- **Lecciones aprendidas**: Insights del proceso

### Criterios de Éxito

- ✅ Workflow creado y documentado
- ✅ Fallos identificados y documentados
- ✅ Quannex usado para análisis y solución
- ✅ Solución implementada y probada
- ✅ Workflow pasa todos los agentes sin errores
- ✅ Reporte completo generado

### Archivos a Crear

1. `workflow-[tu-nombre].json` - Workflow original
2. `utils/solucion-[tu-nombre].mjs` - Solución implementada
3. `REPORTE-[tu-nombre]-workflow.md` - Reporte completo

### Comandos de Referencia

```bash
# Ubicación del proyecto
cd /Users/felipe/Developer/startkit-main

# Verificar que los agentes funcionan
echo '{"sources": ["package.json"], "selectors": ["dependencies"], "max_tokens": 500}' | node agents/context/agent.js
echo '{"goal": "test", "context": "test", "style": "technical", "constraints": ["test"]}' | node agents/prompting/agent.js
echo '{"policy_refs": ["package.json"], "compliance_level": "strict", "code": "test", "rules": ["test"]}' | node agents/rules/agent.js

# Ver archivos de ejemplo
ls workflow-quannex-completo.json
ls utils/quannex-workflow-fix.mjs
ls SOLUCION-QUANNEX-WORKFLOW.md
```

### Tips Importantes

- **Sé específico**: Crea workflows únicos, no copies los existentes
- **Documenta todo**: Cada error, cada solución, cada insight
- **Usa Quannex**: Los agentes son herramientas poderosas para análisis
- **Prueba completamente**: Asegúrate que la solución realmente funciona
- **Sé creativo**: Crea workflows interesantes que prueben diferentes aspectos

---

## 🚀 ¡Comienza Ahora!

Ejecuta estos pasos en orden y documenta todo el proceso. El objetivo es encontrar problemas reales y solucionarlos usando las herramientas de Quannex.

**Tiempo estimado**: 15-30 minutos  
**Dificultad**: Intermedia  
**Resultado**: Workflow funcional + solución documentada
