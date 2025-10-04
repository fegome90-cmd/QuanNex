# ✅ Validación Final OPA - Checklist para CI

**Fecha**: 2025-10-04  
**Propósito**: Checklist de validación final antes de activar OPA en CI

## 🔍 Checklist de Validación

### **📌 Pin de Imagen por Digest**
- [ ] **Cambiar tag por digest**: `openpolicyagent/opa:0.58.0` → `openpolicyagent/opa@sha256:<digest>`
- [ ] **Evitar tag drift**: Usar digest SHA256 para máxima inmutabilidad
- [ ] **Documentar digest**: Registrar en `docs/ci/IMAGENES-PINNED.md`

### **🔒 Permisos Mínimos**
- [x] **contents: read** - Para checkout y lectura de archivos
- [x] **pull-requests: write** - Para comentarios automáticos
- [x] **actions: read** - Para logs y debugging
- [x] **security-events: write** - Para SARIF (opcional)

### **⏱️ Timeouts y Concurrency**
- [x] **timeout-minutes: 5** - Evita jobs colgados
- [x] **concurrency.cancel-in-progress: true** - Evita ejecuciones paralelas

### **🔍 Logs de Diagnóstico**
- [x] **Paso Diagnostics implementado** - Verificación de entorno
- [ ] **Desactivar por defecto** - Solo activar en debug/emergencia
- [ ] **Documentar activación** - Cuándo y cómo activar

### **💬 Comentarios de Violaciones**
- [x] **Formato uniforme** - "Pinned/Container/Fallback"
- [x] **Información clara** - Violaciones específicas listadas
- [x] **Acción requerida** - Qué hacer para resolver

---

## 🧪 Matriz de Pruebas (Solo Documentación)

| Caso | Labels | Files | Deleted Files | Esperado | Descripción |
|------|--------|-------|---------------|----------|-------------|
| SENS-1 | [] | ["rag/a.ts"] | [] | DENY | Ruta sensible sin label critical |
| SENS-2 | ["critical"] | ["rag/a.ts"] | [] | ALLOW | Ruta sensible con label critical |
| MASS-1 | [] | [] | 30 | DENY | Deleciones masivas sin label rollback |
| MASS-2 | ["rollback"] | [] | 30 | ALLOW | Deleciones masivas con label rollback |
| MIX-1 | ["critical"] | ["rag/a.ts"] | 30 | DENY | Ruta sensible + deleciones masivas (falta rollback) |
| MIX-2 | ["critical", "rollback"] | ["rag/a.ts"] | 30 | ALLOW | Ambas condiciones cumplidas |

---

## 📊 Evidencias Requeridas

### **Capturas/IDs de Runs**:
- [ ] **Violación ruta sensible**: PR sin `critical` que toque `rag/` o `.github/workflows/`
- [ ] **Violación deleciones masivas**: PR sin `rollback` que elimine >25 archivos
- [ ] **Caso ALLOW**: PR con labels correctas que pase todas las validaciones

### **Referencias a Guardar**:
- [ ] **Run IDs** de cada caso de prueba
- [ ] **URLs de PRs** utilizadas para testing
- [ ] **Screenshots** de comentarios automáticos
- [ ] **Logs** de workflows exitosos

---

## 🚨 Riesgos Conocidos y Mitigaciones

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

## ✅ Criterios de Aprobación

### **Aprobación Total**:
- [ ] Todos los items del checklist completados
- [ ] Evidencias documentadas
- [ ] Matriz de pruebas validada
- [ ] Riesgos mitigados

### **Aprobación Condicional**:
- [ ] 90% de items completados
- [ ] Evidencias básicas disponibles
- [ ] Riesgos identificados y documentados

### **No Aprobado**:
- [ ] < 90% de items completados
- [ ] Evidencias insuficientes
- [ ] Riesgos no mitigados

---

## 🔒 Resiliencia del Estacionamiento

Para garantizar que el estacionamiento no dependa de memoria/disciplina humana, se han implementado tres salvaguardas:

### **1. Métrica del Switch (Observabilidad)**
- **Métrica**: `opa_plan_active{env,repo,plan}` (Prometheus)
- **Panel**: Grafana "OPA – Plan activo por entorno"
- **Tickets**: **OBS-OPA-050**, **DASH-OPA-051**
- **Propósito**: Visibilidad operacional del plan activo en tiempo real

### **2. Test Anti-data.yaml (Salvaguarda Técnica)**
- **Script**: `scripts/integration-guard-data-yaml.sh`
- **Ticket**: **QA-OPA-031**
- **Propósito**: Fallar automáticamente si se usa `-d data.yaml` sin validación
- **Desactivación**: Solo después de implementar validación de esquema

### **3. To-Do Formalizado (Gobernanza)**
- **Checklist**: 6 items con tickets específicos
- **Referencias**: Todos los tickets enlazados en RUNBOOK
- **Evidencias**: Cada item requiere evidencia específica
- **Propósito**: Sin deuda oculta, todo trackeable

### **Tabla de Control de Resiliencia**

| Salvaguarda | Ticket | Estado | Responsable | Fecha Objetivo |
|-------------|--------|--------|-------------|----------------|
| Métrica Prometheus | OBS-OPA-050 | Pendiente | @fegome90-cmd | - |
| Panel Grafana | DASH-OPA-051 | Pendiente | @fegome90-cmd | - |
| Test Anti-data.yaml | QA-OPA-031 | Pendiente | @fegome90-cmd | - |
| Data.yaml Validación | SEC-OPA-012 | Pendiente | @fegome90-cmd | - |
| Pin por Digest | CI-OPA-045 | Pendiente | @fegome90-cmd | - |
| OPA Unit Tests | QA-OPA-032 | Pendiente | @fegome90-cmd | - |

---

**Estado**: 🔄 **EN VALIDACIÓN**  
**Responsable**: @fegome90-cmd  
**Próxima revisión**: Al levantar freeze de Git
