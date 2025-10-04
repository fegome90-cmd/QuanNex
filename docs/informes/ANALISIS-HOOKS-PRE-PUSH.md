# 🔐 Análisis de Hooks Pre-Push - QuanNex

**Fecha**: 2025-01-27  
**Analista**: Claude + QuanNex  
**Objetivo**: Análisis exhaustivo de hooks pre-push y su configuración problemática

## 🎯 Configuración Actual de Hooks

### **Hook Pre-Push Principal (.git/hooks/pre-push)**
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔐 Verificando MCP Enforcement..."

# Verificaciones críticas que bloquean push:
1. Verificar QUANNEX_SIGNING_KEY en variables de entorno
2. Verificar trailer QuanNex en commit message
3. Verificar formato de requestId (32 caracteres hex)
4. Verificar formato de firma (64 caracteres hex)
5. Verificar firma HMAC válida
6. Verificar traza MCP existente
7. Validar traza MCP con campos requeridos
```

### **Hook Husky (.husky/pre-push)**
```bash
npm run prepush
```

### **Script PrePush (package.json)**
```json
{
  "scripts": {
    "prepush": "npm run verify:quick",
    "verify:quick": "npm run typecheck && npm run lint"
  }
}
```

---

## 🚨 Problemas Identificados en Hooks

### **Problema 1: Verificación MCP Demasiado Estricta**

#### **Configuración Actual:**
```bash
# Requiere QUANNEX_SIGNING_KEY
KEY="${QUANNEX_SIGNING_KEY:-}"
if [ -z "$KEY" ]; then
  echo "🔴 Error: falta QUANNEX_SIGNING_KEY en variables de entorno"
  exit 1
fi

# Requiere trailer QuanNex en commit
if ! echo "$MSG" | grep -q "QuanNex: requestId="; then
  echo "🔴 Error: commit sin trailer QuanNex"
  exit 1
fi
```

#### **Problemas Identificados:**
- **Demasiado estricto**: Requiere configuración específica de QuanNex
- **Bloquea desarrollo normal**: No permite commits sin trailer QuanNex
- **Sin bypass controlado**: No hay ruta para desarrollo legítimo
- **Configuración compleja**: Requiere múltiples variables y archivos

### **Problema 2: Verificación de Traza MCP Compleja**

#### **Configuración Actual:**
```bash
# Requiere archivo de traza MCP
if [ ! -f ".quannex/trace/$REQ.json" ]; then
  echo "🔴 Error: falta traza MCP para requestId: $REQ"
  exit 1
fi

# Validación compleja de traza
node -e "
const fs = require('fs');
try {
  const trace = JSON.parse(fs.readFileSync('.quannex/trace/$REQ.json', 'utf8'));
  if (!trace.traceId || trace.traceId !== '$REQ') {
    console.error('Traza inválida: traceId no coincide');
    process.exit(1);
  }
  if (!trace.timestamp || !trace.operation) {
    console.error('Traza inválida: campos requeridos faltantes');
    process.exit(1);
  }
} catch (e) {
  console.error('Error al validar traza:', e.message);
  process.exit(1);
}
"
```

#### **Problemas Identificados:**
- **Complejidad excesiva**: Requiere generación de trazas MCP
- **Archivos externos**: Depende de archivos `.quannex/trace/`
- **Validación estricta**: Falla si cualquier campo falta
- **Sin fallback**: No hay alternativa para desarrollo normal

### **Problema 3: Verificación de Firma HMAC**

#### **Configuración Actual:**
```bash
# Verificación de firma HMAC
CALC=$(printf "%s" "$REQ" | openssl dgst -sha256 -hmac "$KEY" | awk '{print $2}')

if [ "$SIG" != "$CALC" ]; then
  echo "🔴 Error: firma HMAC inválida"
  exit 1
fi
```

#### **Problemas Identificados:**
- **Criptografía compleja**: Requiere conocimiento de HMAC
- **Dependencias externas**: Requiere `openssl`
- **Sin bypass**: No permite desarrollo sin firma
- **Configuración sensible**: Requiere manejo de claves

### **Problema 4: Verificación de TypeScript y Lint**

#### **Configuración Actual:**
```bash
# verify:quick ejecuta:
npm run typecheck && npm run lint

# typecheck ejecuta:
tsc -p tsconfig.json --noEmit

# lint ejecuta:
eslint . --ext .ts,.tsx,.js,.mjs
```

#### **Problemas Identificados:**
- **Bloquea por errores menores**: Cualquier error TypeScript bloquea push
- **Sin gradación**: No diferencia entre errores críticos y warnings
- **Configuración estricta**: TypeScript muy estricto bloquea desarrollo
- **Sin bypass controlado**: No hay ruta para push con warnings

---

## 🔍 Análisis de Causa Raíz

### **Causa Raíz 1: Hooks Diseñados para Producción**

#### **Problema:**
- **Hooks de producción** en entorno de desarrollo
- **Verificaciones enterprise** para desarrollo local
- **Sin flexibilidad** para desarrollo iterativo

#### **Impacto:**
- **Desarrollo bloqueado** por verificaciones de producción
- **Configuración compleja** requerida para push simple
- **Bypass destructivo** como única alternativa

#### **Solución:**
- **Hooks graduales** por ambiente
- **Verificaciones opcionales** en desarrollo
- **Bypass controlado** para casos legítimos

### **Causa Raíz 2: Verificaciones MCP Obligatorias**

#### **Problema:**
- **Verificaciones MCP** obligatorias para cualquier push
- **Sin contexto** de cuándo son necesarias
- **Sin bypass** para desarrollo normal

#### **Impacto:**
- **Desarrollo normal bloqueado** por verificaciones MCP
- **Configuración compleja** requerida
- **Frustración alta** en desarrolladores

#### **Solución:**
- **Verificaciones MCP opcionales** en desarrollo
- **Activación condicional** basada en contexto
- **Bypass documentado** para desarrollo

### **Causa Raíz 3: Gates Binarios Sin Gradación**

#### **Problema:**
- **Gates binarios** (pasa/no pasa)
- **Sin niveles de severidad** para errores
- **Sin bypass controlado** para casos legítimos

#### **Impacto:**
- **Errores menores** bloquean desarrollo
- **Sin desarrollo incremental** permitido
- **Bypass destructivo** necesario

#### **Solución:**
- **Gates graduales** con niveles
- **Desarrollo incremental** permitido
- **Bypass controlado** documentado

---

## 📊 Análisis de Impacto

### **Impacto en Desarrollo**

#### **Desarrollo Normal Bloqueado:**
- **Push simple**: Requiere configuración MCP compleja
- **Commit normal**: Requiere trailer QuanNex
- **Desarrollo iterativo**: Bloqueado por verificaciones estrictas
- **Hotfix**: No hay ruta para correcciones urgentes

#### **Bypass Destructivo Necesario:**
- **`--no-verify`**: Única alternativa para push
- **Rollbacks masivos**: IA crea ramas destructivas
- **Pérdida de trabajo**: Funcionalidad valiosa eliminada
- **Regresión**: Vuelta a estados anteriores

### **Impacto en Productividad**

#### **Tiempo Perdido:**
- **Configuración inicial**: ~2-4 horas
- **Debugging hooks**: ~1-2 horas por push fallido
- **Bypass destructivo**: ~4-8 horas de recuperación
- **Rollbacks**: ~10-20 horas de trabajo perdido

#### **Frustración Alta:**
- **Desarrolladores bloqueados**: No pueden progresar
- **Configuración compleja**: Requiere expertise específico
- **Sin documentación**: No hay guía clara
- **Sin soporte**: No hay ayuda para problemas

---

## 🔧 Recomendaciones de Solución

### **Recomendación 1: Hooks Graduales por Ambiente**

#### **Implementar Sistema de Ambientes:**
```bash
# .git/hooks/pre-push
#!/usr/bin/env bash
set -euo pipefail

# Detectar ambiente
if [ "${NODE_ENV:-}" = "development" ]; then
  echo "🔧 Modo desarrollo - verificaciones mínimas"
  npm run verify:dev
elif [ "${NODE_ENV:-}" = "staging" ]; then
  echo "🧪 Modo staging - verificaciones intermedias"
  npm run verify:staging
else
  echo "🚀 Modo producción - verificaciones completas"
  npm run verify:prod
fi
```

#### **Scripts por Ambiente:**
```json
{
  "scripts": {
    "verify:dev": "npm run typecheck:dev && npm run lint:dev",
    "verify:staging": "npm run typecheck && npm run lint",
    "verify:prod": "npm run typecheck && npm run lint && npm run verify:mcp",
    "typecheck:dev": "tsc -p tsconfig.dev.json --noEmit",
    "lint:dev": "eslint . --ext .ts,.tsx,.js,.mjs --max-warnings 10"
  }
}
```

### **Recomendación 2: Verificaciones MCP Opcionales**

#### **Activación Condicional:**
```bash
# Verificaciones MCP solo si están configuradas
if [ -n "${QUANNEX_SIGNING_KEY:-}" ] && [ -n "${QUANNEX_ENFORCE:-}" ]; then
  echo "🔐 Verificando MCP Enforcement..."
  # Verificaciones MCP existentes
else
  echo "🔧 Modo desarrollo - verificaciones MCP omitidas"
fi
```

#### **Bypass Controlado:**
```bash
# Permitir bypass con justificación
if [ "${QUANNEX_BYPASS:-}" = "true" ] && [ -n "${QUANNEX_BYPASS_REASON:-}" ]; then
  echo "⚠️ Bypass MCP autorizado: $QUANNEX_BYPASS_REASON"
  # Continuar sin verificaciones MCP
else
  # Verificaciones MCP normales
fi
```

### **Recomendación 3: Gates Graduales**

#### **Sistema de Severidad:**
```bash
# Verificar errores por severidad
npm run typecheck 2>&1 | while read line; do
  if echo "$line" | grep -q "error TS"; then
    echo "❌ Error crítico: $line"
    exit 1
  elif echo "$line" | grep -q "warning TS"; then
    echo "⚠️ Warning: $line"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# Permitir push con warnings si no exceden límite
if [ $WARNINGS -gt 10 ]; then
  echo "🔴 Demasiados warnings ($WARNINGS), bloqueando push"
  exit 1
else
  echo "🟡 Push permitido con $WARNINGS warnings"
fi
```

### **Métricas Operativas del Hook**
| Métrica | Objetivo | Fuente | Acción correctiva |
| --- | --- | --- | --- |
| `gates.failures.hourly` | ≤5 en dev, ≤2 en staging | `INFORME-METRICAS-GATES.md` | Revisar configuración y PRs recientes |
| `gates.bypass.manual` | ≤1 uso controlado / 24 h | Registro hooks + TaskDB | Mentoría y revisión de proceso |
| `hook.false_positive.rate` | ≤10% a 7 días | Log estructurado | Ajustar condiciones MCP o degradar a warning |
| `unlock.mttd` | ≤6 h | OPERATIONS_PLAYBOOK (`gate_unlocks`) | Actualizar runbooks y guardias |

> `hook.false_positive.rate` se calculará como `falsos positivos / total eventos`; requiere etiqueta `outcome=warning` en los logs.

### **Decisión por Ambiente (Propuesta)**
| Ambiente | Verificaciones críticas | Checks degradados a warning | Bypass autorizado | Aprobador |
| --- | --- | --- | --- | --- |
| Development | Typecheck dev, lint dev | MCP trailer, traza MCP, HMAC | Sí (1 push/24 h documentado) | Líder de equipo |
| Staging | Typecheck completo, lint completo, MCP trailer | HMAC (solo si infraestructura indisponible) | No, salvo incidente con SecOps | SecOps |
| Producción | Todos los checks (MCP completo, firma, traza, tests) | Ninguno | No | SecOps + Dirección Técnica |

### **Escenarios de Excepción Controlados**
- **Incidente crítico**: habilitar bypass temporal documentado en `OPERATIONS_PLAYBOOK.md` con vencimiento ≤4 h.
- **Caída de infraestructura MCP**: degradar firma/traza a warning exclusivamente en desarrollo; staging/prod requieren autorización por escrito de SecOps.
- **Trabajo fuera de horario**: exigir doble confirmación (autor + guardia) y registrar motivo en TaskDB.

---

## 📋 Plan de Implementación

### **Fase 1: Hooks Graduales (1 día)**
1. **Implementar detección de ambiente** en hooks
2. **Crear scripts por ambiente** (dev/staging/prod)
3. **Permitir bypass controlado** con justificación

### **Fase 2: Verificaciones MCP Opcionales (1 día)**
1. **Implementar activación condicional** de MCP
2. **Crear bypass controlado** para desarrollo
3. **Documentar configuración** requerida

### **Fase 3: Gates Graduales (2 días)**
1. **Implementar sistema de severidad** en verificaciones
2. **Permitir desarrollo incremental** con warnings
3. **Crear hotfix path** documentado

### **Fase 4: Validación (1 día)**
1. **Probar hooks graduales** en diferentes ambientes
2. **Validar bypass controlado** funciona
3. **Confirmar desarrollo incremental** permitido

---

## 🎯 Conclusiones

### **Problema Principal:**
**Los hooks pre-push están diseñados para producción y bloquean desarrollo normal, forzando bypass destructivo.**

### **Causas Identificadas:**
1. **Verificaciones MCP obligatorias** para cualquier push
2. **Hooks de producción** en entorno de desarrollo
3. **Gates binarios** sin gradación
4. **Sin bypass controlado** para casos legítimos

### **Solución:**
**Implementar hooks graduales por ambiente, verificaciones MCP opcionales y gates graduales para permitir desarrollo incremental.**

---

**Estado**: 🔍 **ANÁLISIS DE HOOKS COMPLETADO**  
**Próximo**: Implementar hooks graduales y verificaciones opcionales  
**Prioridad**: **CRÍTICA** - Desbloquear desarrollo sin comprometer seguridad
