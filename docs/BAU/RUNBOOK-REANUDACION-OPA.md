# RUNBOOK – Reanudación OPA y Estacionamiento Resiliente

> Estado actual: Plan B (container via `docker run`) estable. `data.yaml` desactivado temporalmente por decisión explícita.

## 0) Propósito
Reanudar el trabajo de políticas OPA sin sorpresas ni deuda oculta: qué activar, en qué orden, qué salvaguardas desactivar/modificar y cómo verificar.

---

## A) Preconditions (sin ejecutar código)
- Freeze de Git cerrado ✔︎/✘
- Ramas de rollback: snapshot/tag + eliminación remota ✔︎/✘
- Último `verify` + guards + OPA en `main` OK (evidencia en `EVIDENCIAS-OPA.md`) ✔︎/✘

---

## B) Salvaguardas activas (y cómo se desactivan/modifican)

1. **Test anti–`data.yaml`**  
   - Objetivo: impedir uso de `-d data.yaml` sin validación de esquema  
   - Ticket: **QA-OPA-031**  
   - Acción al reanudar: desactivar/modificar **solo después** de agregar "validate-data-yaml" y esquema aprobado (ver Sección C.1)  
   - Evidencia requerida: PR con paso de validación + referencia al ticket

2. **Switch de plan OPA**  
   - Variable: `USE_OPA_CONTAINER`  
   - Métrica: `opa_plan_active{env,repo,plan}` (Prometheus)  
   - Tickets: **OBS-OPA-050** (métrica), **DASH-OPA-051** (panel)  
   - Acción al reanudar: mantener métrica visible; opcionalmente poner Plan A como default

---

## C) Checklist técnico (To-Do **con tickets**)

- [ ] **Reintroducir `data.yaml` con validación de esquema**  
  - Definir esquema y step "validate-data-yaml"  
  - Inyectar `-d data.yaml` en Plan A/B solo si la validación pasa  
  - Tickets: **SEC-OPA-012**, **CI-OPA-044**  
  - Evidencia: runs verdes + caso de validación fallida con fallback a defaults

- [ ] **Pin por digest** de imagen en Plan B  
  - Reemplazar `openpolicyagent/opa:0.58.0` → `openpolicyagent/opa@sha256:<digest>`  
  - Ticket: **CI-OPA-045**  
  - Evidencia: diff del workflow + run ID

- [ ] **OPA unit tests** (`opa test` en `policies/tests/*`)  
  - Casos minimos: SensitivePath ±critical, MassDeletion ±rollback  
  - Ticket: **QA-OPA-032**  
  - Evidencia: salida de `opa test` + enlace de CI

- [ ] **Métrica y dashboard del switch**  
  - Publicar `opa_plan_active{env,repo,plan}` en CI (Pushgateway/collector)  
  - Panel Grafana "OPA – Plan activo por entorno"  
  - Tickets: **OBS-OPA-050**, **DASH-OPA-051**  
  - Evidencia: screenshot/panel link en `EVIDENCIAS-OPA.md`

- [ ] **(Opcional)** SARIF para violaciones OPA  
  - Subir a Security tab con `upload-sarif`  
  - Ticket: **SEC-OPA-060**

---

## D) Observabilidad del Switch

**Métrica canónica:**  
`opa_plan_active{env="<dev|stg|prod>", repo="<org/repo>", plan="<A|B|C>"} 1|0`

**Requisitos de panel (Grafana):**  
- Tabla "Plan activo por entorno" (última muestra por env)  
- Serie temporal apilada por plan (sum by(plan, env))  
- Anotaciones al cambiar de plan (PR/Run IDs)

---

## E) Criterios de aceptación para reanudación

1. `data.yaml` validado, paso "validate-data-yaml" activo, test anti–`data.yaml` actualizado/eliminado (tickets **SEC-OPA-012**, **CI-OPA-044**, **QA-OPA-031** resueltos)  
2. Métrica `opa_plan_active` visible en Grafana en todos los entornos (tickets **OBS-OPA-050**, **DASH-OPA-051** resueltos)  
3. `opa test` verde con la matriz mínima (**QA-OPA-032**)  
4. Canarios post-cambios en verde y registrados en `EVIDENCIAS-OPA.md`
5. **Post-mortem de proceso comunicado y linkeado** en `docs/auditoria/POSTMORTEM-ROLLBACKS.md`

**Rollback plan:**  
- Quitar `-d data.yaml` (fallback a defaults)  
- Forzar Plan B vía `USE_OPA_CONTAINER=true` (métrica debe reflejarlo)  
- Rehabilitar test anti–`data.yaml`

---

## F) Referencias

- `docs/policy/CATALOGO-REGLAS-OPA.md`  
- `docs/policy/DATA-YAML-ESPEC.md`  
- `docs/ci/EVIDENCIAS-OPA.md`  
- Tickets (actualizar con IDs reales): **QA-OPA-031**, **SEC-OPA-012**, **CI-OPA-044**, **CI-OPA-045**, **QA-OPA-032**, **OBS-OPA-050**, **DASH-OPA-051**, **SEC-OPA-060**

---

**Estado**: 📋 **RUNBOOK COMPLETO**  
**Responsable**: @fegome90-cmd  
**Próxima acción**: Crear tickets con IDs reales
