# 🧲 Gate de "Parking Sign-off" - OPA

**Fecha**: 2025-10-04  
**Propósito**: Gate de firma para oficializar el estacionamiento resiliente de OPA

## ✅ Checklist de "Parking Sign-off"

### **1. Tickets Creados y Enlazados**

- [ ] **RUNBOOK actualizado** con URLs reales en secciones C/F:
  - `OBS-OPA-050`: Métrica Prometheus
  - `DASH-OPA-051`: Panel Grafana  
  - `QA-OPA-031`: Test anti-data.yaml
  - `SEC-OPA-012`: Data.yaml validación
  - `CI-OPA-044`: Validación de esquema
  - `CI-OPA-045`: Pin por digest
  - `QA-OPA-032`: OPA unit tests
  - `SEC-OPA-060`: SARIF opcional

- [ ] **VALIDACION-FINAL-OPA.md** actualizado con enlaces a tickets
- [ ] **ESTACIONAMIENTO-SEGURO-OPA.md** actualizado con enlaces a tickets

### **2. Salvaguarda "Doc→Prueba" Declarada**

- [ ] **RUNBOOK (B.1)** especifica claramente:
  - Test anti-`data.yaml` es **bloqueo temporal**
  - Solo se retira **tras validación de esquema**
  - Evidencia requerida: PR con paso de validación

### **3. Visibilidad del Switch Comprometida**

- [ ] **RUNBOOK (D)** compromete métrica `opa_plan_active{env,repo,plan}`
- [ ] **EVIDENCIAS-OPA.md** compromete panel Grafana
- [ ] **Tickets OBS-OPA-050** y **DASH-OPA-051** creados con criterios claros

### **4. Evidencia Persistente y Post-Mortem**

- [ ] **Evidencia persistente** (capturas/logs) adjunta en `docs/evidencias/ci/*`
- [ ] **Post-mortem de proceso** enlazado en `docs/auditoria/POSTMORTEM-ROLLBACKS.md`

---

## 🎯 Estado para Stakeholders

> **OPA – Estado "Aparcado con Resiliencia"**
>
> * Documentación completa y salvaguardas activas por diseño.
> * "Switch" de plan expuesto vía tickets de métrica/panel.
> * "Doc → Prueba": test anti-`data.yaml` obliga reintroducción consciente.
> * Próximo movimiento requiere solo enlazar tickets reales; cero ejecución hasta cierre de Git.

---

## ✅ Sign-off

**Responsable**: @fegome90-cmd  
**Fecha de Sign-off**: [PENDIENTE]  
**Estado**: 🅿️ **APARCADO CON RESILIENCIA**

---

**Estado**: 🧲 **GATE DE FIRMA**  
**Próxima acción**: Crear tickets y enlazar URLs reales
