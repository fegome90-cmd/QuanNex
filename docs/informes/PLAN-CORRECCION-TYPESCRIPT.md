# 🔧 Plan de Corrección TypeScript - Problemas Pre-Push

**Fecha**: 2025-01-27  
**Prioridad**: ALTA - Bloquea desarrollo y CI/CD  
**Tiempo Estimado**: 3-5 horas  

## 🎯 Problemas Identificados por QuanNex

### **Resumen de Errores**:
- **TS5097 (imports .ts)**: ~20 errores (60%) - Falta `allowImportingTsExtensions`
- **TS1484 (type-only imports)**: ~5 errores (15%) - Falta `import type`
- **TS7016 (dependencias faltantes)**: 1 error (3%) - Falta `@types/which`
- **TS2379/TS2412/TS2375 (optional properties)**: ~5 errores (15%) - `exactOptionalPropertyTypes` muy estricto
- **Otros**: ~2 errores (7%)

## 🚀 Plan de Acción por Fases

### **FASE 1: Solución Inmediata (30 minutos)**

#### **1.1 Instalar Dependencias Faltantes**
```bash
npm install --save-dev @types/which
```

#### **1.2 Actualizar tsconfig.json**
```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "exactOptionalPropertyTypes": false,
    "verbatimModuleSyntax": false
  }
}
```

#### **1.3 Verificar Corrección**
```bash
npm run typecheck
```

**Resultado Esperado**: Reducir errores de ~30 a ~10

---

### **FASE 2: Corrección de Código (2-3 horas)**

#### **2.1 Corregir Type-Only Imports**

**Archivos a corregir**:
- `cli/quannex-cli.ts`
- `core/memory/index.ts`
- `gates/detectors/consistency.ts`

**Cambios requeridos**:
```typescript
// ❌ Antes
import { ReviewIssue, ReviewReport, AppConfig } from './types';

// ✅ Después
import type { ReviewIssue, ReviewReport, AppConfig } from './types';
```

#### **2.2 Corregir Optional Properties en TaskDB**

**Archivos a corregir**:
- `core/taskdb/logger.ts`
- `core/taskdb/pg.ts`
- `core/taskdb/queue.ts`
- `core/taskdb/withTask.ts`

**Cambios requeridos**:
```typescript
// ❌ Antes
const event: TaskEvent = {
  durationMs: undefined,
  // ...
};

// ✅ Después
const event: TaskEvent = {
  durationMs: undefined as number | undefined,
  // ...
};
```

#### **2.3 Verificar Corrección**
```bash
npm run typecheck
```

**Resultado Esperado**: Reducir errores de ~10 a ~2

---

### **FASE 3: Limpieza Final (1 hora)**

#### **3.1 Revisar Imports .ts**
- Mantener `allowImportingTsExtensions: true` o quitar extensiones
- Decidir estrategia consistente para el proyecto

#### **3.2 Configuración Final tsconfig.json**
```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "exactOptionalPropertyTypes": false,
    "verbatimModuleSyntax": false,
    "strict": true,
    // ... resto de configuración
  }
}
```

#### **3.3 Validación Completa**
```bash
npm run typecheck
npm run lint
npm run test
```

**Resultado Esperado**: 0 errores TypeScript

---

## 🔁 Dependencias Cruzadas

| Artefacto | Dependencia con este plan | Riesgo si no se ejecuta |
| --- | --- | --- |
| `packages/quannex-mcp/workflow-enforcement.mjs` | Requiere `tsconfig` con flags consistentes para evitar falsos positivos en hooks | Gates seguirán fallando aún con hooks graduales |
| `packages/taskdb-core/cli-reports.mjs` | Necesita reporte limpio para generar métricas `ts.errors.blocking` | Telemetría incompleta, auditoría imposible |
| `scripts/policy-check.mjs` | Consume definiciones TypeScript comunes; fallará con imports `.ts` | Bypass de políticas por typecheck fallido |
| `workflow-enforcement.mjs` (CI) | Depende de `npm run typecheck` estable para gates en pipelines | CI seguirá bloqueada y fomentará `--no-verify` |

Los ajustes de `tsconfig.json` deben coordinarse con SecOps y Plataforma para sincronizar los ambientes `dev`, `staging` y `prod` antes de liberar hooks graduales.

## 🗓️ Cronograma y Responsables

| Hito | Responsable | Duración estimada | Criterio de aceptación |
| --- | --- | --- | --- |
| Fase 1 completada | TaskDB Core (Ana) | 0.5 día | `ts.errors.blocking` reduce ≥60%, reporte almacenado |
| Fase 2 correcciones por módulo | TaskDB Core (Equipo) | 2-3 días | Checklist QA firmado, `npm run typecheck` sin errores |
| Validación CI/staging | Plataforma (Luis) | 1 día | Hooks dev/staging pasan con métricas controladas |
| Auditoría final | Auditoría QuanNex (Felipe) | 0.5 día | Actualización de `AUDITORIA-QUANNEX-INFORMES.md` con estado 🟢 |

> Las asignaciones son propuestas; deben confirmarse en el comité de respuesta de gates.

## 🔧 Comandos de Ejecución

### **Comandos de Corrección Automática**

#### **Buscar y Corregir Type-Only Imports**
```bash
# Buscar imports que necesitan 'import type'
grep -r "import.*{.*}.*from.*types" cli/ core/ gates/ | grep -v "import type"

# Ejemplo de corrección manual
sed -i 's/import { \(.*\) } from/import type { \1 } from/g' cli/quannex-cli.ts
```

#### **Instalar Dependencias**
```bash
npm install --save-dev @types/which
```

#### **Verificar Progreso**
```bash
npm run typecheck 2>&1 | grep -E "(error|warning)" | wc -l
```

### **Comandos de Validación**
```bash
# Verificar tipos
npm run typecheck

# Verificar linting
npm run lint

# Verificar tests
npm run test

# Verificar build
npm run build

# Intentar push
git add .
git commit -m "fix: resolve typescript errors blocking pre-push"
git push origin main
```

## 📊 Métricas de Progreso

### **Antes de Corrección**:
- **Errores totales**: ~30
- **Archivos afectados**: 10+
- **Categorías**: 4 tipos de errores

### **Después de Fase 1**:
- **Errores esperados**: ~10
- **Reducción**: 67%

### **Después de Fase 2**:
- **Errores esperados**: ~2
- **Reducción**: 93%

### **Después de Fase 3**:
- **Errores esperados**: 0
- **Reducción**: 100%

## 🚨 Rollback Plan

### **Si algo sale mal**:
```bash
# Revertir cambios en tsconfig.json
git checkout HEAD -- tsconfig.json

# Revertir cambios en package.json
git checkout HEAD -- package.json

# Reinstalar dependencias
npm ci

# Verificar estado
npm run typecheck
```

## ✅ Checklist de Validación

### **Pre-Corrección**:
- [ ] Backup de tsconfig.json actual
- [ ] Backup de package.json actual
- [ ] Documentar estado actual de errores

### **Post-Fase 1**:
- [ ] @types/which instalado
- [ ] tsconfig.json actualizado
- [ ] Errores reducidos a ~10
- [ ] npm run typecheck funciona

### **Post-Fase 2**:
- [ ] Type-only imports corregidos
- [ ] Optional properties corregidos
- [ ] Errores reducidos a ~2
- [ ] Código compila sin errores críticos

### **Post-Fase 3**:
- [ ] 0 errores TypeScript
- [ ] npm run lint pasa
- [ ] npm run test pasa
- [ ] git push funciona sin --no-verify
- [ ] CI/CD funciona correctamente

## 🎯 Resultado Esperado

### **Estado Final**:
- ✅ **0 errores TypeScript**
- ✅ **Pre-push hooks funcionando**
- ✅ **CI/CD pipeline operativo**
- ✅ **Desarrollo sin bloqueos**
- ✅ **Calidad de código mantenida**

### **Beneficios**:
- **Desarrollo fluido**: Push sin problemas
- **CI/CD operativo**: Verificaciones automáticas
- **Calidad asegurada**: Tipos correctos
- **Mantenibilidad**: Código más robusto

---

**Estado**: 🔄 **LISTO PARA EJECUTAR**  
**Prioridad**: **ALTA** - Bloquea desarrollo  
**Tiempo estimado**: **3-5 horas**  
**Riesgo**: **BAJO** - Cambios incrementales con rollback
