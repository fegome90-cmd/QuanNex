# 📊 EVIDENCIAS – OPA Policies & Guards

**Fecha**: 2025-10-04  
**Propósito**: Demostrar que los 3 planes (A pinned, B container, C fallback) se comportan igual con el mismo `input.json`

## 1. Alcance
- Demostrar que los 3 planes (A pinned, B container, C fallback) se comportan igual con el mismo `input.json`
- Evidenciar bloqueos en:
  - Deleciones masivas sin `rollback`
  - Paths sensibles sin `critical`
- Evidenciar permisos mínimos, timeouts, concurrency y comentarios de violaciones en PR

## 2. Runs y artefactos (completados / pendientes)

| Caso | Plan | Run ID / URL | Estado | Notas |
|------|-----|---------------|--------|-------|
| Sensitive path sin `critical` | A | … | Pendiente | — |
| Sensitive path sin `critical` | B | … | Pendiente | — |
| Sensitive path sin `critical` | C | … | Pendiente | — |
| Deleciones > umbral sin `rollback` | A | … | Pendiente | — |
| Deleciones > umbral sin `rollback` | B | … | Pendiente | — |
| Renames docs (pasa) | A | … | Pendiente | — |
| Renames docs (pasa) | B | … | Pendiente | — |
| Renames docs (pasa) | C | … | Pendiente | — |

## 3. Evidencia de protecciones (capturas o links)
- Concurrency cancel-in-progress: …
- Timeouts: …
- Comentarios automáticos en PR (violaciones): …

## 4. Observabilidad del switch (métrica Prometheus)
**Métrica acordada:** `opa_plan_active{env="<env>",repo="<org/repo>",plan="<A|B|C>"}` (Gauge 0/1)  
**Panel Grafana:** "OPA – Plan activo por entorno" (tabla + gráfico de series)

> **Nota:** La publicación de la métrica se hará vía Pushgateway en CI/CD (ver RUNBOOK-REANUDACION-OPA.md)

### **Tickets de Observabilidad**
- **OBS-OPA-050**: Exponer métrica `opa_plan_active{env,repo,plan}` a Prometheus (Pushgateway/collector)
- **DASH-OPA-051**: Panel Grafana "OPA – Plan activo por entorno"

---

## 🔍 Smoke Test Local

### **Resultados del Último Smoke Test**
- **Fecha**: 2025-10-04T15:55:45Z
- **Plan A (OPA Local)**: ⚠️ NO DISPONIBLE (normal en desarrollo)
- **Plan B (Contenedor)**: ✅ FUNCIONANDO
- **Plan C (Bash Puro)**: ✅ FUNCIONANDO
- **Reporte**: `.smoke-test/results.md`

### **Input JSON del Test**
```json
{
  "labels": ["critical"],
  "files": [".github/CODEOWNERS", ".github/workflows/checks-all-green-v2.yml", ...],
  "deleted_files": ["OPERATIONS_PLAYBOOK_COMPLETE.md", "ROADMAP_RAG.md"]
}
```

### **Resultado Esperado vs Real**
- **Esperado**: Sin violaciones (tiene label `critical`)
- **Real**: Sin violaciones ✅
- **Conclusión**: Plan B y C funcionan correctamente

---

## 📸 Screenshots y Logs

### **Comentarios Automáticos**
- [ ] **Screenshot Plan A**: Comentario de violación
- [ ] **Screenshot Plan B**: Comentario de violación
- [ ] **Screenshot Plan C**: Comentario de violación

### **Logs de Workflow**
- [ ] **Log Plan A**: Ejecución exitosa
- [ ] **Log Plan B**: Ejecución exitosa
- [ ] **Log Plan C**: Ejecución exitosa

### **Logs de Error**
- [ ] **Log Plan A**: Caso de fallo
- [ ] **Log Plan B**: Caso de fallo
- [ ] **Log Plan C**: Caso de fallo

---

## 📊 Métricas de Rendimiento

### **Tiempos de Ejecución**
- **Plan A**: [PENDIENTE] segundos
- **Plan B**: [PENDIENTE] segundos
- **Plan C**: [PENDIENTE] segundos

### **Tasa de Éxito**
- **Plan A**: [PENDIENTE]%
- **Plan B**: [PENDIENTE]%
- **Plan C**: [PENDIENTE]%

### **Falsos Positivos**
- **Plan A**: [PENDIENTE] casos
- **Plan B**: [PENDIENTE] casos
- **Plan C**: [PENDIENTE] casos

---

## 🔄 Historial de Cambios

| Fecha | Cambio | Responsable | Evidencia |
|-------|--------|-------------|-----------|
| 2025-10-04 | Creación del documento | @fegome90-cmd | - |
| 2025-10-04 | Smoke test local exitoso | @fegome90-cmd | `.smoke-test/results.md` |

---

**Estado**: 📊 **REGISTRO DE EVIDENCIAS**  
**Responsable**: @fegome90-cmd  
**Última actualización**: 2025-10-04
