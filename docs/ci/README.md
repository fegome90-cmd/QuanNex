# 📁 docs/ci/ - Documentación de CI/CD

**Fecha**: 2025-10-04  
**Propósito**: Documentación centralizada de CI/CD, políticas y validaciones

## 🗂️ Organización de Documentos

### **📋 OPA (Open Policy Agent)**
Todos los documentos relacionados con OPA están consolidados en `docs/ci/`:

- **CATALOGO-REGLAS-OPA.md** - Catálogo completo de reglas implementadas
- **CHECKLIST-CIERRE-OPA.md** - Checklist final antes de producción
- **DATA-YAML-ESPEC.md** - Especificación para reintroducción de data.yaml
- **ESTACIONAMIENTO-SEGURO-OPA.md** - Decisiones documentadas y estado actual
- **EVIDENCIAS-OPA.md** - Registro de pruebas y evidencias
- **IMAGENES-PINNED.md** - Registro de digests SHA256 de imágenes
- **PR-MESSAGE-OPA.md** - Mensaje de PR listo para copiar/pegar
- **SWITCHBOARD-OPA.md** - Configuración de planes A/B/C
- **TROUBLESHOOTING-OPA.md** - Solución de problemas comunes
- **VALIDACION-FINAL-OPA.md** - Checklist de validación para CI

### **📊 Otros Documentos CI/CD**
- **PLAN.md** - Plan general de CI/CD

### **📋 Políticas (docs/policy/)**
- **CATALOGO-REGLAS-OPA.md** - Catálogo formal de reglas OPA
- **DATA-YAML-ESPEC.md** - Especificación para reintroducción de data.yaml

### **📚 BAU (docs/BAU/)**
- **RUNBOOK-REANUDACION-OPA.md** - Runbook completo para reanudación

## 🎯 Principios de Organización

### **1. Consolidación por Dominio**
- **OPA**: Todos los documentos OPA en `docs/ci/`
- **CI/CD**: Documentación general de CI/CD
- **Políticas**: Reglas y validaciones en `docs/policy/`
- **BAU**: Runbooks operativos en `docs/BAU/`

### **2. Nomenclatura Consistente**
- **Prefijo**: `[DOMINIO]-[FUNCION].md`
- **Ejemplo**: `OPA-CHECKLIST-CIERRE.md`
- **Mayúsculas**: Para dominios principales

### **3. Jerarquía Lógica**
```
docs/
├── ci/
│   ├── README.md (este archivo)
│   ├── PLAN.md (plan general)
│   └── OPA-*.md (todos los documentos OPA)
├── policy/
│   ├── CATALOGO-REGLAS-OPA.md
│   └── DATA-YAML-ESPEC.md
└── BAU/
    └── RUNBOOK-REANUDACION-OPA.md
```

## 🔄 Flujo de Documentación

### **Creación de Nuevos Documentos**
1. **Identificar dominio**: ¿Es OPA, CI/CD, políticas?
2. **Usar nomenclatura**: `[DOMINIO]-[FUNCION].md`
3. **Ubicar en carpeta correcta**: `docs/ci/` para CI/CD
4. **Actualizar este README**: Añadir entrada

### **Mantenimiento**
- **Revisión mensual**: Verificar organización
- **Actualización**: Mantener este README actualizado
- **Limpieza**: Eliminar documentos obsoletos

## 📚 Referencias Cruzadas

### **Documentos OPA Interrelacionados**
- **VALIDACION-FINAL-OPA.md** → **ESTACIONAMIENTO-SEGURO-OPA.md**
- **CATALOGO-REGLAS-OPA.md** → **EVIDENCIAS-OPA.md**
- **DATA-YAML-ESPEC.md** → **IMAGENES-PINNED.md**
- **SWITCHBOARD-OPA.md** → **TROUBLESHOOTING-OPA.md**

### **Flujo de Trabajo**
1. **VALIDACION-FINAL-OPA.md** - Checklist inicial
2. **ESTACIONAMIENTO-SEGURO-OPA.md** - Decisiones tomadas
3. **EVIDENCIAS-OPA.md** - Registro de pruebas
4. **PR-MESSAGE-OPA.md** - Mensaje final

## ⚠️ Reglas de Organización

### **✅ Permitido**
- Crear documentos en `docs/ci/` con nomenclatura consistente
- Referenciar documentos entre sí
- Actualizar este README al añadir documentos

### **❌ Prohibido**
- Crear documentos OPA fuera de `docs/ci/`
- Usar nomenclatura inconsistente
- Duplicar información entre documentos

## 🔍 Búsqueda Rápida

### **Por Función**
- **Checklist**: `CHECKLIST-CIERRE-OPA.md`
- **Troubleshooting**: `TROUBLESHOOTING-OPA.md`
- **Evidencias**: `EVIDENCIAS-OPA.md`
- **Configuración**: `SWITCHBOARD-OPA.md`

### **Por Estado**
- **Validación**: `VALIDACION-FINAL-OPA.md`
- **Estacionamiento**: `ESTACIONAMIENTO-SEGURO-OPA.md`
- **Especificación**: `DATA-YAML-ESPEC.md`
- **Reglas**: `CATALOGO-REGLAS-OPA.md`

---

**Estado**: 📁 **ORGANIZACIÓN CONSOLIDADA**  
**Responsable**: @fegome90-cmd  
**Última actualización**: 2025-10-04
