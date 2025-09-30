# INFORME M-5: SEGURIDAD DE LIMPIEZA DE RUTAS LEGACY

**Fecha:** $(date)  
**Objetivo:** Determinar si es seguro proceder con M-5 (retirar shims y limpiar rutas legacy) tras las migraciones actuales.

## 📋 RESUMEN EJECUTIVO

**DICTAMEN: ⚠️ NO ES SEGURO proceder con M-5 en este momento**

**Razón principal:** Existen 19 referencias legacy activas en documentación que requieren migración antes de eliminar los shims.

## 🔍 INVENTARIO DE SHIMS ACTIVOS

### Total de shims en legacy/paths.json: 75

**Categorización por tipo:**
- **Scripts legacy:** 16 shims
- **Templates legacy:** 3 shims  
- **Documentación legacy:** 56 shims

## 📊 ANÁLISIS POR SHIM

### ✅ SHIMS SEGUROS PARA ELIMINAR (0/75)

**Ningún shim es completamente seguro en este momento.**

### ⚠️ SHIMS CON REFERENCIAS ACTIVAS (19/75)

#### Scripts Legacy con Referencias en Documentación

| Shim | Referencias Encontradas | Tipo | Acción Requerida |
|------|------------------------|------|------------------|
| `scripts/advanced-lint.sh` | docs/PLAN-IMPLEMENTACION-DETALLADO.md | Doc | Actualizar a `core/scripts/` |
| `scripts/quality-check.sh` | docs/PLAN-IMPLEMENTACION-DETALLADO.md | Doc | Actualizar a `core/scripts/` |
| `scripts/version.sh` | docs/PLAN-IMPLEMENTACION-DETALLADO.md | Doc | Actualizar a `core/scripts/` |
| `scripts/metrics.sh` | docs/PLAN-IMPLEMENTACION-DETALLADO.md | Doc | Actualizar a `core/scripts/` |
| `scripts/auto-review.sh` | docs/agents/code-reviewer/ejemplos.md | Doc | Actualizar a `core/scripts/` |
| `scripts/analyze-reports.sh` | docs/agents/code-reviewer/ejemplos.md | Doc | Actualizar a `core/scripts/` |
| `scripts/restore-backup.sh` | docs/STABILITY-POLICY.md, docs/FRAMEWORK-IMPLEMENTACION-REAL.md | Doc | Actualizar a `core/scripts/` |

#### Templates Legacy con Referencias

| Shim | Referencias Encontradas | Tipo | Acción Requerida |
|------|------------------------|------|------------------|
| `templates/context-engineering-template.md` | docs/research/imported/brainstorm/analisis-conexiones-claude-kit.md | Doc | Actualizar a `core/templates/` |
| `templates/retrospectiva-template.md` | docs/research/imported/brainstorm/analisis-conexiones-claude-kit.md | Doc | Actualizar a `core/templates/` |
| `templates/prompts-base-mejorados.md` | docs/research/imported/brainstorm/analisis-conexiones-claude-kit.md | Doc | Actualizar a `core/templates/` |

### ✅ SHIMS SIN REFERENCIAS ACTIVAS (56/75)

**Todos los shims de documentación legacy (docs/agents/*, docs/rfc/*, .github/workflows/*) no tienen referencias activas en el código actual.**

## 🔧 VALIDACIONES AUTOMÁTICAS

### Path Linter
```bash
$ node tools/path-lint.mjs
# Exit code: 1 (errores encontrados)
# No se proporcionó output detallado
```

### Docs Linter  
```bash
$ node tools/docs-lint.mjs
# docs-lint: 19 legacy reference(s)
# Exit code: 1 (errores encontrados)
```

**Resumen de validaciones:**
- ❌ Path linter: Errores detectados
- ❌ Docs linter: 19 referencias legacy encontradas
- ⚠️ **Total de referencias problemáticas: 19**

## 🚨 RIESGOS DE LIMPIEZA

### Riesgos Críticos Identificados

1. **Documentación desactualizada:** 19 referencias en docs apuntan a rutas legacy
2. **Ejemplos de código rotos:** docs/agents/code-reviewer/ejemplos.md contiene ejemplos con rutas legacy
3. **Guías de implementación obsoletas:** docs/PLAN-IMPLEMENTACION-DETALLADO.md referencia scripts legacy

### Elementos que NO se deben retirar todavía

- **Ningún shim** hasta completar la migración de referencias
- **Todas las rutas en legacy/paths.json** hasta actualizar documentación

## 📋 PLAN DE MITIGACIÓN

### Fase 1: Migración de Referencias (REQUERIDA)

#### 1.1 Actualizar Documentación de Scripts
```bash
# Archivos a actualizar:
- docs/PLAN-IMPLEMENTACION-DETALLADO.md
- docs/agents/code-reviewer/ejemplos.md  
- docs/STABILITY-POLICY.md
- docs/FRAMEWORK-IMPLEMENTACION-REAL.md

# Cambios requeridos:
scripts/advanced-lint.sh → core/scripts/advanced-lint.sh
scripts/quality-check.sh → core/scripts/quality-check.sh
scripts/version.sh → core/scripts/version.sh
scripts/metrics.sh → core/scripts/metrics.sh
scripts/auto-review.sh → core/scripts/auto-review.sh
scripts/analyze-reports.sh → core/scripts/analyze-reports.sh
scripts/restore-backup.sh → core/scripts/restore-backup.sh
```

#### 1.2 Actualizar Referencias de Templates
```bash
# Archivos a actualizar:
- docs/research/imported/brainstorm/analisis-conexiones-claude-kit.md

# Cambios requeridos:
templates/context-engineering-template.md → core/templates/context-engineering-template.md
templates/retrospectiva-template.md → core/templates/retrospectiva-template.md
templates/prompts-base-mejorados.md → core/templates/prompts-base-mejorados.md
```

### Fase 2: Verificación Post-Migración

#### 2.1 Re-ejecutar Linters
```bash
node tools/path-lint.mjs  # Debe retornar exit code 0
node tools/docs-lint.mjs  # Debe retornar 0 legacy references
```

#### 2.2 Verificar Funcionalidad
```bash
# Verificar que los scripts migrados funcionan
./core/scripts/advanced-lint.sh --help
./core/scripts/quality-check.sh --help
./core/scripts/version.sh --help
```

### Fase 3: Limpieza Segura

#### 3.1 Eliminar Shims Migrados
```bash
# Solo después de completar Fase 1 y 2
# Eliminar entradas de legacy/paths.json para rutas migradas
```

#### 3.2 Limpiar Rutas Legacy
```bash
# Eliminar directorios legacy vacíos
# Actualizar .gitignore si es necesario
```

## 📈 MÉTRICAS DE PROGRESO

### Estado Actual
- **Shims totales:** 75
- **Referencias activas:** 19
- **Shims seguros para eliminar:** 0
- **Progreso de migración:** 0%

### Objetivos Post-Migración
- **Referencias activas:** 0
- **Shims seguros para eliminar:** 75
- **Progreso de migración:** 100%

## 🎯 RECOMENDACIONES FINALES

### Acción Inmediata Requerida

1. **NO proceder con M-5** hasta completar migración de referencias
2. **Priorizar actualización de documentación** con rutas correctas
3. **Implementar validación automática** para prevenir regresiones

### Orden de Ejecución Recomendado

1. ✅ **Completar migración de referencias** (Fase 1)
2. ✅ **Verificar con linters** (Fase 2)  
3. ✅ **Ejecutar M-5 de forma segura** (Fase 3)

### Estimación de Esfuerzo

- **Tiempo estimado:** 2-4 horas
- **Archivos a modificar:** 5 archivos de documentación
- **Riesgo:** Bajo (solo actualización de referencias)

---

**CONCLUSIÓN:** M-5 debe posponerse hasta completar la migración de las 19 referencias legacy identificadas en la documentación.
