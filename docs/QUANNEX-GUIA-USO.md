# 📖 QuanNex - Guía de Uso

**Sistema de validación automática de reportes con gates anti-alucinación**

---

## 🚀 **CÓMO ACTIVAR QUANNEX**

### **1. En Cursor (Recomendado)**

#### **Custom Command**
```bash
# En Cursor, usa el Custom Command:
quannex-validate reports/mi-informe.md
```

#### **O desde terminal:**
```bash
npm run quanNex:validate reports/mi-informe.md
```

### **2. Git Hooks Automáticos**

#### **Activar pre-commit hook:**
```bash
# Agregar al pre-commit existente
echo "./.git/hooks/pre-commit-quannex" >> .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### **Validación manual:**
```bash
# Validar archivos antes de commit
./.git/hooks/pre-commit-quannex
```

### **3. Publicación Automática**

#### **Publicar con validación:**
```bash
npm run quanNex:publish reports/mi-informe.md
```

#### **Publicar con auto-commit:**
```bash
npm run quanNex:publish reports/mi-informe.md --auto-commit --push
```

### **4. Modo Watch (Desarrollo)**

#### **Monitorear cambios:**
```bash
npm run quanNex:watch reports/
```

---

## 📋 **CUÁNDO SE ACTIVA QUANNEX**

### **Automáticamente:**
- ✅ **En CI/CD**: Cada PR con archivos .md cambiados
- ✅ **Git hooks**: Antes de commit (si está activado)
- ✅ **Watch mode**: Al modificar archivos .md

### **Manualmente:**
- ✅ **Custom Command**: `quannex-validate <file>`
- ✅ **CLI directa**: `npm run quanNex:check -- --input <file>`
- ✅ **Wrapper bash**: `./bin/quannex-review.sh <file>`
- ✅ **Publicación**: `npm run quanNex:publish <file>`

---

## 🎯 **QUÉ VALIDA QUANNEX**

### **1. FactCheck (Datos Cuantitativos)**
- ✅ **Números con unidades** requieren citas: `[ref:fuente]`
- ✅ **Porcentajes** requieren citas: `50% [ref:fuente]`
- ✅ **Ignora años** automáticamente: `2025` (no requiere cita)
- ✅ **Configurable**: min_digits, window, units

### **2. Consistency (Consistencia)**
- ✅ **Resumen vs Total**: Números deben coincidir
- ✅ **Patrones configurables**: Desde YAML
- ✅ **Detección automática**: Entre secciones

### **3. Metrics (Métricas)**
- ✅ **Validación contra archivo**: `testdata/metrics.json`
- ✅ **Números verificados**: Contra métricas de referencia
- ✅ **Archivo configurable**: `--metrics custom.json`

### **4. Structure (Estructura)**
- ✅ **Secciones requeridas**: #, ## Resumen, ## Hallazgos, ## Métricas
- ✅ **Patrones configurables**: Desde YAML
- ✅ **Flexible**: Adaptable a diferentes formatos

---

## ⚙️ **CONFIGURACIÓN**

### **Archivo Principal: `quannex.config.yaml`**
```yaml
report_glob: "reports/**/*.md"
metrics_file: "testdata/metrics.json"
policy: "gates/review.policy.yaml"

detectors:
  factcheck:
    require_citation_near:
      units: "(%|USD|EUR|CLP|\\bmm\\b|\\bcm\\b|\\bms\\b|\\bps\\b)"
      window: 30
    ignore_years: true
    min_digits: 3
  thresholds:
    min_confidence: 0.90
```

### **Política: `gates/review.policy.yaml`**
```yaml
rules:
  factcheck: true
  consistency: true
  metrics: true
  structure: true

detectors:
  headings:
    resumen: "(?:Resumen|Sumario|Executive\\s+Summary)"
    total: "(?:Total|Cifra\\s+(?:global|total))"
```

---

## 📊 **EJEMPLOS DE USO**

### **1. Validación Básica**
```bash
# Validar un reporte
npm run quanNex:validate reports/analisis-q4.md

# Output:
# ✅ Report validation PASSED - Ready for publication!
```

### **2. Validación con Override**
```bash
# Usar política personalizada
./bin/quannex-review.sh reports/analisis.md custom-policy.yaml custom-metrics.json
```

### **3. Publicación Completa**
```bash
# Publicar con validación y commit automático
npm run quanNex:publish reports/analisis.md --auto-commit --push

# Output:
# 🔍 Step 1: QuanNex validation...
# ✅ Validation passed!
# 📊 Step 2: Generating report artifacts...
# ✅ Artifacts generated in .reports/published/
# 📝 Step 3: Auto-committing...
# ✅ Report committed successfully
# 🚀 Step 4: Pushing to remote...
# ✅ Report pushed to remote
# 🎉 Report published successfully!
```

### **4. Modo Watch**
```bash
# Monitorear directorio de reportes
npm run quanNex:watch reports/

# Output:
# 👀 QuanNex Watch Mode
# 📁 Watching directory: reports/
# ⏱️  Check interval: 5s
# 🔍 Validating 3 markdown files...
# ✅ PASSED: reports/analisis-q4.md
# ✅ PASSED: reports/resumen-mensual.md
# ❌ FAILED: reports/borrador.md
# 🎉 All reports passed validation!
# 🔄 Starting watch mode... (Press Ctrl+C to stop)
```

---

## 🛠️ **COMANDOS DISPONIBLES**

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `npm run quanNex:validate` | Validar reporte individual | `quannex-validate report.md` |
| `npm run quanNex:publish` | Publicar con validación | `quannex:publish report.md --auto-commit` |
| `npm run quanNex:watch` | Monitorear cambios | `quannex:watch reports/` |
| `npm run quanNex:check` | CLI directa | `quannex:check -- --input report.md` |
| `npm run quanNex:test` | Pruebas de aceptación | `quannex:test` |

---

## 🔧 **PERSONALIZACIÓN**

### **Cambiar Patrones (Sin tocar código)**
```yaml
# En quannex.config.yaml
detectors:
  factcheck:
    require_citation_near:
      units: "(%|USD|EUR|CLP|\\bmm\\b|\\bcm\\b|\\bms\\b|\\bps\\b)"  # Agregar más unidades
      window: 30  # Cambiar ventana de búsqueda
    min_digits: 3  # Cambiar mínimo de dígitos
```

### **Cambiar Umbrales**
```yaml
# En quannex.config.yaml
thresholds:
  min_confidence: 0.90  # Cambiar umbral de confianza
```

### **Activar/Desactivar Detectores**
```yaml
# En gates/review.policy.yaml
rules:
  factcheck: true      # Activar factcheck
  consistency: false   # Desactivar consistency
  metrics: true        # Activar metrics
  structure: true      # Activar structure
```

---

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **Error: "File not found"**
```bash
# Verificar que el archivo existe
ls -la reports/mi-informe.md

# Verificar que QuanNex está compilado
npm run build
```

### **Error: "Validation failed"**
```bash
# Ver detalles del error
./bin/quannex-review.sh reports/mi-informe.md

# Verificar configuración
cat quannex.config.yaml
```

### **Error: "Permission denied"**
```bash
# Dar permisos de ejecución
chmod +x bin/quannex-review.sh
chmod +x .cursor/commands/quannex-validate.sh
chmod +x scripts/publish-report.sh
```

---

## 📈 **INTEGRACIÓN CON CI/CD**

### **GitHub Actions (Ya configurado)**
- ✅ **Detección automática**: Archivos .md cambiados
- ✅ **Validación completa**: Todos los archivos
- ✅ **Falla al final**: Acumula resultados
- ✅ **Artifacts**: Reportes detallados

### **Configuración Manual**
```yaml
# En .github/workflows/custom.yml
- name: QuanNex Validation
  run: |
    npm run build
    npm run quanNex:validate reports/
```

---

## 🎯 **MEJORES PRÁCTICAS**

### **1. Estructura de Reportes**
```markdown
# Título del Reporte

## Resumen
Datos cuantitativos con citas: 100% [ref:fuente]

## Hallazgos
- Punto 1
- Punto 2

## Métricas
- **Métrica 1**: 250 [ref:fuente]
- **Métrica 2**: 75% [ref:fuente]

## Total
El total es 250, consistente con el resumen.
```

### **2. Citas Requeridas**
```markdown
# ✅ CORRECTO
- **Errores**: 176 → 0 (100% eliminación) [ref:metrics.json]
- **Tiempo**: 2 minutos (120,000 ms) [ref:performance.json]

# ❌ INCORRECTO
- **Errores**: 176 → 0 (100% eliminación)
- **Tiempo**: 2 minutos (120,000 ms)
```

### **3. Consistencia**
```markdown
# ✅ CORRECTO
## Resumen
El total de problemas se redujo de 578 a 284.

## Total
El total de problemas se redujo de 578 a 284.

# ❌ INCORRECTO
## Resumen
El total de problemas se redujo de 578 a 284.

## Total
El total de problemas se redujo de 500 a 200.
```

---

## 🎉 **¡LISTO PARA USAR!**

QuanNex está completamente configurado y listo para validar tus reportes automáticamente. Solo necesitas:

1. **Escribir tu reporte** en markdown
2. **Ejecutar validación**: `npm run quanNex:validate report.md`
3. **Corregir issues** si los hay
4. **Publicar**: `npm run quanNex:publish report.md --auto-commit`

**¡Tu sistema de calidad de reportes está activo! 🚀**
