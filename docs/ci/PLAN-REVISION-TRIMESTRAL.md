# 📅 Plan de Revisión Trimestral - OPA Estacionamiento Resiliente

**Fecha**: 2025-10-04  
**Propósito**: Plan de revisión trimestral para mantener el sello audit-proof

## 🗓️ Calendario de Revisiones

### **Q1 2025** (Enero)
- **Fecha**: 15 de enero de 2025
- **Responsable**: @fegome90-cmd
- **Duración**: 2 horas

### **Q2 2025** (Abril)
- **Fecha**: 15 de abril de 2025
- **Responsable**: @fegome90-cmd
- **Duración**: 2 horas

### **Q3 2025** (Julio)
- **Fecha**: 15 de julio de 2025
- **Responsable**: @fegome90-cmd
- **Duración**: 2 horas

### **Q4 2025** (Octubre)
- **Fecha**: 15 de octubre de 2025
- **Responsable**: @fegome90-cmd
- **Duración**: 2 horas

## 📊 Indicadores de Salud a Monitorear

### **1. Fallos de Gates**
- **Métrica**: Número de fallos por mes
- **Umbral**: < 5 fallos/mes
- **Acción si excede**: Revisar configuración de gates

### **2. Tiempo Medio de Bypass**
- **Métrica**: Tiempo promedio para resolver violaciones
- **Umbral**: < 24 horas
- **Acción si excede**: Revisar proceso de resolución

### **3. Frecuencia de Violaciones**
- **Métrica**: Violaciones por tipo por mes
- **Umbral**: < 10 violaciones/mes total
- **Acción si excede**: Revisar políticas y entrenamiento

### **4. Efectividad de Salvaguardas**
- **Métrica**: % de violaciones detectadas vs. total
- **Umbral**: > 95% de detección
- **Acción si excede**: Revisar configuración de OPA

## 🔍 Checklist de Revisión Trimestral

### **Documentación**
- [ ] **POSTMORTEM-ROLLBACKS.md** actualizado con lecciones aprendidas
- [ ] **EVIDENCIAS-OPA.md** con nuevas evidencias si las hay
- [ ] **RUNBOOK-REANUDACION-OPA.md** actualizado si hay cambios

### **Indicadores de Salud**
- [ ] **Fallos de gates** dentro del umbral
- [ ] **Tiempo medio de bypass** dentro del umbral
- [ ] **Frecuencia de violaciones** dentro del umbral
- [ ] **Efectividad de salvaguardas** dentro del umbral

### **Panel Prometheus/Grafana**
- [ ] **Métrica `opa_plan_active`** visible y funcionando
- [ ] **Panel "OPA – Plan activo por entorno"** actualizado
- [ ] **Anotaciones** de cambios de plan registradas

### **Procesos**
- [ ] **Tickets enlazados** actualizados con URLs reales
- [ ] **Evidencias persistentes** creadas para nuevos casos
- [ ] **Mensajes autoexplicativos** funcionando en workflows

## 🚨 Criterios de Activación del Loop de Revalidación

### **Cambios Significativos que Activan Revalidación**
1. **Fallos de gates** > 10 en un mes
2. **Tiempo medio de bypass** > 48 horas
3. **Frecuencia de violaciones** > 20 en un mes
4. **Efectividad de salvaguardas** < 90%
5. **Cambios en el equipo** responsable
6. **Cambios en la infraestructura** CI/CD

### **Proceso de Revalidación Automático**
1. **Detección** de cambio significativo
2. **Notificación** al responsable
3. **Análisis** de causas raíz
4. **Actualización** de documentación
5. **Implementación** de mejoras
6. **Comunicación** a stakeholders

## 📋 Plantilla de Reporte Trimestral

```markdown
# Reporte Trimestral QX 2025 - OPA Estacionamiento Resiliente

## Resumen Ejecutivo
- Estado general: ✅ Estable / ⚠️ Atención / ❌ Crítico
- Indicadores dentro de umbral: X/4
- Acciones requeridas: [Lista]

## Indicadores de Salud
- Fallos de gates: X (umbral: <5)
- Tiempo medio de bypass: X horas (umbral: <24)
- Frecuencia de violaciones: X (umbral: <10)
- Efectividad de salvaguardas: X% (umbral: >95)

## Panel Prometheus/Grafana
- Métrica opa_plan_active: ✅ Funcionando
- Panel OPA: ✅ Actualizado
- Anotaciones: ✅ Registradas

## Acciones Tomadas
- [Lista de acciones implementadas]

## Próximos Pasos
- [Lista de próximas acciones]

## Sello Audit-Proof
- ✅ Mantenido / ⚠️ Revisión requerida / ❌ Revalidación activada
```

## 🔄 Proceso de Escalamiento

### **Nivel 1: Revisión Normal**
- **Responsable**: @fegome90-cmd
- **Acción**: Completar checklist trimestral
- **Resultado**: Reporte trimestral

### **Nivel 2: Atención Requerida**
- **Responsable**: @fegome90-cmd + equipo
- **Acción**: Análisis de causas raíz
- **Resultado**: Plan de mejora

### **Nivel 3: Revalidación Crítica**
- **Responsable**: @fegome90-cmd + stakeholders
- **Acción**: Revalidación completa del sistema
- **Resultado**: Actualización de procesos y documentación

## 📅 Recordatorios Automáticos

### **1 Mes Antes**
- Notificación para preparar datos
- Revisión de indicadores previos
- Preparación de documentación

### **1 Semana Antes**
- Recordatorio de revisión programada
- Acceso a paneles y métricas
- Preparación de checklist

### **1 Día Después**
- Recordatorio para completar reporte
- Envío de reporte a stakeholders
- Programación de próxima revisión

---

**Estado**: 📅 **PLAN DE REVISIÓN TRIMESTRAL**  
**Responsable**: @fegome90-cmd  
**Próxima revisión**: 15 de enero de 2025
