# 🎭 Sistema de Orquestación de Agentes

**Estado:** ✅ IMPLEMENTADO  
**Versión:** 1.0.0  
**Compatibilidad:** Agentes existentes sin modificación

## 📋 Resumen

Sistema de orquestación que coordina los agentes existentes (`@context`, `@prompting`, `@rules`) sin modificar su código, proporcionando workflows complejos y comunicación MCP.

## 🏗️ Arquitectura

### **Componentes Principales**

1. **Orchestrator** (`orchestrator.js`)
   - Coordina ejecución de workflows
   - Gestiona dependencias entre pasos
   - Maneja reintentos y timeouts
   - **No modifica agentes existentes**

2. **Schemas** (`schemas/`)
   - `workflow.schema.json` - Definición de workflows
   - `agent-communication.schema.json` - Comunicación entre agentes

3. **Workflows** (`workflows/`)
   - `prompt-generation.json` - Generación completa de prompts
   - `context-analysis.json` - Análisis de contexto con validación

4. **MCP Server** (`mcp/server.js`)
   - Servidor MCP para integración con Cursor
   - Herramientas para gestión de workflows
   - Llamadas directas a agentes

## 🚀 Uso

### **1. Ejecución Directa**

```bash
# Crear workflow
node orchestration/orchestrator.js create '{"name":"Test","steps":[...]}'

# Ejecutar workflow
node orchestration/orchestrator.js execute <workflow_id>

# Ver estado
node orchestration/orchestrator.js status <workflow_id>

# Health check
node orchestration/orchestrator.js health
```

### **2. Programático**

```javascript
import WorkflowOrchestrator from './orchestration/orchestrator.js';

const orchestrator = new WorkflowOrchestrator();

// Crear workflow
const workflow = await orchestrator.createWorkflow({
  name: "Mi Workflow",
  steps: [
    {
      step_id: "step1",
      agent: "context",
      action: "extract",
      input: { sources: ["..."], selectors: ["..."] }
    }
  ]
});

// Ejecutar
const result = await orchestrator.executeWorkflow(workflow.workflow_id);
```

### **3. MCP Integration**

```json
{
  "mcpServers": {
    "orchestration": {
      "command": "node",
      "args": ["orchestration/mcp/server.js"]
    }
  }
}
```

## 🛠️ Herramientas MCP Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `create_workflow` | Crear nuevo workflow |
| `execute_workflow` | Ejecutar workflow por ID |
| `get_workflow_status` | Obtener estado de workflow |
| `list_workflows` | Listar todos los workflows |
| `load_workflow_template` | Cargar template predefinido |
| `agent_health_check` | Verificar salud de agentes |
| `call_agent_direct` | Llamar agente directamente |

## 📊 Workflows Predefinidos

### **Prompt Generation**
- Extrae contexto de fuentes
- Genera prompt con contexto
- Valida con reglas de compliance

### **Context Analysis**
- Extrae contexto primario y secundario
- Valida con reglas de documentación
- Genera resumen técnico

## 🔧 Configuración

### **Variables de Entorno**
```bash
NODE_ENV=production  # Modo de producción
```

### **Timeouts por Defecto**
- Context Agent: 30s
- Prompting Agent: 60s
- Rules Agent: 30s

### **Reintentos**
- Máximo: 3 reintentos por paso
- Backoff: Exponencial

## 🧪 Testing

```bash
# Ejecutar tests de orquestación
node orchestration/test-orchestration.js

# Tests incluyen:
# - Health check de agentes
# - Workflow de generación de prompts
# - Llamadas directas a agentes
# - Listado de workflows
```

## 📈 Métricas y Monitoreo

### **Estados de Workflow**
- `pending` - Esperando ejecución
- `running` - En ejecución
- `completed` - Completado exitosamente
- `failed` - Falló
- `cancelled` - Cancelado

### **Estados de Paso**
- `pending` - Esperando dependencias
- `running` - Ejecutándose
- `completed` - Completado
- `failed` - Falló
- `skipped` - Omitido

## 🔒 Seguridad

- **Aislamiento:** Cada agente ejecuta en proceso separado
- **Timeouts:** Previene procesos colgados
- **Validación:** Schemas JSON para todos los inputs
- **Logging:** Trazabilidad completa de ejecución

## 🚨 Troubleshooting

### **Agente No Responde**
```bash
# Verificar salud
node orchestration/orchestrator.js health

# Verificar que el agente existe
ls agents/<agent_name>/agent.js
```

### **Workflow Fallido**
```bash
# Ver estado detallado
node orchestration/orchestrator.js status <workflow_id>

# Revisar logs de error en el workflow
```

### **Dependencias Circulares**
- Verificar `depends_on` en pasos
- Asegurar que no hay ciclos

## 📚 Ejemplos

### **Workflow Simple**
```json
{
  "name": "Simple Context Extract",
  "steps": [
    {
      "step_id": "extract",
      "agent": "context",
      "action": "extract",
      "input": {
        "sources": ["document.txt"],
        "selectors": ["main"],
        "max_tokens": 1000
      }
    }
  ]
}
```

### **Workflow Complejo**
```json
{
  "name": "Full Document Processing",
  "steps": [
    {
      "step_id": "extract_context",
      "agent": "context",
      "action": "extract",
      "input": { "sources": ["doc1.txt", "doc2.txt"] }
    },
    {
      "step_id": "generate_prompt",
      "agent": "prompting",
      "action": "generate",
      "input": { "goal": "Summarize document" },
      "depends_on": ["extract_context"]
    },
    {
      "step_id": "validate_rules",
      "agent": "rules",
      "action": "validate",
      "input": { "policy_refs": ["README.md"] },
      "depends_on": ["generate_prompt"]
    }
  ]
}
```

## ✅ Estado de Implementación

- [x] Orchestrator core
- [x] Schemas de comunicación
- [x] Workflows predefinidos
- [x] MCP server
- [x] Tests de integración
- [x] Documentación completa

**El sistema está listo para producción y no modifica los agentes existentes.**
