# 🔍 Control de Calidad Final - OPA

**Fecha**: 2025-10-04  
**Propósito**: Control de calidad para completar el 100% del estacionamiento resiliente

## 📊 Estado Actual

- **Porcentaje de cierre**: ≈95%
- **Sube gracias a**: Control de calidad final documentado, texto de PR para sign-off listo, todo el "parking resiliente" quedó visible, testeado (doc→prueba) y gobernado (tickets)
- **Aún faltan**: 3 evidencias operativas post-freeze

## ✅ Qué falta para el 100% (cuando levantes el freeze)

### **1. Ramas de Rollback**
- **Acción**: Taguear snapshot inmutable y **eliminarlas en remoto**
- **Anotar en RCA**: rama → tag → fecha → motivo
- **Evidencia**: Lista de tags y enlaces a delete refs

### **2. Verificación "en Caliente" de `main`**
- **Acción**: Una corrida reciente de `verify` + guards/OPA sobre `main` ya saneado
- **Evidencia**: Guardar los Run IDs en `EVIDENCIAS-OPA.md`
- **Ubicación**: 1 enlace por check

### **3. Canarios Post-Saneo (3 casos)**
- **Acción**: Ejecutar canarios para validar protecciones
- **Casos de prueba**:
  - Renames de docs → **pasa**
  - Deleciones masivas sin `rollback` → **bloquea**
  - Tocar `rag/**` sin `critical` → **bloquea**
- **Evidencia**: 3 Run IDs + breve nota
- **Ubicación**: `EVIDENCIAS-OPA.md`

---

## 🛡️ Gate de Firma (Resumen Ultra Breve)

- ✅ **Documentación y salvaguardas**: Listas (parking resiliente)
- ✅ **Tickets**: Plantillas listas; enlazar IDs reales en RUNBOOK y evidencias
- 🟨 **Evidencia operativa post-freeze**: **Pendiente** (las 3 de arriba)
- → Al completar esas 3, **DoD al 100%**

---

## 📋 Micro-Tabla de Control de Calidad (Para el PR Final)

| Ítem | Evidencia Requerida | Dónde Dejarla |
|------|-------------------|---------------|
| **Tags + eliminación ramas rollback** | Enlaces a tags y delete refs | RCA + `PARKING-SIGN-OFF-OPA.md` |
| **Run IDs de `main` (verify+guards/OPA)** | 1 enlace por check | `EVIDENCIAS-OPA.md` |
| **Canarios post-saneo** | 3 Run IDs + breve nota | `EVIDENCIAS-OPA.md` |

---

## 🚨 Riesgos Neutralizados al Ejecutar los 3 Pasos

### **🔁 Reintroducción Silenciosa de Rollbacks**
- **Bloqueado por**: Canarios + guards
- **Evidencia**: Run IDs de canarios funcionando

### **🕳️ Main No Verificado Tras Limpieza**
- **Cubierto por**: Run reciente y trazabilidad
- **Evidencia**: Run IDs de verify + guards/OPA

### **🧠 Dependencia de Memoria**
- **Sustituida por**: Evidencia y tickets enlazados
- **Evidencia**: Documentación completa + tickets formales

---

## 🎯 Criterios de Aceptación para 100%

- [ ] **Ramas rollback**: Tagged + eliminadas en remoto
- [ ] **Main verificado**: Run reciente de verify + guards/OPA
- [ ] **Canarios funcionando**: 3 casos de prueba con Run IDs
- [ ] **Tickets enlazados**: URLs reales en RUNBOOK y evidencias
- [ ] **Sign-off completado**: PARKING-SIGN-OFF-OPA.md marcado
- [ ] **Post-mortem completado**: Documento enlazado y comunicado

## 📁 Persistencia de Evidencia

### **Estructura de Carpetas**
```
docs/evidencias/ci/
├── 2025-10-XX_main-verify/
│   ├── run-id.txt               # ID/URL
│   ├── resumen.md               # extracto + contexto
│   └── captura.png              # screenshot del check en verde
├── 2025-10-XX_canary-rename-ok/
├── 2025-10-XX_canary-mass-delete-deny/
└── 2025-10-XX_canary-sensitive-path-deny/
```

### **Plantilla resumen.md**
```markdown
# Evidencia CI – <Caso>
- Fecha: YYYY-MM-DD
- Run URL: <https://…>
- Commit SHA: <sha>
- Plan OPA en uso: <A|B|C>
- Resultado: ✅ OK / ❌ DENY (esperado)
- Extracto del log (≤25 líneas):

<pega aquí las últimas ~20 líneas útiles del job>
```

## 📊 Resumen para Stakeholders

> **Documentación y salvaguardas listas; pendientes solo las 3 evidencias operativas post-freeze para declarar DoD al 100%.**

---

## 📝 Texto de PR Final (Preparado)

```markdown
## 🎯 Sign-off Final - OPA Estacionamiento Resiliente

### ✅ Evidencia Operativa Post-Freeze

1. **Ramas de rollback**: [Enlaces a tags y delete refs]
2. **Main verificado**: [Run IDs de verify + guards/OPA]
3. **Canarios funcionando**: [3 Run IDs + notas]

### 🛡️ DoD al 100% Completado

- [x] Documentación y salvaguardas listas
- [x] Tickets enlazados con URLs reales
- [x] Evidencia operativa post-freeze
- [x] Sign-off completado

**Estado**: 🎯 **100% COMPLETADO**
```

---

**Estado**: 🔍 **CONTROL DE CALIDAD LISTO**  
**Próxima acción**: Ejecutar 3 pasos post-freeze y completar sign-off
