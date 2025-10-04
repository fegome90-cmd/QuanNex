# ✅ Checklist de Cierre - OPA Endurecido Plus

**Fecha**: 2025-10-04  
**Propósito**: Verificación final antes de activar OPA en producción

## 📋 Checklist de Verificación

### **🔒 Permisos Mínimos**
- [ ] **Plan A**: `permissions` añadidos en `opa-policy-check-v2.yml`
- [ ] **Plan B**: `permissions` añadidos en `opa-policy-check-container.yml`
- [ ] **Plan C**: `permissions` añadidos en `simple-policy-check.yml`
- [ ] **Permisos configurados**: `contents: read`, `pull-requests: write`, `actions: read`, `security-events: write`

### **📌 Acciones Pinedas**
- [ ] **actions/checkout@v4** (sin @main)
- [ ] **actions/cache@v4** (sin @main)
- [ ] **actions/github-script@v7** (sin @main)
- [ ] **Todas las acciones** en versiones específicas

### **📝 Input.json Consistente**
- [ ] **Plan A**: Genera `input.json` correctamente
- [ ] **Plan B**: Genera `input.json` correctamente
- [ ] **Plan C**: Genera `input.json` correctamente
- [ ] **Formato idéntico** en los 3 planes

### **🔄 Data YAML Sincronizado**
- [ ] **data.yaml** se inyecta con `-d data.yaml` en Plan A
- [ ] **data.yaml** se inyecta con `-d data.yaml` en Plan B
- [ ] **Fallback a defaults** si no existe data.yaml
- [ ] **Sincronización** con `config/sensitive-paths.yaml`

### **💬 Comentarios Automáticos**
- [ ] **Plan A**: Comentario con prefijo "Pinned"
- [ ] **Plan B**: Comentario con prefijo "Container"
- [ ] **Plan C**: Comentario con prefijo "Fallback"
- [ ] **Formato uniforme** en los 3 planes

### **⏱️ Timeouts y Concurrency**
- [ ] **Plan A**: `timeout-minutes: 5` y `concurrency` activado
- [ ] **Plan B**: `timeout-minutes: 5` y `concurrency` activado
- [ ] **Plan C**: `timeout-minutes: 4` y `concurrency` activado
- [ ] **Cancel-in-progress** configurado

---

## 🧪 Verificaciones de Funcionamiento

### **Smoke Test Local**
- [ ] **Script ejecutado**: `./scripts/smoke-test-opa.sh`
- [ ] **Plan A**: Funciona (si OPA local disponible)
- [ ] **Plan B**: Funciona (si Docker disponible)
- [ ] **Plan C**: Siempre funciona
- [ ] **Resultados coherentes** entre planes

### **Validación de Políticas**
- [ ] **Rutas sensibles**: Detecta sin label `critical`
- [ ] **Deleciones masivas**: Detecta sin label `rollback`
- [ ] **Labels correctas**: No genera violaciones
- [ ] **Comportamiento consistente** entre planes

### **Integración con Meta-Guard**
- [ ] **checks-all-green.yml**: Dependencia de OPA añadida
- [ ] **Orden de ejecución**: manual-rollback-guard → policy-scan → opa → meta
- [ ] **SHA-lock**: Funciona correctamente
- [ ] **Concurrency**: No hay conflictos

---

## 📊 Documentación Completa

### **Guías de Usuario**
- [ ] **BAU-RUNBOOK.md**: Actualizado con endurecido plus
- [ ] **TROUBLESHOOTING-OPA.md**: Guía de solución de problemas
- [ ] **SWITCHBOARD-OPA.md**: Configuración de planes
- [ ] **CHECKLIST-CIERRE-OPA.md**: Este checklist

### **Scripts de Soporte**
- [ ] **smoke-test-opa.sh**: Test local de 3 minutos
- [ ] **generate-opa-data.sh**: Sincronización YAML
- [ ] **health-check.sh**: Verificación del sistema
- [ ] **Todos los scripts** son ejecutables

---

## 🎯 Configuración de Producción

### **Plan Principal (Plan A)**
- [ ] **opa-policy-check-v2.yml**: Activado
- [ ] **opa-policy-check-container.yml**: Desactivado
- [ ] **simple-policy-check.yml**: Desactivado
- [ ] **Solo un plan activo** en producción

### **Fallbacks Configurados**
- [ ] **Plan B**: Listo para activar en caso de problemas
- [ ] **Plan C**: Listo para emergencias
- [ ] **Procedimientos** documentados para cambio de planes

---

## 🚨 Procedimientos de Emergencia

### **Escalación de Problemas**
- [ ] **Nivel 1**: Smoke test local
- [ ] **Nivel 2**: Cambiar a Plan B
- [ ] **Nivel 3**: Cambiar a Plan C
- [ ] **Nivel 4**: Escalar al equipo

### **Documentación de Excepciones**
- [ ] **EXCEPTIONS-LOG.md**: Template listo
- [ ] **Procedimiento** para documentar bypasses
- [ ] **Responsables** identificados

---

## 📈 Métricas de Éxito

### **Métricas Técnicas**
- [ ] **Tiempo de ejecución**: < 5 minutos por plan
- [ ] **Tasa de éxito**: > 95% en Plan A
- [ ] **Detección de violaciones**: 100% de casos conocidos
- [ ] **Falsos positivos**: < 5%

### **Métricas de Usuario**
- [ ] **Comentarios automáticos**: Visibles en PRs
- [ ] **Tiempo de feedback**: < 10 minutos
- [ ] **Claridad de mensajes**: Violaciones comprensibles
- [ ] **Satisfacción del equipo**: Positiva

---

## 🎉 Criterios de Aprobación

### **✅ Aprobación Total**
- [ ] Todos los items del checklist completados
- [ ] Smoke test local pasa
- [ ] Documentación completa
- [ ] Procedimientos de emergencia listos

### **⚠️ Aprobación Condicional**
- [ ] 90% de items completados
- [ ] Smoke test pasa con advertencias
- [ ] Documentación básica completa
- [ ] Procedimientos básicos listos

### **❌ No Aprobado**
- [ ] < 90% de items completados
- [ ] Smoke test falla
- [ ] Documentación incompleta
- [ ] Procedimientos de emergencia faltantes

---

## 🚀 Próximos Pasos Post-Aprobación

### **Inmediatos (Día 1)**
1. **Activar Plan A** en producción
2. **Monitorear** primeras ejecuciones
3. **Documentar** cualquier problema
4. **Ajustar** configuración si es necesario

### **Corto Plazo (Semana 1)**
1. **Recopilar métricas** de rendimiento
2. **Entrenar equipo** en nuevos procedimientos
3. **Revisar** comentarios automáticos
4. **Ajustar** umbrales si hay falsos positivos

### **Mediano Plazo (Mes 1)**
1. **Optimizar** rendimiento
2. **Expandir** políticas según necesidades
3. **Automatizar** más procesos
4. **Integrar** con otros sistemas

---

## 📞 Contactos y Escalación

### **Responsables**
- **Mantenedor Principal**: @fegome90-cmd
- **SRE Lead**: @sre-lead
- **Backend Lead**: @lead-backend

### **Escalación**
1. **Nivel 1**: Revisar troubleshooting guide
2. **Nivel 2**: Cambiar a Plan B/C
3. **Nivel 3**: Escalar a mantenedor principal
4. **Crítico**: Activar procedimiento de emergencia

---

**Estado**: 🔄 **EN VERIFICACIÓN**  
**Responsable**: @fegome90-cmd  
**Fecha de verificación**: 2025-10-04
