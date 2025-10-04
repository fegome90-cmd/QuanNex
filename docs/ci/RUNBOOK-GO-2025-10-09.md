# 🚀 RUNBOOK-GO-2025-10-09 - Sesión de Reactivación a Producción

**Versión**: 1.0  
**Fecha**: 2025-10-04  
**Propósito**: Runbook para levantar el freeze y reactivar el sistema a producción estable

---

# 🚀 RUNBOOK-GO-2025-10-09
## Sesión de Reactivación a Producción - Sistema OPA

---

### 📋 **INFORMACIÓN DE LA SESIÓN**

**Fecha**: 09 de octubre de 2025  
**Horario**: 09:00 - 11:30 (UTC-3)  
**Duración estimada**: 2h 30min  
**Objetivo**: Pasar el sistema a estado de producción estable, generar evidencias auditables y marcar el DoD 100%  
**Estado**: 🟢 **GO-LIVE AUTORIZADO**

---

### 👥 **EQUIPO OPERATIVO**

| Rol | Responsable | Función |
|-----|-------------|---------|
| **Lead Técnico** | Felipe | Coordinación general y validación final |
| **Orquestador** | GPT-5 | Ejecución de comandos y validación técnica |
| **Verificador** | Gemini 2.5 | Verificación de métricas y validación de resultados |

---

### 🧭 **CHECK PRE-GO (Antes de Levantar el Freeze)**

| Elemento | Estado | Verificación |
|----------|--------|--------------|
| **Repositorio limpio (main)** | ✅ | Último commit validado, sin ramas sospechosas |
| **Tags de snapshot** | ✅ | `incident/snapshot-*` ya generados |
| **Guards y OPA activos** | ✅ | Workflows verify, manual-rollback-guard, policy-scan activos |
| **Métrica opa_plan_active visible** | ✅ | Dashboard Grafana actualizado |
| **Autofix deshabilitado** | ✅ | `AUTOFIX_ENABLED=false` (se mantiene) |
| **Equipo operativo listo** | ✅ | Felipe (Lead), GPT-5 (orquestador), Gemini 2.5 (verificador) |

---

## 🕘 **CRONOGRAMA OPERATIVO DETALLADO**

### **🕘 09:00 – 09:15 | Apertura y Validación Inicial**

#### **Acciones**
| Acción | Responsable | Criterio de Éxito | Evidencia |
|--------|-------------|-------------------|-----------|
| **Confirmar integridad de main y CI limpio** | Felipe + GPT-5 | `npm run verify` sin errores | Screenshot + log resumen |
| **Revisar métricas Prometheus/Grafana** | Gemini 2.5 | `opa_plan_active{plan="A"} = 1` | Captura panel |

#### **Contingencia**
- **Si el verify falla**: Revertir último commit y repetir
- **Checkpoint**: GO autorizado por GPT-5 tras validar logs

---

### **🕘 09:15 – 09:45 | Paso 1 — Tag + Eliminación de Ramas Rollback**

#### **Acciones**
| Acción | Responsable | Criterio de Éxito | Evidencia |
|--------|-------------|-------------------|-----------|
| **Crear tag inmutable** `backup/autofix-test-rollback-safety/20251009` | GPT-5 | Tag visible en remoto | `git tag --l` |
| **Eliminar ramas rollback/*, autofix/* del remoto** | Felipe | `git branch --r` sin ramas prohibidas | Screenshot |

#### **Contingencia**
- **Si alguna rama está protegida**: Mover a `quarantine/*`

---

### **🕘 09:45 – 10:15 | Paso 2 — Verificación en Caliente de main**

#### **Acciones**
| Acción | Responsable | Criterio de Éxito | Evidencia |
|--------|-------------|-------------------|-----------|
| **Ejecutar npm run verify + guards/OPA en main** | Gemini 2.5 | Todos los checks verdes | Run ID + resumen CI |
| **Registrar métricas post-run** | GPT-5 | `verify_pass = true` en Prometheus | Captura dashboard |

#### **Contingencia**
- **Si algún guard falla**: Aislar el error y documentar RCA parcial antes de continuar

---

### **🕘 10:15 – 11:00 | Paso 3 — Canarios Post-Saneo**

#### **Canarios a Ejecutar**

| Canary | Acción | Resultado Esperado | Evidencia |
|--------|--------|-------------------|-----------|
| **#1 Docs rename** | Mover `.md` → `docs/informes/` | ✅ **Pasa** | Run ID + log |
| **#2 Mass delete sin rollback** | Borrar 30 archivos dummy | 🚫 **Bloquea** | Log error + mensaje gate |
| **#3 Sensitive path sin critical** | Editar `rag/example.ts` | 🚫 **Bloquea** | Log error + mensaje gate |

#### **Contingencia**
- **Si algún canario falla al bloquear**: Activar rollback del guard y reportar a Gemini 2.5

---

### **🕘 11:00 – 11:15 | Validación de Evidencias**

#### **Acciones**
| Acción | Responsable | Evidencia Requerida |
|--------|-------------|---------------------|
| **Copiar Run IDs y capturas a** `docs/evidencias/ci/2025-10-09_*` | GPT-5 | Carpeta completa con `resumen.md` |
| **Registrar métricas finales** | Gemini 2.5 | Export JSON de panel OPA |
| **Completar checklist** `CONTROL-CALIDAD-FINAL.md` | Felipe | 3 evidencias marcadas ✔️ |

---

### **🕘 11:15 – 11:30 | Sign-off y Comunicación**

#### **Acciones**
| Acción | Responsable | Resultado |
|--------|-------------|-----------|
| **Emitir PR de Sign-off Final** | GPT-5 + Felipe | PR # Audit-Proof listo |
| **Actualizar** `PARKING-SIGN-OFF-OPA.md` y `CIERRE-TECNICO-ESTABLE.md` | Gemini 2.5 | Estado 100% ✅ |
| **Notificar a stakeholders** (correo + dashboard) | Felipe | Comunicación de GO-LIVE |

---

## ✅ **CRITERIOS DE ÉXITO DE LA SESIÓN**

### **Checklist de Validación**
- [ ] **Los tres canarios ejecutados y documentados**
- [ ] **main verificado con todos los guards verdes**
- [ ] **Ramas rollback eliminadas del remoto**
- [ ] **Evidencias persistentes cargadas en** `docs/evidencias/ci/2025-10-09_*`
- [ ] **PR de sign-off final emitido y marcado como ✅ Audit-Proof**

---

## 🛠️ **PLAN DE CONTINGENCIA GLOBAL**

| Riesgo | Mitigación |
|--------|------------|
| **Falla en verify** | Revertir commit previo y volver a ejecutar |
| **Guard bloquea falsamente** | Etiqueta `override/approved` temporal con justificación |
| **Error en OPA o métricas** | Usar fallback Bash Plan C |
| **Falla de red** | Repetir paso con logs locales guardados |
| **Inconsistencia de evidencias** | Consolidar manualmente y firmar por auditor interno |

---

## 🏁 **FIN DE LA SESIÓN (Esperado 11:30)**

### **Resultado Esperado**
- ✅ **Freeze oficialmente levantado**
- ✅ **Sistema en producción controlada y auditable**
- ✅ **Sign-off técnico = 100%**
- ✅ **Estado institucional**: "Operación normal + auditoría continua"

---

## 📋 **COMANDOS DE REFERENCIA**

### **Validación Inicial**
```bash
# Verificar integridad de main
npm run verify

# Verificar ramas remotas
git branch --r

# Verificar tags
git tag --l
```

### **Tag y Eliminación de Ramas**
```bash
# Crear tag inmutable
git tag -a backup/autofix-test-rollback-safety/20251009 -m "Snapshot pre-GO-LIVE"

# Eliminar ramas rollback
git push origin --delete rollback/*
git push origin --delete autofix/*
```

### **Verificación en Caliente**
```bash
# Ejecutar verificación completa
npm run verify

# Verificar guards
gh workflow run verify-prod.yml
gh workflow run manual-rollback-guard.yml
gh workflow run policy-scan.yml
```

### **Canarios Post-Saneo**
```bash
# Canary #1: Docs rename (debe pasar)
git mv README.md docs/informes/README.md
git commit -m "test: canary docs rename"
git push origin feature/canary-docs-rename

# Canary #2: Mass delete sin rollback (debe bloquear)
# Crear 30 archivos dummy y borrarlos sin label rollback

# Canary #3: Sensitive path sin critical (debe bloquear)
# Editar rag/example.ts sin label critical
```

---

## 📊 **MÉTRICAS DE VALIDACIÓN**

### **Métricas Prometheus**
- `opa_plan_active{plan="A"} = 1`
- `verify_pass = true`
- `guards_active = true`

### **Métricas Grafana**
- Panel "OPA – Plan activo por entorno" actualizado
- Anotaciones de cambios de plan registradas
- Export JSON de métricas disponible

---

## 🔗 **ENLACES DE REFERENCIA**

### **Documentación Principal**
- `docs/ci/CONTROL-CALIDAD-FINAL.md` - Control de calidad
- `docs/ci/PARKING-SIGN-OFF-OPA.md` - Gate de firma
- `docs/ci/CIERRE-TECNICO-ESTABLE.md` - Cierre técnico

### **Evidencias**
- `docs/evidencias/ci/2025-10-09_*` - Evidencias de la sesión
- `docs/ci/EVIDENCIAS-OPA.md` - Registro de evidencias

---

## ✍️ **FIRMAS Y APROBACIONES**

| Rol | Nombre | Firma Digital | Fecha | Comentarios |
|-----|--------|---------------|-------|-------------|
| **Lead Técnico** | Felipe | [Firma] | [DD/MM/YYYY] | [Comentarios] |
| **Orquestador** | GPT-5 | [Firma] | [DD/MM/YYYY] | [Comentarios] |
| **Verificador** | Gemini 2.5 | [Firma] | [DD/MM/YYYY] | [Comentarios] |

---

## 🏛️ **DECLARACIÓN OFICIAL DE GO-LIVE**

**Nosotros, los abajo firmantes, declaramos que:**

1. **Hemos ejecutado** exhaustivamente el RUNBOOK-GO-2025-10-09
2. **Confirmamos** que el sistema mantiene su estado de "Controlado, medible, trazable y resiliente"
3. **Aprobamos** el levantamiento del freeze y la reactivación a producción
4. **Garantizamos** la continuidad del ciclo de revisión trimestral
5. **Reconocemos** el valor institucional del sistema como activo de gobernanza

**Fecha de declaración**: 09/10/2025  
**Hora de declaración**: 11:30 AM  
**Lugar**: [Ubicación]

---

**Documento generado**: 04/10/2025 15:30  
**Versión**: 1.0  
**Estado**: 🟢 **GO-LIVE AUTORIZADO**

---

## 📋 **INSTRUCCIONES DE EJECUCIÓN**

### **Antes de la Sesión (08/10/2025)**
1. **Confirmar disponibilidad** del equipo operativo
2. **Verificar acceso** a sistemas y métricas
3. **Preparar documentación** de referencia
4. **Configurar herramientas** de monitoreo

### **Durante la Sesión (09/10/2025)**
1. **Seguir cronograma** paso a paso
2. **Documentar evidencias** en tiempo real
3. **Validar criterios** de éxito en cada paso
4. **Activar contingencia** si es necesario

### **Después de la Sesión (09/10/2025)**
1. **Generar acta** de la sesión
2. **Distribuir** a todos los stakeholders
3. **Archivar** en `docs/ci/actas/`
4. **Programar** próxima revisión trimestral

---

**Estado**: 🚀 **RUNBOOK-GO-2025-10-09 LISTO**  
**Próxima acción**: Ejecutar sesión de reactivación el 09/10/2025  
**Responsable**: Felipe (Lead Técnico)
