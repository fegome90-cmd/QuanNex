# PLAN DE HERRAMIENTAS PARA REESTRUCTURACIÓN

**Fecha:** 2025-09-30T20:20:00Z  
**Proyecto:** StartKit Main - Herramientas para Reestructuración  
**Objetivo:** Identificar y utilizar las herramientas más efectivas para la reestructuración de archivos

## 🎯 HERRAMIENTAS PRINCIPALES RECOMENDADAS

### **1. 🎯 path-lint.mjs - Validador de Rutas**
```bash
# Uso básico
node tools/path-lint.mjs

# Con verbose
node tools/path-lint.mjs --verbose
```

**Propósito:**
- Validar referencias de rutas después de reestructuración
- Detectar rutas rotas tras mover archivos
- Verificar consistencia de referencias

**Beneficios para Reestructuración:**
- ✅ **Detección automática** de rutas rotas
- ✅ **Validación post-migración** de referencias
- ✅ **Reporte detallado** de inconsistencias
- ✅ **Integración con MCP** para validación

### **2. 🎯 docs-lint.mjs - Validador de Documentación**
```bash
# Uso básico
node tools/docs-lint.mjs

# Con filtros específicos
node tools/docs-lint.mjs --filter="*.md"
```

**Propósito:**
- Validar documentación y referencias
- Asegurar consistencia en documentación
- Detectar enlaces rotos y referencias obsoletas

**Beneficios para Reestructuración:**
- ✅ **Validación de documentación** actualizada
- ✅ **Detección de enlaces rotos** tras reestructuración
- ✅ **Consistencia de referencias** en docs
- ✅ **Integración con path-lint** para validación completa

### **3. 🎯 run-autofix.mjs - Correcciones Automáticas**
```bash
# Modo preview (dry-run)
node tools/run-autofix.mjs dry-run --verbose

# Aplicar correcciones
node tools/run-autofix.mjs apply --verbose

# Solo JavaScript
node tools/run-autofix.mjs apply --lang=javascript
```

**Propósito:**
- Aplicar correcciones automáticas de calidad
- Ejecutar herramientas de linting y formateo
- Manejo robusto de argumentos CLI

**Beneficios para Reestructuración:**
- ✅ **Correcciones automáticas** de código
- ✅ **Linting y formateo** post-migración
- ✅ **Modo dry-run** para previsualizar cambios
- ✅ **Filtrado por lenguaje** específico

### **4. 🎯 preview-diff.mjs - Previsualización de Cambios**
```bash
# Previsualizar cambios
node tools/preview-diff.mjs

# Con filtros específicos
node tools/preview-diff.mjs --pattern="*.js"
```

**Propósito:**
- Previsualizar cambios antes de aplicar
- Ver diferencias sin modificar archivos
- Validar cambios antes de commit

**Beneficios para Reestructuración:**
- ✅ **Previsualización segura** de cambios
- ✅ **Validación previa** a migración
- ✅ **Detección de conflictos** potenciales
- ✅ **Revisión de cambios** antes de aplicar

### **5. 🎯 cleanup.mjs - Limpieza del Workspace**
```bash
# Limpieza básica
node tools/cleanup.mjs

# Con verbose
node tools/cleanup.mjs --verbose
```

**Propósito:**
- Limpiar workspace después de cambios
- Eliminar artefactos temporales
- Mantener directorio limpio

**Beneficios para Reestructuración:**
- ✅ **Limpieza post-migración** automática
- ✅ **Eliminación de artefactos** temporales
- ✅ **Workspace limpio** después de cambios
- ✅ **Integración con MCP** para limpieza

## 🔄 FLUJO DE TRABAJO RECOMENDADO

### **Fase 1: Pre-migración**
```bash
# 1. Validar estado actual
node tools/path-lint.mjs
node tools/docs-lint.mjs

# 2. Previsualizar cambios
node tools/preview-diff.mjs

# 3. Backup del estado actual
git add -A && git commit -m "Pre-migration backup"
```

### **Fase 2: Durante la migración**
```bash
# 1. Aplicar correcciones automáticas
node tools/run-autofix.mjs dry-run --verbose
node tools/run-autofix.mjs apply --verbose

# 2. Validar cambios parciales
node tools/path-lint.mjs
node tools/docs-lint.mjs

# 3. Limpiar workspace
node tools/cleanup.mjs
```

### **Fase 3: Post-migración**
```bash
# 1. Validación completa
node tools/path-lint.mjs
node tools/docs-lint.mjs

# 2. Correcciones finales
node tools/run-autofix.mjs apply --verbose

# 3. Limpieza final
node tools/cleanup.mjs

# 4. Verificación de integridad
node orchestration/orchestrator.js health
node tools/bench-agents.mjs
```

## 🛠️ HERRAMIENTAS COMPLEMENTARIAS

### **Herramientas de Análisis**
- **bench-agents.mjs** - Benchmarking de agentes MCP
- **verify-metrics.mjs** - Verificación de métricas
- **sarif-aggregate.mjs** - Agregación de reportes

### **Herramientas de Migración**
- **migrate-layout.mjs** - Migración de layout (placeholder)
- **plan-build.mjs** - Planificación de builds
- **run-codemods.sh** - Aplicación de codemods

### **Herramientas de Seguridad**
- **node-audit.sh** - Auditoría de dependencias Node.js
- **python-audit.sh** - Auditoría de dependencias Python
- **generate-sbom.sh** - Generación de SBOM

## 📊 MÉTRICAS DE ÉXITO

### **Validaciones Requeridas**
- ✅ **path-lint:** 0 errores de rutas
- ✅ **docs-lint:** 0 errores de documentación
- ✅ **run-autofix:** 0 warnings de calidad
- ✅ **cleanup:** Workspace completamente limpio

### **Verificaciones MCP**
- ✅ **Agentes core:** 3/3 healthy
- ✅ **Benchmarks:** 100% de éxito
- ✅ **Orquestador:** Funcionando correctamente
- ✅ **Linters:** 0 errores, 0 warnings

## 🎯 RECOMENDACIONES ESPECÍFICAS

### **Para Reestructuración de Archivos**
1. **Usar path-lint.mjs** después de cada movimiento de archivos
2. **Usar docs-lint.mjs** para validar documentación actualizada
3. **Usar run-autofix.mjs** para correcciones automáticas de código
4. **Usar preview-diff.mjs** antes de commits importantes
5. **Usar cleanup.mjs** al final de cada fase

### **Para Validación MCP**
1. **Usar bench-agents.mjs** para verificar rendimiento
2. **Usar orchestration/orchestrator.js health** para health checks
3. **Usar verify-metrics.mjs** para validar métricas
4. **Usar sarif-aggregate.mjs** para reportes consolidados

### **Para Limpieza y Mantenimiento**
1. **Usar cleanup.mjs** regularmente
2. **Usar run-codemods.sh** para refactoring automático
3. **Usar generate-sbom.sh** para inventario de dependencias
4. **Usar node-audit.sh** para seguridad

---

**Estas herramientas proporcionan un conjunto completo para ejecutar la reestructuración de manera segura, validada y automatizada, manteniendo la integridad del sistema MCP.**
