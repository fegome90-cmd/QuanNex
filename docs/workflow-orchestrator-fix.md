# Solución: Problema del Workflow del Orquestador

## 🐛 **Problema Identificado**

El workflow del orquestador no estaba funcionando debido a **errores en el esquema de entrada** de los workflows.

## 🔍 **Diagnóstico Realizado**

### 1. **Verificación del Sistema**
- ✅ Orquestador ejecutable: `node orchestration/orchestrator.js --help`
- ✅ Agentes saludables: `node orchestration/orchestrator.js health`
- ✅ Todos los agentes (context, prompting, rules) funcionando

### 2. **Problemas Encontrados**

**Problema 1: Estructura de Workflow Incorrecta**
```json
❌ INCORRECTO:
{
  "tasks": [...]  // Campo incorrecto
}

✅ CORRECTO:
{
  "steps": [...]  // Campo correcto
}
```

**Problema 2: Campo step_id Faltante**
```json
❌ INCORRECTO:
{
  "id": "step-1"  // Campo incorrecto
}

✅ CORRECTO:
{
  "step_id": "step-1"  // Campo correcto
}
```

**Problema 3: Esquema de Entrada del Agente Context**
```json
❌ INCORRECTO:
{
  "input": {
    "query": "test query",  // Campo no válido
    "max_results": 5
  }
}

✅ CORRECTO:
{
  "input": {
    "sources": ["README.md", "package.json"],  // Campo requerido
    "max_tokens": 1000
  }
}
```

## ✅ **Solución Implementada**

### **Workflow Correcto**
```json
{
  "name": "test-workflow",
  "description": "Workflow de prueba para diagnosticar problemas",
  "steps": [
    {
      "step_id": "test-step-1",
      "agent": "context",
      "input": {
        "sources": ["README.md", "package.json"],
        "max_tokens": 1000
      }
    }
  ]
}
```

### **Resultado Exitoso**
```bash
# Crear workflow
node orchestration/orchestrator.js create workflow.json

# Ejecutar workflow
node orchestration/orchestrator.js execute wf_1759440327043_4a1ff3

# Resultado: ✅ COMPLETED
```

## 📋 **Esquemas Correctos por Agente**

### **Context Agent**
```json
{
  "step_id": "context-step",
  "agent": "context",
  "input": {
    "sources": ["file1.md", "file2.json"],  // REQUERIDO: array de strings
    "max_tokens": 1000,                     // OPCIONAL: número
    "selectors": ["keyword1", "keyword2"]  // OPCIONAL: array de strings
  }
}
```

### **Prompting Agent**
```json
{
  "step_id": "prompting-step",
  "agent": "prompting",
  "input": {
    "task": "descripción de la tarea",     // REQUERIDO: string
    "context": "contexto relevante",       // OPCIONAL: string
    "constraints": ["restricción1"]        // OPCIONAL: array de strings
  }
}
```

### **Rules Agent**
```json
{
  "step_id": "rules-step",
  "agent": "rules",
  "input": {
    "action": "validate",                  // REQUERIDO: string
    "target": "archivo_o_comando",         // REQUERIDO: string
    "context": "contexto adicional"        // OPCIONAL: string
  }
}
```

## 🚀 **Comandos de Verificación**

```bash
# Verificar salud de agentes
node orchestration/orchestrator.js health

# Crear workflow
node orchestration/orchestrator.js create workflow.json

# Ejecutar workflow
node orchestration/orchestrator.js execute <workflow_id>

# Ver estado
node orchestration/orchestrator.js status <workflow_id>

# Limpiar workflow
node orchestration/orchestrator.js cleanup <workflow_id>
```

## 📚 **Referencias**

- **Schemas de Agentes**: `schemas/agents/`
- **Orquestador**: `orchestration/orchestrator.js`
- **Documentación**: `orchestration/README.md`

## ✅ **Estado Final**

- ✅ **Problema identificado y solucionado**
- ✅ **Workflow funcionando correctamente**
- ✅ **Esquemas documentados**
- ✅ **Comandos de verificación disponibles**

**El workflow del orquestador está ahora funcionando correctamente.**
