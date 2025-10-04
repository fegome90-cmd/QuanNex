# 🎛️ Switchboard OPA - Configuración de Planes

**Fecha**: 2025-10-04  
**Propósito**: Guía para activar/desactivar los 3 planes OPA según el entorno

## 🎯 Configuración Recomendada

### **🏭 Producción (Recomendado)**
- **Plan A (Pinned)**: ✅ **ACTIVO**
- **Plan B (Container)**: 🔄 **CONDICIONAL** (USE_OPA_CONTAINER=true)
- **Plan C (Fallback)**: ❌ **DESACTIVADO**

### **🔧 Debug/Emergencia**
- **Plan A (Pinned)**: ❌ **DESACTIVADO**
- **Plan B (Container)**: ✅ **ACTIVO**
- **Plan C (Fallback)**: ❌ **DESACTIVADO**

### **🚨 Último Recurso**
- **Plan A (Pinned)**: ❌ **DESACTIVADO**
- **Plan B (Container)**: ❌ **DESACTIVADO**
- **Plan C (Fallback)**: ✅ **ACTIVO**

---

## 🔄 Cómo Activar/Desactivar Planes

### **Método 1: Comentar/Descomentar en GitHub UI**
1. Ir a `.github/workflows/`
2. Editar el archivo del plan
3. Comentar/descomentar la sección `on:`

### **Método 2: Usar `workflow_dispatch`**
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  workflow_dispatch:  # Permite ejecución manual
```

### **Método 3: Usar Variables de Repositorio**
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  opa:
    if: ${{ vars.USE_OPA_CONTAINER == 'true' }}
    runs-on: ubuntu-latest
    # ... resto del job
```

### **Método 4: Usar Labels**
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    # Solo ejecutar si tiene label específica
    # labels: ['opa-test']
```

---

## 📋 Configuraciones por Escenario

### **Escenario 1: Desarrollo Local**
```bash
# Solo Plan C (bash puro)
./scripts/smoke-test-opa.sh
```

### **Escenario 2: CI/CD Normal**
```yaml
# Solo Plan A activo
# .github/workflows/opa-policy-check-v2.yml
```

### **Escenario 3: Problemas de Red**
```yaml
# Cambiar a Plan B (contenedor)
# .github/workflows/opa-policy-check-container.yml
```

### **Escenario 4: Emergencia Total**
```yaml
# Solo Plan C (bash puro)
# .github/workflows/simple-policy-check.yml
```

---

## 🎛️ Comandos de Control

### **Activar Plan A (Producción)**
```bash
# Desactivar otros planes
git mv .github/workflows/opa-policy-check-container.yml .github/workflows/opa-policy-check-container.yml.disabled
git mv .github/workflows/simple-policy-check.yml .github/workflows/simple-policy-check.yml.disabled

# Activar Plan A
git mv .github/workflows/opa-policy-check-v2.yml.disabled .github/workflows/opa-policy-check-v2.yml
```

### **Activar Plan B (Debug)**
```bash
# Desactivar otros planes
git mv .github/workflows/opa-policy-check-v2.yml .github/workflows/opa-policy-check-v2.yml.disabled
git mv .github/workflows/simple-policy-check.yml .github/workflows/simple-policy-check.yml.disabled

# Activar Plan B
git mv .github/workflows/opa-policy-check-container.yml.disabled .github/workflows/opa-policy-check-container.yml
```

### **Activar Plan C (Emergencia)**
```bash
# Desactivar otros planes
git mv .github/workflows/opa-policy-check-v2.yml .github/workflows/opa-policy-check-v2.yml.disabled
git mv .github/workflows/opa-policy-check-container.yml .github/workflows/opa-policy-check-container.yml.disabled

# Activar Plan C
git mv .github/workflows/simple-policy-check.yml.disabled .github/workflows/simple-policy-check.yml
```

---

## 🔍 Verificación de Estado

### **Verificar Planes Activos**
```bash
# Listar workflows activos
ls -la .github/workflows/opa-policy-check*.yml
ls -la .github/workflows/simple-policy-check.yml

# Listar workflows desactivados
ls -la .github/workflows/*.disabled
```

### **Verificar Configuración**
```bash
# Verificar que solo un plan esté activo
grep -l "pull_request:" .github/workflows/opa-policy-check*.yml .github/workflows/simple-policy-check.yml 2>/dev/null | wc -l
```

---

## 📊 Monitoreo de Planes

### **Métricas por Plan**
- **Plan A**: Tiempo de ejecución, tasa de éxito, uso de cache
- **Plan B**: Tiempo de ejecución, disponibilidad de contenedor
- **Plan C**: Tiempo de ejecución, detección de violaciones

### **Alertas**
- **Plan A falla > 3 veces**: Cambiar a Plan B
- **Plan B falla > 2 veces**: Cambiar a Plan C
- **Plan C falla**: Revisar configuración

---

## 🎯 Recomendaciones por Entorno

### **Desarrollo**
- Usar **Plan C** para desarrollo local
- **Plan A** para testing en CI

### **Staging**
- Usar **Plan A** como principal
- **Plan B** como fallback

### **Producción**
- Usar **Plan A** exclusivamente
- Monitorear métricas de rendimiento

### **Emergencia**
- Usar **Plan C** (siempre funciona)
- Investigar problemas de Plan A/B

---

## ✅ Checklist de Configuración

### **Antes de Activar Plan A**
- [ ] Cache de OPA configurado
- [ ] Checksum de OPA verificado
- [ ] Retries configurados
- [ ] Timeouts apropiados

### **Antes de Activar Plan B**
- [ ] Contenedor OPA disponible
- [ ] Docker funcionando
- [ ] Permisos configurados

### **Antes de Activar Plan C**
- [ ] Scripts bash funcionando
- [ ] Config YAML accesible
- [ ] Lógica de validación correcta

---

## 🚨 Procedimientos de Emergencia

### **Plan A Falla Repetidamente**
1. Desactivar Plan A
2. Activar Plan B
3. Investigar causa raíz
4. Documentar en EXCEPTIONS-LOG.md

### **Plan B Falla Repetidamente**
1. Desactivar Plan B
2. Activar Plan C
3. Investigar problemas de contenedor
4. Documentar en EXCEPTIONS-LOG.md

### **Todos los Planes Fallan**
1. Revisar configuración base
2. Verificar permisos
3. Revisar logs de GitHub Actions
4. Escalar al equipo

---

**Estado**: ✅ **SWITCHBOARD CONFIGURADO**  
**Responsable**: @fegome90-cmd  
**Última actualización**: 2025-10-04
