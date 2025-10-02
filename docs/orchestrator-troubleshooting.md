# 🚨 SOLUCIÓN PERMANENTE: Problema Recurrente del Orquestador

## ⚠️ **PROBLEMA RECURRENTE IDENTIFICADO**

Este problema se repite en **4+ chats diferentes** y siempre tiene los mismos síntomas:

1. **Busca orquestador en carpeta v3** (incorrecto)
2. **Errores de imports** con rutas relativas incorrectas
3. **Workflows fallan** con esquemas de entrada incorrectos
4. **Confusión entre múltiples versiones** del orquestador

## 🔍 **CAUSA RAÍZ**

### **Múltiples Versiones Confusas**
```
orchestration/
├── orchestrator.js                    ✅ VERSIÓN CORRECTA (usar esta)
├── orchestrator-consolidated.js       ❌ Duplicado
├── orchestrator-v2-backup.js          ❌ Backup viejo
├── orchestrator.js.backup             ❌ Backup viejo
├── orchestrator.js.broken             ❌ Versión rota
├── orchestrator.js.prod               ❌ Versión producción
└── test-orchestration.js -> ../versions/v3/test-orchestration.js  ❌ ENLACE PROBLEMÁTICO

versions/v3/
├── consolidated-orchestrator.js       ❌ IMPORTS INCORRECTOS
└── test-orchestration.js              ❌ IMPORTS INCORRECTOS
```

### **Imports Incorrectos en v3**
```javascript
❌ INCORRECTO (versions/v3/):
import { hello, isHello } from '../../shared/contracts/handshake.js';
import { validateReq, ok, fail } from '../../shared/contracts/schema.js';

✅ CORRECTO (orchestration/):
import { hello, isHello } from '../shared/contracts/handshake.js';
import { validateReq, ok, fail } from '../shared/contracts/schema.js';
```

## ✅ **SOLUCIÓN PERMANENTE**

### **1. Usar SIEMPRE el Orquestador Correcto**
```bash
# ✅ SIEMPRE usar este comando:
cd /Users/felipe/Developer/startkit-main
node orchestration/orchestrator.js <comando>

# ❌ NUNCA usar:
node versions/v3/consolidated-orchestrator.js
node versions/v3/test-orchestration.js
```

### **2. Verificar Ubicación Correcta**
```bash
# Verificar que estás en el directorio correcto:
pwd
# Debe mostrar: /Users/felipe/Developer/startkit-main

# Verificar que el orquestador correcto existe:
ls -la orchestration/orchestrator.js
# Debe mostrar: -rwxr-xr-x ... orchestration/orchestrator.js
```

### **3. Esquema de Workflow Correcto**
```json
{
  "name": "workflow-name",
  "description": "Descripción del workflow",
  "steps": [
    {
      "step_id": "step-1",
      "agent": "context",
      "input": {
        "sources": ["archivo1.md", "archivo2.json"],  // REQUERIDO
        "max_tokens": 1000                            // OPCIONAL
      }
    }
  ]
}
```

### **4. Comandos de Verificación**
```bash
# Verificar salud de agentes
node orchestration/orchestrator.js health

# Crear workflow
node orchestration/orchestrator.js create workflow.json

# Ejecutar workflow
node orchestration/orchestrator.js execute <workflow_id>

# Ver estado
node orchestration/orchestrator.js status <workflow_id>
```

## 🛠️ **LIMPIEZA RECOMENDADA**

### **Eliminar Archivos Confusos**
```bash
# Eliminar enlaces simbólicos problemáticos
rm orchestration/test-orchestration.js

# Eliminar versiones duplicadas (opcional)
rm orchestration/orchestrator-consolidated.js
rm orchestration/orchestration-v2-backup.js
rm orchestration/orchestrator.js.backup
rm orchestration/orchestrator.js.broken
rm orchestration/orchestrator.js.prod
```

### **Crear Alias Útil**
```bash
# Agregar al .bashrc o .zshrc:
alias quannex-orchestrator="cd /Users/felipe/Developer/startkit-main && node orchestration/orchestrator.js"

# Uso:
quannex-orchestrator health
quannex-orchestrator create workflow.json
```

## 📋 **CHECKLIST DE VERIFICACIÓN**

Antes de usar el orquestador, verificar:

- [ ] **Directorio correcto**: `/Users/felipe/Developer/startkit-main`
- [ ] **Orquestador correcto**: `orchestration/orchestrator.js`
- [ ] **Agentes saludables**: `node orchestration/orchestrator.js health`
- [ ] **Esquema correcto**: `steps` con `step_id` y `sources`
- [ ] **Sin enlaces simbólicos**: No usar `versions/v3/`

## 🚨 **SEÑALES DE ALERTA**

Si ves estos errores, **NO** es problema del código:

- `Cannot find module '../../shared/contracts/handshake.js'`
- `Cannot find module '../../shared/contracts/schema.js'`
- `Workflow requires non-empty steps[]`
- `Duplicate or missing step_id: undefined`
- `sources must be a non-empty array of strings`

**Solución**: Usar `orchestration/orchestrator.js` en lugar de `versions/v3/`

## ✅ **ESTADO FINAL**

- ✅ **Problema identificado**: Múltiples versiones confusas
- ✅ **Solución documentada**: Usar orquestador correcto
- ✅ **Esquemas corregidos**: Workflow con estructura correcta
- ✅ **Comandos verificados**: Todos funcionando
- ✅ **Prevención**: Documentación clara para evitar recurrencia

**Este documento debe ser consultado en cada nuevo chat para evitar que el problema se repita.**
