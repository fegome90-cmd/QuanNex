# 🤖 Contexto de Agentes QuanNex y Problemas Identificados

**Fecha**: 2025-10-04  
**Analista**: Claude + QuanNex  
**Objetivo**: Análisis detallado del contexto y problemas de los agentes MCP

## 🎯 Contexto General de los Agentes

### **Arquitectura de Agentes MCP:**
El proyecto implementa un sistema de agentes MCP (Model Context Protocol) con tres agentes principales:

1. **@context**: `agents/context/` - Resolución de contexto y fuentes
2. **@prompting**: `agents/prompting/` - Construcción de prompts
3. **@rules**: `agents/rules/` - Validación de políticas y reglas
4. **@orchestration**: `orchestration/orchestrator.js` - Orquestación de workflows

### **Estructura de Agentes:**
Cada agente sigue el patrón:
- **agent.js**: Wrapper con validación de entrada/salida
- **server.js**: Driver MCP que ejecuta la lógica principal
- **tests/**: Pruebas de contrato específicas
- **schemas/**: Esquemas de validación JSON

## 🔍 Análisis Detallado de Problemas por Agente

### **1. Context Agent - ❌ FALLO TOTAL**

#### **Ubicación**: `agents/context/agent.js`
#### **Propósito**: Resolver contexto y fuentes para análisis

#### **Validación de Entrada (Líneas 32-63):**
```javascript
const validateInput = data => {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return ['Input must be an object'];
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    errors.push('sources must be a non-empty array of strings');
  }
  // ... más validaciones
};
```

#### **Problema Identificado:**
- **Error**: `sources must be a non-empty array of strings`
- **Causa**: El agente requiere un array no vacío de strings para `sources`
- **Validación**: Muy estricta - no permite arrays vacíos
- **Límite**: Máximo 50 elementos (`MAX_LIST_ITEMS = 50`)

#### **Validaciones Adicionales:**
- ✅ Sanitización de caracteres peligrosos (`<`, `>`, `"`, `'`, `&`)
- ✅ Prevención de directory traversal (`..`)
- ✅ Validación de strings no vacíos
- ✅ Rate limiting implementado

#### **Estado del Servidor:**
- **Servidor**: `agents/context/server-docker.js`
- **Problema**: El servidor se ejecuta pero falla en validación de entrada

### **2. Prompting Agent - ❌ FALLO TOTAL**

#### **Ubicación**: `agents/prompting/agent.js`
#### **Propósito**: Construir prompts del sistema y usuario

#### **Validación de Entrada (Líneas 9-18):**
```javascript
const validateInput = data => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Input must be an object'];
  }
  if (typeof data.goal !== 'string' || data.goal.trim() === '') {
    errors.push('goal must be a non-empty string');
  }
  return errors;
};
```

#### **Problema Identificado:**
- **Error**: `goal must be a non-empty string`
- **Causa**: El agente requiere un string no vacío para `goal`
- **Validación**: Estricta - no permite strings vacíos o solo espacios
- **Campos opcionales**: `context`, `constraints`, `style`

#### **Estado del Servidor:**
- **Servidor**: `agents/prompting/server.js`
- **Problema**: El servidor se ejecuta pero falla en validación de entrada

### **3. Rules Agent - ❌ FALLO TOTAL**

#### **Ubicación**: `agents/rules/agent.js`
#### **Propósito**: Validar políticas y reglas de cumplimiento

#### **Validación de Entrada (Líneas 9-18):**
```javascript
const validateInput = data => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Input must be an object'];
  }
  if (!Array.isArray(data.policy_refs)) {
    errors.push('policy_refs must be an array');
  }
  return errors;
};
```

#### **Problema Identificado:**
- **Error**: `policy_refs must be an array`
- **Causa**: El agente requiere un array para `policy_refs`
- **Validación**: Estricta - no permite `undefined` o `null`
- **Campos opcionales**: `tone`, `domain`, `compliance_level`

#### **Características Especiales:**
- ✅ **JSON Parsing Robusto**: Maneja caracteres de control
- ✅ **Escape de Caracteres**: Función `escapeControlCharacters()`
- ✅ **Parsing Seguro**: Función `safeJsonParse()`

#### **Estado del Servidor:**
- **Servidor**: `agents/rules/server.js`
- **Problema**: El servidor se ejecuta pero falla en validación de entrada

### **4. Orchestration Agent - ✅ FUNCIONANDO**

#### **Ubicación**: `orchestration/orchestrator.js`
#### **Propósito**: Orquestar workflows y tareas

#### **Características:**
- ✅ **Handshake Test**: Pasa correctamente
- ✅ **Validación**: Funciona sin problemas
- ✅ **Telemetría**: Integrada con QuanNex
- ✅ **Rate Limiting**: Implementado

#### **Estado del Servidor:**
- **Servidor**: Integrado en el mismo archivo
- **Problema**: Ninguno - funciona correctamente

## 🔍 Análisis de Causa Raíz

### **Problema Principal: Validación de Entrada Demasiado Estricta**

#### **1. Context Agent:**
- **Problema**: Requiere `sources` como array no vacío
- **Test Case**: Envía `{ sources: ['README.md'], selectors: ['test'] }`
- **Error**: El agente no recibe el input en el formato esperado

#### **2. Prompting Agent:**
- **Problema**: Requiere `goal` como string no vacío
- **Test Case**: Envía `{ goal: 'test prompt', style: 'formal' }`
- **Error**: El agente no recibe el input en el formato esperado

#### **3. Rules Agent:**
- **Problema**: Requiere `policy_refs` como array
- **Test Case**: Envía `{ policy_refs: ['docs/CHARTER.md'], compliance_level: 'basic' }`
- **Error**: El agente no recibe el input en el formato esperado

### **Problema Secundario: Formato de Input/Output**

#### **Formato Esperado por Tests:**
```javascript
// Test envía:
{
  requestId: 'test-123',
  agent: 'context',
  capability: 'context.resolve',
  payload: { sources: ['README.md'], selectors: ['test'] },
  ts: '2025-01-01T00:00:00Z'
}
```

#### **Formato Esperado por Agentes:**
```javascript
// Agente espera directamente:
{
  sources: ['README.md'],
  selectors: ['test']
}
```

### **Problema de Comunicación:**
- **Tests**: Envían payload envuelto en estructura de request
- **Agentes**: Esperan payload directo
- **Resultado**: Mismatch en formato de datos

## 🛠️ Soluciones Identificadas

### **Solución 1: Modificar Tests (Recomendada)**
```javascript
// En lugar de enviar:
{
  requestId: 'test-123',
  agent: 'context',
  capability: 'context.resolve',
  payload: { sources: ['README.md'], selectors: ['test'] },
  ts: '2025-01-01T00:00:00Z'
}

// Enviar directamente:
{
  sources: ['README.md'],
  selectors: ['test']
}
```

### **Solución 2: Modificar Agentes**
```javascript
// En agent.js, extraer payload:
const payload = data.payload || data;
const inputErrors = validateInput(payload);
```

### **Solución 3: Implementar Handshake**
```javascript
// Agregar manejo de handshake en agentes:
if (data.type === 'hello') {
  console.log(JSON.stringify({
    type: 'hello',
    agent: 'context',
    version: '1.0.0'
  }));
  process.exit(0);
}
```

## 📊 Impacto en el Análisis de Ramas

### **Impacto Mínimo:**
- ✅ **Análisis de Ramas**: No afectado (usamos QuanNex core tools)
- ✅ **Validación de Hallazgos**: Confirmada por múltiples fuentes
- ✅ **Estrategia de Merge**: Validada independientemente

### **Impacto en Funcionalidad Avanzada:**
- ❌ **Automatización**: Limitada por fallos de agentes
- ❌ **Workflows Complejos**: No disponibles
- ❌ **Integración Avanzada**: Limitada

### **Estado Actual:**
- ✅ **QuanNex Core**: Funcionando correctamente
- ✅ **Análisis de Ramas**: Completado y validado
- ❌ **Agentes Avanzados**: 3 de 4 fallando
- ✅ **Orquestador**: Funcionando (con problemas menores)

## 🎯 Recomendaciones

### **Inmediatas:**
1. **Implementar Solución 1**: Modificar tests para enviar payload directo
2. **Agregar Handshake**: Implementar manejo de `type: 'hello'`
3. **Validar Servidores**: Verificar que los servidores funcionen correctamente

### **A Mediano Plazo:**
1. **Estandarizar Formato**: Definir formato único de comunicación
2. **Mejorar Documentación**: Documentar APIs de agentes
3. **Implementar Tests**: Tests de integración más robustos

### **Para el Análisis de Ramas:**
- ✅ **Continuar con estrategia validada**: Los problemas de agentes no afectan el análisis
- ✅ **Implementar merge seguro**: Solo `fix/taskdb-prp-go`
- ✅ **Mantener documentación**: Los hallazgos son válidos independientemente

---
**Estado**: ✅ **PROBLEMAS IDENTIFICADOS Y SOLUCIONES DEFINIDAS**  
**Impacto en Análisis**: **MÍNIMO** - Análisis de ramas no afectado  
**Recomendación**: **IMPLEMENTAR** soluciones para agentes en paralelo al merge
