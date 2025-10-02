# Agent TaskDB Integration - Integración MCP con TaskDB

**PR-L: Integración agentes ↔ TaskDB (TaskKernel)**

## 📋 Descripción

Agent TaskDB Integration proporciona integración completa entre los agentes MCP core (@rules, @context, @prompting) y la base de datos de tareas (TaskDB), respetando la arquitectura MCP establecida y los contratos de validación existentes.

## 🏗️ Arquitectura MCP

### **Marco Base MCP**

```
MCP Framework
├── Drivers Deterministas (server.js)
│   ├── Acepta JSON
│   ├── Produce JSON
│   └── Validado contra schema
├── Agentes Delgados (agent.js)
│   ├── Valida entrada
│   ├── Llama al driver
│   └── Valida salida
├── Orquestador (orchestrator.js)
│   ├── Ejecuta por etapas
│   ├── Health checks
│   └── Gates de validación
└── Sandbox Execution (run-clean.sh)
    ├── Aislamiento
    ├── Limpieza automática
    └── Artefactos out/*.json
```

### **Integración TaskDB**

```
Agent TaskDB Integration
├── TaskDB Kernel
│   ├── Gestión de proyectos
│   ├── Gestión de tareas
│   └── Métricas de rendimiento
├── Contratos MCP
│   ├── Validación de input
│   ├── Validación de output
│   └── Schemas JSON
├── Integración por Agente
│   ├── @rules → TaskDB
│   ├── @context → TaskDB
│   └── @prompting → TaskDB
└── Orquestador Extendido
    ├── Creación automática de tareas
    ├── Tracking de rendimiento
    └── Gates con TaskDB
```

## 🚀 Características

### ✅ Funcionalidades Principales

- **Integración MCP-compliant** con agentes core existentes
- **Contratos de I/O validados** para cada agente
- **Gestión automática de tareas** en TaskDB
- **Tracking de rendimiento** y métricas detalladas
- **Integración con orquestador** sin cambios disruptivos
- **Sandbox execution** respetado
- **Health checks** extendidos con TaskDB
- **Gates de validación** mejorados

### 🏗️ Componentes

#### **1. Agent TaskDB Integration** (`tools/agent-taskdb-integration.mjs`)
- Integración principal con agentes MCP
- Gestión automática de proyectos por agente
- Creación y actualización de tareas
- Validación de contratos de entrada/salida
- Tracking de rendimiento y métricas
- Limpieza automática de tareas completadas

#### **2. Agent TaskDB Contracts** (`tools/agent-taskdb-contracts.mjs`)
- Contratos de I/O para cada agente core
- Validación de schemas JSON estricta
- Generación de ejemplos de input/output
- Documentación automática de contratos
- Validación en tiempo real durante ejecución

#### **3. Tests Automatizados** (`tests/agent-taskdb-integration.test.js`)
- Tests de integración con agentes MCP
- Tests de validación de contratos
- Tests de gestión de tareas
- Tests de estadísticas y métricas
- Tests de manejo de errores

## 📦 Instalación

### Requisitos

- Node.js 18+
- npm o yarn
- TaskDB Kernel (PR-J)
- Agentes MCP core (@rules, @context, @prompting)

### Instalación Local

```bash
# Clonar el repositorio
git clone <repo-url>
cd startkit-main

# Instalar dependencias
npm install

# Inicializar TaskDB
npm run taskdb:init

# Inicializar integración
npm run integration:init

# Verificar instalación
npm run integration:test
```

## 🛠️ Uso

### CLI Interface

```bash
# Inicializar integración
npm run integration:init

# Ver estadísticas
npm run integration:stats

# Probar integración
npm run integration:test

# Limpiar tareas completadas
npm run integration:cleanup

# Exportar datos
npm run integration:export

# Listar agentes con contratos
npm run contracts:list

# Validar contrato
npm run contracts:validate context '{"action":"process","data":{"text":"test"}}' input

# Generar ejemplo
npm run contracts:example context input

# Exportar contratos
npm run contracts:export
```

### API Programática

```javascript
import AgentTaskDBIntegration from './tools/agent-taskdb-integration.mjs';
import AgentTaskDBContracts from './tools/agent-taskdb-contracts.mjs';

// Inicializar integración
const integration = new AgentTaskDBIntegration();

// Procesar input de agente con integración TaskDB
const result = await integration.processAgentInput('context', {
  action: 'process',
  data: {
    text: 'Texto de prueba',
    maxTokens: 100
  }
});

// Obtener estadísticas
const stats = integration.getIntegrationStats();

// Validar contratos
const contracts = new AgentTaskDBContracts();
contracts.validateInput('context', input);
contracts.validateOutput('context', output);
```

## 📊 Contratos MCP

### **Contrato @rules**

```json
{
  "input": {
    "required": ["action", "data"],
    "optional": ["task_id", "project_id", "metadata"],
    "schema": {
      "action": { "type": "string", "enum": ["apply", "validate", "generate"] },
      "data": {
        "type": "object",
        "required": ["rules", "input"],
        "properties": {
          "rules": { "type": "array", "items": { "type": "string" } },
          "input": { "type": "string", "minLength": 1 },
          "context": { "type": "string" },
          "strict_mode": { "type": "boolean" }
        }
      }
    }
  },
  "output": {
    "required": ["success", "timestamp", "result"],
    "optional": ["task_id", "metadata", "performance"],
    "schema": {
      "success": { "type": "boolean" },
      "timestamp": { "type": "string", "format": "date-time" },
      "result": {
        "type": "object",
        "required": ["processed_input", "applied_rules"],
        "properties": {
          "processed_input": { "type": "string" },
          "applied_rules": { "type": "array" },
          "violations": { "type": "array" },
          "suggestions": { "type": "array" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    }
  }
}
```

### **Contrato @context**

```json
{
  "input": {
    "required": ["action", "data"],
    "optional": ["task_id", "project_id", "metadata"],
    "schema": {
      "action": { "type": "string", "enum": ["process", "analyze", "extract"] },
      "data": {
        "type": "object",
        "required": ["text"],
        "properties": {
          "text": { "type": "string", "minLength": 1 },
          "maxTokens": { "type": "number", "minimum": 1, "maximum": 4000 },
          "context": { "type": "string" },
          "options": { "type": "object" }
        }
      }
    }
  },
  "output": {
    "required": ["success", "timestamp", "result"],
    "optional": ["task_id", "metadata", "performance"],
    "schema": {
      "success": { "type": "boolean" },
      "timestamp": { "type": "string", "format": "date-time" },
      "result": {
        "type": "object",
        "required": ["processed_text", "tokens_used"],
        "properties": {
          "processed_text": { "type": "string" },
          "tokens_used": { "type": "number", "minimum": 0 },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "entities": { "type": "array" },
          "sentiment": { "type": "string", "enum": ["positive", "negative", "neutral"] }
        }
      }
    }
  }
}
```

### **Contrato @prompting**

```json
{
  "input": {
    "required": ["action", "data"],
    "optional": ["task_id", "project_id", "metadata"],
    "schema": {
      "action": { "type": "string", "enum": ["generate", "optimize", "validate"] },
      "data": {
        "type": "object",
        "required": ["prompt", "context"],
        "properties": {
          "prompt": { "type": "string", "minLength": 1 },
          "context": { "type": "string" },
          "style": { "type": "string", "enum": ["formal", "casual", "technical"] },
          "length": { "type": "string", "enum": ["short", "medium", "long"] }
        }
      }
    }
  },
  "output": {
    "required": ["success", "timestamp", "result"],
    "optional": ["task_id", "metadata", "performance"],
    "schema": {
      "success": { "type": "boolean" },
      "timestamp": { "type": "string", "format": "date-time" },
      "result": {
        "type": "object",
        "required": ["generated_prompt", "quality_score"],
        "properties": {
          "generated_prompt": { "type": "string" },
          "quality_score": { "type": "number", "minimum": 0, "maximum": 1 },
          "suggestions": { "type": "array" },
          "alternatives": { "type": "array" }
        }
      }
    }
  }
}
```

## 🔄 Flujo de Integración

### **1. Orquestación con TaskDB**

```yaml
# orchestration/PLAN.yaml
steps:
  - agent: rules
    gates:
      - pass_if: { exists: "rules_compiled" }
    taskdb:
      - create_task: true
      - track_performance: true
  
  - agent: context
    gates:
      - pass_if: { exists: "stats.ok" }
    taskdb:
      - create_task: true
      - track_performance: true
  
  - agent: prompting
    gates:
      - pass_if: { exists: "prompt.system" }
    taskdb:
      - create_task: true
      - track_performance: true
```

### **2. Ejecución con Sandbox**

```bash
# Cada agente se ejecuta en sandbox con TaskDB
./core/scripts/run-clean.sh rules --stdin-json --out "out/rules.json"
./core/scripts/run-clean.sh context --stdin-json --out "out/context.json"
./core/scripts/run-clean.sh prompting --stdin-json --out "out/prompting.json"
```

### **3. Integración Automática**

```javascript
// Para cada agente, se crea automáticamente:
const task = await integration.createAgentTask('rules', input);
const result = await integration.executeAgent('rules', input);
await integration.updateAgentTask(task.id, {
  status: result.success ? 'done' : 'review',
  data: { result: result }
});
```

## 📈 Métricas y Estadísticas

### **Estadísticas de Integración**

```javascript
{
  total_projects: 3,           // Proyectos por agente
  total_tasks: 15,            // Tareas totales
  tasks_by_agent: {
    rules: 5,                 // Tareas de @rules
    context: 6,               // Tareas de @context
    prompting: 4              // Tareas de @prompting
  },
  tasks_by_status: {
    todo: 2,                  // Tareas pendientes
    doing: 3,                 // Tareas en progreso
    review: 1,                // Tareas en revisión
    done: 9                   // Tareas completadas
  },
  performance_metrics: {
    avg_duration: 150,        // Duración promedio (ms)
    min_duration: 50,         // Duración mínima
    max_duration: 500         // Duración máxima
  }
}
```

### **Tracking de Rendimiento**

- **Duración por agente**: Tiempo de ejecución promedio
- **Tasa de éxito**: Porcentaje de ejecuciones exitosas
- **Uso de recursos**: CPU y memoria por agente
- **Calidad de output**: Validación contra schemas

## 🧪 Testing

### **Tests Disponibles**

- ✅ **Integración MCP**: Tests con agentes core
- ✅ **Validación de Contratos**: Tests de input/output
- ✅ **Gestión de Tareas**: Tests de CRUD
- ✅ **Estadísticas**: Tests de métricas
- ✅ **Limpieza**: Tests de cleanup
- ✅ **Exportación**: Tests de export
- ✅ **Manejo de Errores**: Tests de error handling

### **Ejecutar Tests**

```bash
# Ejecutar todos los tests
npm run integration:test

# Ejecutar tests específicos
node --test tests/agent-taskdb-integration.test.js
```

## 🔧 Configuración

### **Configuración por Defecto**

```javascript
const config = {
  taskdb: {
    dataDir: './data',
    dbFile: 'taskdb.json'
  },
  agents: {
    context: {
      project: 'Agent Context Project',
      feature: 'Context Processing'
    },
    prompting: {
      project: 'Agent Prompting Project',
      feature: 'Prompt Generation'
    },
    rules: {
      project: 'Agent Rules Project',
      feature: 'Rules Processing'
    }
  },
  contracts: {
    input: {
      required: ['action', 'data'],
      optional: ['task_id', 'project_id', 'metadata']
    },
    output: {
      required: ['success', 'timestamp'],
      optional: ['result', 'task_id', 'metadata', 'performance']
    }
  }
};
```

### **Variables de Entorno**

```bash
# Directorio de TaskDB
export TASKDB_DATA_DIR="./data"

# Archivo de TaskDB
export TASKDB_FILE="taskdb.json"

# Modo de integración
export INTEGRATION_MODE="mcp"
```

## 🔒 Seguridad y Robustez

### **Validación Estricta**

- **Contratos MCP**: Validación de entrada y salida
- **Schemas JSON**: Validación de tipos y estructura
- **Sandbox execution**: Aislamiento de procesos
- **Error handling**: Manejo robusto de errores
- **Cleanup automático**: Limpieza de recursos

### **Manejo de Errores**

```javascript
try {
  const result = await integration.processAgentInput('context', input);
  return result;
} catch (error) {
  // Crear tarea de error
  await integration.createAgentTask('context', input);
  await integration.updateAgentTask(task.id, {
    status: 'review',
    data: { error: error.message }
  });
  throw error;
}
```

## 🐛 Troubleshooting

### **Problemas Comunes**

#### Error: "Proyecto no encontrado para agente"
```bash
# Solución: Inicializar integración
npm run integration:init
```

#### Error: "Contrato no encontrado para agente"
```bash
# Solución: Verificar agentes disponibles
npm run contracts:list
```

#### Error: "Input inválido para agente"
```bash
# Solución: Validar input contra contrato
npm run contracts:validate context '{"action":"process","data":{"text":"test"}}' input
```

### **Logs y Debugging**

```bash
# Habilitar logs detallados
DEBUG=integration:* npm run integration:test

# Verificar estadísticas
npm run integration:stats

# Exportar datos para análisis
npm run integration:export
```

## 📚 Referencias

### **Documentación Relacionada**

- [PR-L: Integración Agentes ↔ TaskDB](./PR-L-COMPLETADO.md)
- [TaskDB Kernel](../docs/taskdb-kernel.md)
- [Bench Agents](../docs/bench-agents.md)

### **Enlaces Externos**

- [MCP Protocol](https://modelcontextprotocol.io/)
- [JSON Schema](https://json-schema.org/)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)

## 🤝 Contribución

### **Cómo Contribuir**

1. Fork el repositorio
2. Crear una rama para tu feature
3. Implementar cambios respetando MCP
4. Ejecutar tests
5. Crear Pull Request

### **Estándares MCP**

- Respetar contratos de I/O
- Validar input/output estrictamente
- Usar sandbox execution
- Implementar health checks
- Seguir gates de validación

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](../LICENSE) para más detalles.

---

**Agent TaskDB Integration v1.0.0** - Integración MCP con TaskDB 🚀
