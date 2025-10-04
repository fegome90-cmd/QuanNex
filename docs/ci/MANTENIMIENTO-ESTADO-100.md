# 🧩 Cómo Mantener Este Estado - Sistema OPA

**Versión**: 1.0  
**Fecha**: 2025-10-04  
**Propósito**: Guía para mantener el estado 100% estable del sistema OPA

## 🎯 Objetivo

Para que este **100% se conserve estable**, se requiere un mantenimiento sistemático y programado que garantice la integridad de las garantías estructurales.

## 📋 Tabla de Mantenimiento

| Mantenimiento | Responsable Sugerido | Frecuencia | Entregable |
|---------------|---------------------|------------|------------|
| **Verificar integridad de evidencia** (`docs/evidencias/ci/`) | QA Lead | Trimestral | `CI-EVID-CHECK.md` |
| **Revisar mensajes de gates ↔ RUNBOOK** | Gate Steward | Trimestral | Registro de ajustes menores |
| **Auditar métricas en Grafana** (`opa_plan_active`, etc.) | DevOps | Mensual | Screenshot + export JSON |
| **Actualizar post-mortem / lecciones aprendidas** | Comité de Gates | Trimestral | Addendum `POSTMORTEM-ROLLBACKS.md` |
| **Validar indicadores de salud** (< 5 fallos/mes, etc.) | Auditor Interno | Trimestral | Reporte de indicadores |
| **Firmar revisión trimestral** | Stakeholder Designado | Trimestral | "Acta de revisión" en `PLAN-REVISION-TRIMESTRAL.md` |

## 🔍 Detalle de Mantenimientos

### **1. Verificar Integridad de Evidencia**
**Responsable**: QA Lead  
**Frecuencia**: Trimestral  
**Entregable**: `CI-EVID-CHECK.md`

#### **Checklist de Verificación**
- [ ] **Estructura de carpetas** intacta en `docs/evidencias/ci/`
- [ ] **Plantillas resumen.md** actualizadas y consistentes
- [ ] **Capturas y logs** disponibles para casos críticos
- [ ] **Enlaces desde EVIDENCIAS-OPA.md** funcionando
- [ ] **Versionado** de evidencias correcto
- [ ] **Accesibilidad** de archivos verificada

#### **Plantilla CI-EVID-CHECK.md**
```markdown
# Verificación de Integridad de Evidencia - Q[X] 2025

## Resumen
- Fecha de verificación: [DD/MM/YYYY]
- Responsable: [Nombre]
- Estado general: ✅/⚠️/❌

## Estructura Verificada
- [ ] docs/evidencias/ci/2025-XX-XX_main-verify/
- [ ] docs/evidencias/ci/2025-XX-XX_canary-rename-ok/
- [ ] docs/evidencias/ci/2025-XX-XX_canary-mass-delete-deny/
- [ ] docs/evidencias/ci/2025-XX-XX_canary-sensitive-path-deny/

## Problemas Encontrados
- [Lista de problemas]

## Acciones Tomadas
- [Lista de acciones]

## Próxima Verificación
- Fecha: [DD/MM/YYYY]
```

### **2. Revisar Mensajes de Gates ↔ RUNBOOK**
**Responsable**: Gate Steward  
**Frecuencia**: Trimestral  
**Entregable**: Registro de ajustes menores

#### **Checklist de Revisión**
- [ ] **Mensajes autoexplicativos** funcionando en workflows
- [ ] **Enlaces directos** al RUNBOOK, ADR y catálogo actualizados
- [ ] **Trazabilidad inversa** operativa
- [ ] **Consistencia** entre mensajes y documentación
- [ ] **Ajustes menores** documentados

#### **Registro de Ajustes Menores**
```markdown
# Registro de Ajustes - Q[X] 2025

## Ajustes Realizados
- [Fecha] - [Descripción del ajuste] - [Justificación]

## Enlaces Verificados
- [ ] RUNBOOK: docs/BAU/RUNBOOK-REANUDACION-OPA.md
- [ ] ADR: docs/adr/ADR-XXXX-opa-guards.md
- [ ] Catálogo: docs/policy/CATALOGO-REGLAS-OPA.md
```

### **3. Auditar Métricas en Grafana**
**Responsable**: DevOps  
**Frecuencia**: Mensual  
**Entregable**: Screenshot + export JSON

#### **Checklist de Auditoría**
- [ ] **Métrica `opa_plan_active`** visible y funcionando
- [ ] **Panel "OPA – Plan activo por entorno"** actualizado
- [ ] **Anotaciones** de cambios de plan registradas
- [ ] **Export JSON** de métricas disponible
- [ ] **Screenshot** del panel capturado

#### **Proceso de Captura**
1. **Acceder** al dashboard Grafana
2. **Capturar screenshot** del panel OPA
3. **Exportar JSON** de métricas del período
4. **Verificar anotaciones** de cambios
5. **Documentar** cualquier anomalía

### **4. Actualizar Post-Mortem / Lecciones Aprendidas**
**Responsable**: Comité de Gates  
**Frecuencia**: Trimestral  
**Entregable**: Addendum `POSTMORTEM-ROLLBACKS.md`

#### **Checklist de Actualización**
- [ ] **POSTMORTEM-ROLLBACKS.md** revisado
- [ ] **Lecciones aprendidas** del período incorporadas
- [ ] **Decisiones nuevas** documentadas
- [ ] **Acciones de mejora** identificadas
- [ ] **Addendum** creado si es necesario

#### **Plantilla de Addendum**
```markdown
# Addendum Q[X] 2025 - POSTMORTEM-ROLLBACKS.md

## Lecciones Aprendidas del Período
- [Lección 1]
- [Lección 2]

## Decisiones Nuevas
- [Decisión 1] - [Fecha] - [Responsable]

## Acciones de Mejora
- [Acción 1] - [Fecha límite] - [Responsable]
```

### **5. Validar Indicadores de Salud**
**Responsable**: Auditor Interno  
**Frecuencia**: Trimestral  
**Entregable**: Reporte de indicadores

#### **Indicadores a Validar**
- **Fallos de gates**: < 5 fallos/mes
- **Tiempo medio de bypass**: < 24 horas
- **Frecuencia de violaciones**: < 10 violaciones/mes
- **Efectividad de salvaguardas**: > 95% de detección

#### **Plantilla de Reporte**
```markdown
# Reporte de Indicadores - Q[X] 2025

## Resumen Ejecutivo
- Estado general: ✅/⚠️/❌
- Indicadores dentro de umbral: X/4

## Indicadores Detallados
| Indicador | Umbral | Valor Actual | Estado |
|-----------|--------|--------------|--------|
| Fallos de gates | < 5/mes | [X] | ✅/⚠️/❌ |
| Tiempo bypass | < 24h | [X]h | ✅/⚠️/❌ |
| Violaciones | < 10/mes | [X] | ✅/⚠️/❌ |
| Efectividad | > 95% | [X]% | ✅/⚠️/❌ |

## Acciones Requeridas
- [Lista de acciones]
```

### **6. Firmar Revisión Trimestral**
**Responsable**: Stakeholder Designado  
**Frecuencia**: Trimestral  
**Entregable**: "Acta de revisión" en `PLAN-REVISION-TRIMESTRAL.md`

#### **Proceso de Firma**
1. **Revisar** todos los entregables del trimestre
2. **Validar** cumplimiento de indicadores
3. **Aprobar** acciones y compromisos
4. **Firmar** acta de revisión
5. **Programar** próxima revisión

## 🎯 Criterios de Éxito

### **Estado Estable Mantenido**
- [ ] **Todos los indicadores** dentro de umbral
- [ ] **Evidencia persistente** intacta y accesible
- [ ] **Mensajes autoexplicativos** funcionando
- [ ] **Métricas** visibles y actualizadas
- [ ] **Post-mortem** actualizado con lecciones
- [ ] **Acta de revisión** firmada y archivada

### **Sello Audit-Proof Conservado**
- [ ] **Trazabilidad técnica** completa
- [ ] **Evidencia duradera** disponible
- [ ] **Memoria institucional** actualizada
- [ ] **Gobernanza predecible** funcionando

## 🚨 Escalamiento

### **Nivel 1: Mantenimiento Normal**
- **Responsable**: Roles asignados
- **Acción**: Completar checklist de mantenimiento
- **Resultado**: Entregables generados

### **Nivel 2: Atención Requerida**
- **Responsable**: Gate Steward + equipo
- **Acción**: Análisis de desviaciones
- **Resultado**: Plan de corrección

### **Nivel 3: Revalidación Crítica**
- **Responsable**: Stakeholder Designado + comité
- **Acción**: Revalidación completa del sistema
- **Resultado**: Actualización de procesos

## 📅 Calendario de Mantenimiento

### **Mensual (DevOps)**
- **Día 15**: Auditar métricas en Grafana
- **Entregable**: Screenshot + export JSON

### **Trimestral (Todos)**
- **Q1**: 15 de enero
- **Q2**: 15 de abril
- **Q3**: 15 de julio
- **Q4**: 15 de octubre

### **Entregables Trimestrales**
- **QA Lead**: `CI-EVID-CHECK-Q[X]-2025.md`
- **Gate Steward**: Registro de ajustes menores
- **Comité de Gates**: Addendum `POSTMORTEM-ROLLBACKS.md`
- **Auditor Interno**: Reporte de indicadores
- **Stakeholder**: Acta de revisión firmada

---

**Estado**: 🧩 **MANTENIMIENTO ESTADO 100%**  
**Responsable**: Stakeholder Designado  
**Próxima revisión**: 15 de enero de 2025
