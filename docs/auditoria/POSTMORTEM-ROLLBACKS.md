# Post-mortem – Incidente de ramas de rollback masivo

**Fecha**: 2025-10-04  
**Propósito**: Análisis post-mortem del incidente de ramas de rollback masivo

## Resumen Ejecutivo

**Qué pasó**: Se detectaron múltiples ramas de rollback que eliminaron grandes porciones del código base sin seguir procesos de validación adecuados.

**Impacto**: Riesgo de pérdida de código, regresiones no detectadas, y violación de procesos de seguridad.

**Fechas clave**: 
- Detección: 2025-10-01
- Análisis: 2025-10-02
- Contención: 2025-10-03
- Estacionamiento resiliente: 2025-10-04

## Línea de Tiempo

**Hechos verificables (timestamps), ramas involucradas, merges/PRs:**

- **T+0**: Detección de ramas de rollback masivo
- **T+2h**: Análisis inicial con QuanNex
- **T+8h**: Implementación de contención (kill-switch, branch protection)
- **T+24h**: Análisis forense completo
- **T+48h**: Implementación de salvaguardas (guards, OPA)
- **T+72h**: Estacionamiento resiliente documentado

## Causas Raíz (5 Porqués / Causal Map)

### **Técnica(s)**
1. **¿Por qué se crearon ramas de rollback?** → Falta de validación automática
2. **¿Por qué no se detectó antes?** → Ausencia de guards de protección
3. **¿Por qué no se validó el impacto?** → Proceso manual sin automatización

### **Proceso/Organización (flujo, roles, incentivos)**
1. **¿Por qué se saltaron procesos?** → Presión por tiempo/urgencia
2. **¿Por qué no hubo revisión?** → Falta de CODEOWNERS efectivos
3. **¿Por qué no se documentó?** → Ausencia de rituales obligatorios

### **Comunicación (expectativas, rituales)**
1. **¿Por qué no se comunicó el cambio?** → Falta de canales establecidos
2. **¿Por qué no se validó con stakeholders?** → Ausencia de proceso de aprobación

## Qué Funcionó / Qué No Funcionó

### **✅ Qué Funcionó**
- Detección temprana con QuanNex
- Análisis forense sistemático
- Implementación rápida de contención
- Documentación exhaustiva del incidente

### **❌ Qué No Funcionó**
- **Defensas que fallaron**: Ausencia de guards automáticos
- **Defensas que no existían**: Validación de impacto, rituales obligatorios
- **Procesos inadecuados**: Revisión manual, comunicación reactiva

## Decisiones y Acciones

### **Acciones Inmediatas (hechas)**
- [x] Kill-switch de autofix
- [x] Branch protection rules
- [x] Cuarentena de ramas sospechosas
- [x] Análisis forense completo

### **Acciones de Proceso (nuevos rituales, governance)**
- [x] Implementación de guards automáticos
- [x] Políticas OPA para validación
- [x] Rituales obligatorios para cambios masivos
- [x] CODEOWNERS efectivos

### **Cambios de Tooling/Política (gates graduales, OPA)**
- [x] Manual rollback guard
- [x] Policy scan automático
- [x] Meta-guard SHA-lock
- [x] Canarios de validación

## Propietarios y Fechas

### **RACI**
- **Responsable**: @fegome90-cmd
- **Aprobador**: [Pendiente]
- **Consultado**: Equipo de seguridad
- **Informado**: Stakeholders

### **Calendario**
- **Análisis**: 2025-10-02
- **Contención**: 2025-10-03
- **Implementación**: 2025-10-04
- **Validación**: [Post-freeze]
- **Comunicación**: [Post-freeze]

## Evidencias y Anexos

### **Links a Documentación**
- **RCA técnico**: `docs/analisis-ramas-rollback/`
- **RUNBOOK**: `docs/BAU/RUNBOOK-REANUDACION-OPA.md`
- **EVIDENCIAS-OPA**: `docs/ci/EVIDENCIAS-OPA.md`
- **Tickets**: `docs/ci/PLANTILLA-TICKETS-OPA.md`

### **Artefactos Técnicos**
- Análisis de ramas con QuanNex
- Scripts de contención y validación
- Políticas OPA implementadas
- Guards de protección

---

**Estado**: 📋 **POST-MORTEM COMPLETADO**  
**Responsable**: @fegome90-cmd  
**Próxima acción**: Comunicación y difusión del post-mortem
