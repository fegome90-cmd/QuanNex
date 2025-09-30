# 🔍 Comando: /review

## 📅 **Fecha**: December 2024
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"
## 🎯 **Propósito**: Revisión automatizada de código con análisis de calidad y seguridad

---

## 🎯 **DESCRIPCIÓN**

**`/review`** ejecuta una revisión completa del código, incluyendo análisis de calidad, seguridad, performance y mejores prácticas, generando un reporte detallado con recomendaciones de mejora.

---

## 🚀 **USO**

```
/review [opciones]
```

### **📋 Opciones Disponibles:**

- **`--scope <all|files|git>`**: Alcance de la revisión (default: all)
- **`--type <quality|security|performance|all>`**: Tipo de revisión (default: all)
- **`--output <console|json|html>`**: Formato de salida (default: console)
- **`--fix`**: Aplicar correcciones automáticas cuando sea posible
- **`--ignore <patrones>`**: Patrones de archivos a ignorar

---

## 🔄 **FUNCIONALIDAD**

### **📊 Análisis de Calidad:**
1. **Código**: Linting, formateo y estándares de código
2. **Arquitectura**: Patrones de diseño y estructura
3. **Documentación**: Comentarios, README y JSDoc
4. **Testing**: Cobertura y calidad de tests
5. **Dependencias**: Versiones y vulnerabilidades

### **🛡️ Análisis de Seguridad:**
- **Vulnerabilidades**: Escaneo de dependencias y código
- **Secretos**: Detección de credenciales expuestas
- **Permisos**: Validación de permisos de archivos
- **Configuración**: Revisión de configuraciones de seguridad

### **⚡ Análisis de Performance:**
- **Bundle size**: Tamaño de archivos y dependencias
- **Lazy loading**: Implementación de carga diferida
- **Caching**: Estrategias de cache implementadas
- **Optimización**: Oportunidades de optimización

---

## 📊 **SALIDA**

### **✅ Revisión Completada:**
```
🔍 Code Review - COMPLETADO
📊 Calidad: 85/100 (Bueno)
🛡️ Seguridad: 92/100 (Excelente)
⚡ Performance: 78/100 (Aceptable)
📝 Documentación: 90/100 (Bueno)
🎯 Recomendaciones: 12 mejoras identificadas
📋 Reporte completo en: reports/code-review-2024-12-19.json
```

### **❌ Problemas Críticos Detectados:**
```
🔍 Code Review - PROBLEMAS CRÍTICOS
❌ Seguridad: 3 vulnerabilidades críticas detectadas
⚠️  Calidad: 8 problemas de calidad identificados
💡 Acciones inmediatas requeridas
📋 Detalles en: reports/code-review-2024-12-19.json
```

---

## 🛠️ **IMPLEMENTACIÓN TÉCNICA**

### **🔧 Herramientas de Análisis:**
- **Linting**: ESLint, Prettier, SonarQube
- **Seguridad**: npm audit, Snyk, Semgrep
- **Performance**: Bundle analyzer, Lighthouse
- **Testing**: Jest coverage, Cypress

### **📝 Generación de Reportes:**
- **Formato JSON**: Para integración con CI/CD
- **Formato HTML**: Para visualización en navegador
- **Formato Console**: Para terminal y logs
- **Histórico**: Reportes guardados con timestamp

---

## 🚨 **GATES DE VALIDACIÓN**

### **✅ Gate de Inicio:**
- [ ] **Scope válido**: Alcance de revisión bien definido
- [ ] **Herramientas disponibles**: Linters y analizadores funcionando
- [ ] **Permisos**: Acceso a archivos y directorios

### **✅ Gate de Análisis:**
- [ ] **Análisis ejecutándose**: Todas las herramientas funcionando
- [ ] **Logging activo**: Progreso siendo registrado
- [ ] **Reportes generándose**: Archivos de salida siendo creados

### **✅ Gate de Finalización:**
- [ ] **Reporte completo**: Todos los análisis terminados
- [ ] **Recomendaciones**: Lista de mejoras generada
- [ ] **Artifacts**: Reportes y logs guardados

---

## 🚀 **FILOSOFÍA TOYOTA APLICADA**

### **"Menos (y Mejor) es Más"**
- **Análisis esencial**: Solo revisar lo que añade valor
- **Simplicidad**: Reportes claros y accionables
- **Calidad**: Revisión exhaustiva y recomendaciones útiles

### **"Mejora Continua"**
- **Iteración**: Mejorar análisis basado en feedback
- **Adaptación**: Ajustar según necesidades del proyecto
- **Optimización**: Refinar continuamente las reglas

---

## 📝 **NOTAS DE IMPLEMENTACIÓN**

**Este comando implementa revisión automatizada de código con análisis de calidad, seguridad y performance, siguiendo la filosofía Toyota de mejora continua.**

**El comando está diseñado para ser extensible, permitiendo fácil integración con herramientas adicionales y personalización de reglas según necesidades específicas del proyecto.**
