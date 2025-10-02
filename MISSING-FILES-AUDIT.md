# AUDITORÍA DE ARCHIVOS FALTANTES POST-VERSIONADO

## 📊 RESUMEN DEL PROBLEMA
El versionado de carpetas rompió las referencias a archivos que se movieron de ubicación. Los scripts siguen buscando archivos en las ubicaciones antiguas.

## 🔍 ARCHIVOS FALTANTES IDENTIFICADOS

### 1. ARCHIVOS DE AGENTES
**Ubicación esperada:** `agents/{agent}/agent.js`
**Ubicación real:** `versions/v3/{agent}-agent.js`

**Agentes afectados:**
- `agents/context/agent.js` → `versions/v3/context-agent.js`
- `agents/prompting/agent.js` → `versions/v3/prompting-agent.js`  
- `agents/rules/agent.js` → `versions/v3/rules-agent.js`

**Scripts afectados:**
- `core/scripts/validate-orchestration.sh`
- `core/scripts/validate-agents.sh`
- `core/scripts/agent-context-verify.sh`
- `core/scripts/agent-prompting-verify.sh`
- `core/scripts/agent-rules-verify.sh`

### 2. ARCHIVOS DE ORCHESTRATION
**Ubicación esperada:** `orchestration/test-orchestration.js`
**Ubicación real:** `versions/v3/test-orchestration.js`

**Scripts afectados:**
- `core/scripts/validate-orchestration.sh`

### 3. ARCHIVOS MCP
**Ubicación esperada:** `orchestration/mcp/server.js`
**Ubicación real:** `versions/v3/mcp-server-consolidated.js`

**Scripts afectados:**
- `core/scripts/validate-orchestration.sh`
- `scripts/mcp-autonomous-init.sh`
- Múltiples scripts en `tools/scripts/`

## 📋 ARCHIVOS QUE NECESITAN ENLACES SIMBÓLICOS

### Enlaces necesarios en `agents/`:
```bash
# Crear enlaces simbólicos para agentes
ln -sf ../../versions/v3/context-agent.js agents/context/agent.js
ln -sf ../../versions/v3/prompting-agent.js agents/prompting/agent.js
ln -sf ../../versions/v3/rules-agent.js agents/rules/agent.js
```

### Enlaces necesarios en `orchestration/`:
```bash
# Crear enlace para test de orquestación
ln -sf ../versions/v3/test-orchestration.js orchestration/test-orchestration.js

# Crear enlace para MCP server
ln -sf ../versions/v3/mcp-server-consolidated.js orchestration/mcp/server.js
```

## 🔧 SOLUCIÓN PROPUESTA

### Fase 1: Crear enlaces simbólicos
Crear enlaces simbólicos para mantener compatibilidad con scripts existentes.

### Fase 2: Actualizar referencias críticas
Actualizar solo los scripts críticos que no pueden usar enlaces simbólicos.

### Fase 3: Validar funcionamiento
Ejecutar todos los gates para verificar que funcionan correctamente.

## 📊 IMPACTO ESTIMADO

**Scripts afectados:** 55+ archivos
**Gates afectados:** 
- validate-orchestration.sh
- validate-agents.sh
- Múltiples scripts de verificación de agentes

**Solución:** Enlaces simbólicos (sin cambios de código)
