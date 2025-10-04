# 🅿️ Estacionamiento Seguro OPA - Decisiones Documentadas

**Fecha**: 2025-10-04  
**Propósito**: Documentar decisiones tomadas y estado actual sin ejecutar cambios

## 📋 Estado Actual (Estable)

### **✅ Plan A (Pinned)**
- **Estado**: Implementado y funcional
- **Características**: OPA local con checksum + retry, cache por versión
- **Uso**: Producción principal
- **Dependencias**: `git`, `jq`, `curl`, `tar`, `sha256sum`

### **✅ Plan B (Container)**
- **Estado**: Implementado y funcional
- **Características**: OPA en contenedor con `docker run`
- **Uso**: Debug/emergencia, fallback de Plan A
- **Dependencias**: `docker`, `git`, `jq` (en runner)

### **✅ Plan C (Fallback)**
- **Estado**: Implementado y funcional
- **Características**: Bash puro, siempre funciona
- **Uso**: Último recurso, emergencias totales
- **Dependencias**: Solo bash y herramientas básicas

---

## 🔧 Política Rego (Estado Estable)

### **Compatibilidad OPA 0.58.0**
- **Sintaxis corregida**: `p := input.files[_]` (no `some p in input.files`)
- **Conflicto resuelto**: Eliminado `default deny = []` que conflictuaba con `deny[msg]`
- **Funciones implementadas**:
  - `has_label(l)`: Verifica si existe una label específica
  - `is_sensitive[p]`: Identifica archivos en rutas sensibles
  - `deny[msg]`: Reglas de violación con mensajes descriptivos

### **Reglas Implementadas**
1. **Rutas sensibles**: Requiere label `critical` + CODEOWNERS
2. **Deleciones masivas**: Requiere label `rollback` + CODEOWNERS
3. **Umbrales**: 25 archivos eliminados, rutas `rag/`, `.github/workflows/`, `ops/`, `core/`

---

## 📄 Data.yaml (Desactivación Temporal)

### **Problema Detectado**
- **Formato inconsistente**: `sensitive_globs: []` vacío
- **Merge error**: OPA no puede procesar el YAML generado
- **Validación faltante**: No hay esquema definido

### **Decisión Tomada**
- **Estado**: Desactivado temporalmente en Plan B
- **Razón**: Evitar fallos en CI hasta validación completa
- **Fallback**: Usar valores hardcodeados en Rego

### **Plan de Reintroducción**
1. **Definir esquema** (YAML/JSON Schema)
2. **Validación previa** antes de evaluar Rego
3. **Fallback automático** si validación falla
4. **Testing exhaustivo** antes de activar

---

## 🎛️ Switchboard (Decisión Operativa)

### **Configuración de Producción**
- **Plan A**: Principal (OPA pinned)
- **Plan B**: Condicional (`USE_OPA_CONTAINER=true`)
- **Plan C**: Manual/dispatch solo

### **Configuración de Debug/Emergencia**
- **Plan A**: Desactivado
- **Plan B**: Activo
- **Plan C**: Disponible

### **Control por Variables**
```yaml
jobs:
  opa:
    if: ${{ vars.USE_OPA_CONTAINER == 'true' }}
```

### **Responsabilidades**
- **Cambio de variables**: Solo mantenedores principales
- **Activación Plan B**: En caso de fallo de Plan A
- **Activación Plan C**: Solo en emergencias totales

---

## 📊 Evidencias y Trazabilidad

### **Casos de Prueba Documentados**
- **SENS-1**: Ruta sensible sin `critical` → DENY
- **SENS-2**: Ruta sensible con `critical` → ALLOW
- **MASS-1**: Deleciones masivas sin `rollback` → DENY
- **MASS-2**: Deleciones masivas con `rollback` → ALLOW

### **Referencias a Capturar**
- [ ] **Run IDs** de cada caso de prueba
- [ ] **URLs de PRs** utilizadas para testing
- [ ] **Screenshots** de comentarios automáticos
- [ ] **Logs** de workflows exitosos

### **Archivo de Evidencias**
- **Ubicación**: `docs/ci/EVIDENCIAS-OPA.md`
- **Formato**: Tabla con Run ID, URL, Resultado, Screenshot
- **Actualización**: Cada vez que se ejecuten pruebas

---

## 🚀 To-Do al Levantar Freeze (Orden Exacto)

### **1. Reintegrar data.yaml**
- [ ] Definir esquema YAML/JSON Schema
- [ ] Implementar validación previa
- [ ] Añadir fallback automático
- [ ] Testing exhaustivo
- [ ] Activar en Plan A/B

### **2. Pin por Digest**
- [ ] Obtener digest SHA256 de `openpolicyagent/opa:0.58.0`
- [ ] Cambiar tag por digest en Plan B
- [ ] Documentar en `docs/ci/IMAGENES-PINNED.md`

### **3. OPA Unit Tests**
- [ ] Crear `policies/tests/*.rego`
- [ ] Documentar job `opa test`
- [ ] Integrar en CI pipeline

### **4. SARIF (Opcional)**
- [ ] Convertir violaciones a formato SARIF
- [ ] Subir a Security tab de GitHub
- [ ] Configurar alertas

### **5. Digest de Acciones**
- [ ] Pinar `actions/checkout` a SHA
- [ ] Pinar `actions/cache` a SHA
- [ ] Pinar `actions/github-script` a SHA

### **6. Scorecard**
- [ ] Activar workflow semanal
- [ ] Configurar objetivo ≥7/10
- [ ] Documentar métricas

---

## ⚠️ Riesgos Conocidos y Mitigaciones

### **Flaky de Red**
- **Riesgo**: Fallo al descargar contenedor OPA
- **Mitigación**: Retry simple de `docker pull` (3 intentos con backoff)
- **Implementación**: Documentar en troubleshooting

### **Labels No Visibles en Forks**
- **Riesgo**: Labels vacías en eventos de PRs de forks
- **Mitigación**: Fallback a API de GitHub para obtener labels
- **Implementación**: Step adicional si `labels[]` viene vacío

### **Drift de Políticas**
- **Riesgo**: Inconsistencia entre Plan A/B/C
- **Mitigación**: Mismo `input.json` y carpeta `policies/` para todos
- **Verificación**: Smoke test local antes de cada deploy

---

## 📝 Documentos Pendientes

### **Esqueletos a Crear**
- [ ] `docs/ci/EVIDENCIAS-OPA.md` - Tabla de evidencias
- [ ] `docs/ci/CATALOGO-REGLAS-OPA.md` - Catálogo de reglas
- [ ] `docs/ci/DATA-YAML-ESPEC.md` - Especificación de data.yaml
- [ ] `docs/ci/IMAGENES-PINNED.md` - Registro de imágenes pinned

### **Contenido de Cada Documento**
- **EVIDENCIAS-OPA.md**: Tabla con Run ID, URL, Resultado, Screenshot
- **CATALOGO-REGLAS-OPA.md**: Descripción detallada de cada regla
- **DATA-YAML-ESPEC.md**: Esquema y validación de data.yaml
- **IMAGENES-PINNED.md**: Registro de digests SHA256

---

## 🛡️ Tabla de Control de Resiliencia

Para garantizar que el estacionamiento sea resiliente y no dependa de memoria/disciplina humana:

| Salvaguarda | Ticket | Estado | Responsable | Fecha Objetivo | Evidencia Requerida |
|-------------|--------|--------|-------------|----------------|-------------------|
| **Métrica Prometheus** | OBS-OPA-050 | Pendiente | @fegome90-cmd | - | Métrica visible en Prometheus |
| **Panel Grafana** | DASH-OPA-051 | Pendiente | @fegome90-cmd | - | Panel activo con datos |
| **Test Anti-data.yaml** | QA-OPA-031 | Pendiente | @fegome90-cmd | - | Script fallando correctamente |
| **Data.yaml Validación** | SEC-OPA-012 | Pendiente | @fegome90-cmd | - | Validación funcionando |
| **Pin por Digest** | CI-OPA-045 | Pendiente | @fegome90-cmd | - | Digest SHA256 en workflow |
| **OPA Unit Tests** | QA-OPA-032 | Pendiente | @fegome90-cmd | - | Tests verdes en CI |

### **Criterios de Resiliencia Completada**
- [ ] **Observabilidad**: Métrica visible en Grafana (OBS-OPA-050, DASH-OPA-051)
- [ ] **Salvaguarda Técnica**: Test anti-data.yaml funcionando (QA-OPA-031)
- [ ] **Gobernanza**: Todos los tickets creados y referenciados

---

**Estado**: 🅿️ **ESTACIONADO SEGURO**  
**Responsable**: @fegome90-cmd  
**Próxima acción**: Crear tickets con IDs reales y completar tabla de control
