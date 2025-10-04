# 🚨 Mini-Drill de 15 Minutos - Validación de Protecciones

**Fecha**: 2025-10-04  
**Propósito**: Simular rollback accidental para validar protecciones  
**Duración**: 15 minutos  
**Estado**: ✅ **LISTO PARA EJECUTAR**

## 🎯 Objetivo del Drill

**Simular un rollback accidental** en un repo espejo para verificar que:
1. `manual-rollback-guard` **bloquea** correctamente
2. El equipo **sabe** dónde mirar (PR checks, logs, policy-scan)
3. Se puede **revertir** en <30 minutos (objetivo)

## 📋 Checklist de Preparación

### **Antes del Drill**:
- [ ] **Repo espejo**: Crear fork o clon para pruebas
- [ ] **Equipo notificado**: Avisar que es un drill
- [ ] **Herramientas listas**: GitHub CLI, scripts de forense
- [ ] **Tiempo reservado**: 15 minutos sin interrupciones

### **Durante el Drill**:
- [ ] **Simular rollback**: Borrar 40 archivos
- [ ] **Verificar bloqueo**: Confirmar que guard bloquea
- [ ] **Documentar proceso**: Capturar logs y evidencia
- [ ] **Probar revert**: Ejecutar plan de recuperación

### **Después del Drill**:
- [ ] **Limpiar repo espejo**: Restaurar estado original
- [ ] **Documentar lecciones**: Registrar hallazgos
- [ ] **Comunicar resultados**: Reportar al equipo

---

## 🚀 Ejecución del Drill

### **Paso 1: Preparación (2 min)**
```bash
# Crear repo espejo para drill
git clone https://github.com/fegome90-cmd/startkit.git drill-repo
cd drill-repo

# Crear rama de drill
git checkout -b drill/rollback-simulation
```

### **Paso 2: Simulación de Rollback (3 min)**
```bash
# Crear archivos dummy para simular rollback
mkdir -p test-files
for i in {1..40}; do
  echo "# Archivo de prueba $i" > test-files/file-$i.md
done

# Commit inicial
git add test-files/
git commit -m "feat: add 40 test files for drill"

# Simular rollback masivo (borrar archivos)
rm -rf test-files/
git add -A
git commit -m "fix: rollback - remove test files (DRILL)"

# Push para crear PR
git push origin drill/rollback-simulation
```

### **Paso 3: Verificación de Bloqueo (5 min)**
```bash
# Crear PR y verificar que es bloqueado
gh pr create --title "DRILL: Simulación de rollback masivo" \
             --body "Este es un drill para probar protecciones" \
             --base main

# Verificar que manual-rollback-guard bloquea
gh pr checks drill/rollback-simulation

# Verificar logs del workflow
gh run list --workflow=manual-rollback-guard
```

### **Paso 4: Proceso de Revert (5 min)**
```bash
# Simular proceso de revert
git checkout main
git checkout -b drill/revert-rollback

# Revertir el commit de rollback
git revert HEAD~1 --no-edit

# Verificar que el revert funciona
ls test-files/  # Debería mostrar los archivos restaurados

# Commit del revert
git commit -m "revert: restore test files (DRILL)"
git push origin drill/revert-rollback
```

---

## 📊 Criterios de Éxito

### **✅ Éxito Total**:
- [ ] `manual-rollback-guard` bloquea el PR
- [ ] Error claro y actionable en logs
- [ ] Equipo sabe dónde buscar información
- [ ] Revert ejecutado en <30 minutos
- [ ] Archivos restaurados correctamente

### **⚠️ Éxito Parcial**:
- [ ] Guard bloquea pero mensaje confuso
- [ ] Revert funciona pero toma >30 minutos
- [ ] Proceso funciona pero no está documentado

### **❌ Falla**:
- [ ] Guard no bloquea el rollback
- [ ] No se puede revertir
- [ ] Proceso no está claro
- [ ] Equipo no sabe qué hacer

---

## 🔍 Puntos de Verificación

### **1. Bloqueo del Guard**:
- **Verificar**: PR es bloqueado por `manual-rollback-guard`
- **Logs**: Error claro sobre deleciones masivas
- **Mensaje**: Instrucciones sobre labels y aprobaciones

### **2. Visibilidad del Problema**:
- **PR Checks**: Estado rojo visible
- **Logs**: Accesibles y comprensibles
- **Notificaciones**: Equipo es notificado

### **3. Proceso de Revert**:
- **Tiempo**: <30 minutos desde detección
- **Efectividad**: Archivos restaurados
- **Documentación**: Proceso claro y repetible

---

## 📝 Documentación del Drill

### **Template de Reporte**:
```markdown
## Drill #YYYY-MM-DD-HHMM
- **Duración**: X minutos
- **Resultado**: Éxito/Éxito Parcial/Falla
- **Hallazgos**: [Lista de hallazgos]
- **Acciones**: [Acciones correctivas]
- **Próximo drill**: [Fecha]
```

### **Ejemplo de Reporte**:
```markdown
## Drill #2025-10-04-140000
- **Duración**: 12 minutos
- **Resultado**: Éxito Total
- **Hallazgos**: 
  - Guard bloquea correctamente
  - Mensaje de error es claro
  - Revert funciona en 8 minutos
- **Acciones**: 
  - Documentar proceso de revert
  - Entrenar equipo en uso de logs
- **Próximo drill**: 2025-10-18
```

---

## 🎯 Frecuencia Recomendada

### **Inicial**:
- **Semanal**: Primeras 4 semanas
- **Objetivo**: Validar que protecciones funcionan

### **Mantenimiento**:
- **Mensual**: Después del período inicial
- **Objetivo**: Mantener competencia del equipo

### **Especial**:
- **Después de cambios**: En protecciones o procesos
- **Objetivo**: Validar que cambios no rompieron nada

---

## 🚀 Próximos Pasos

### **Inmediatos**:
1. **Ejecutar drill**: Esta semana
2. **Documentar resultados**: En este archivo
3. **Comunicar hallazgos**: Al equipo

### **Corto Plazo**:
1. **Mejorar proceso**: Basado en hallazgos
2. **Entrenar equipo**: En procedimientos
3. **Automatizar**: Donde sea posible

### **Largo Plazo**:
1. **Integrar**: En procesos regulares
2. **Escalar**: A otros repositorios
3. **Evolucionar**: Basado en experiencia

---
**Estado**: ✅ **DRILL LISTO PARA EJECUTAR**  
**Responsable**: @fegome90-cmd  
**Próxima ejecución**: 2025-10-11
