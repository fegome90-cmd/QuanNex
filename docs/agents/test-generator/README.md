# 🧪 **@test-generator - Agente de Generación de Tests**

## 📅 **Versión**: 1.0.0
## 🎯 **Especialidad**: Test Generation y Quality Assurance
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **DESCRIPCIÓN**

El agente `@test-generator` es un especialista en generación automática de tests que se enfoca en crear tests de calidad, asegurar cobertura completa y mantener la calidad del código. Utiliza herramientas avanzadas de testing y análisis de cobertura para generar tests efectivos.

## 🏗️ **RESPONSABILIDADES**

- **Generar tests unitarios** automáticamente
- **Crear tests de integración** completos
- **Generar tests de performance** optimizados
- **Validar cobertura** de tests
- **Mantener calidad** de tests

## 🔧 **HERRAMIENTAS**

### **Testing Unitario**
- **Jest**: Framework de testing JavaScript
- **Mocha**: Framework de testing flexible
- **Jasmine**: Framework de testing BDD
- **Vitest**: Framework de testing rápido

### **Testing de Integración**
- **Cypress**: Testing end-to-end moderno
- **Playwright**: Testing multi-navegador
- **Selenium**: Testing web automatizado
- **Puppeteer**: Control de Chrome/Chromium

### **Testing de Performance**
- **K6**: Testing de carga moderno
- **Artillery**: Testing de carga simple
- **JMeter**: Testing de carga completo
- **LoadRunner**: Testing de carga enterprise

### **Cobertura**
- **Istanbul**: Cobertura de código JavaScript
- **C8**: Cobertura rápida para Node.js
- **Coverage.py**: Cobertura para Python
- **JaCoCo**: Cobertura para Java

### **Mocking**
- **Sinon**: Mocking para JavaScript
- **Jest Mock**: Mocking integrado en Jest
- **Mockito**: Mocking para Java
- **unittest.mock**: Mocking para Python

## 📋 **METODOLOGÍA**

### **Enfoque**
Generación automática de tests de calidad con enfoque en:
- **Cobertura**: Cobertura completa del código
- **Calidad**: Tests efectivos y mantenibles
- **Mantenibilidad**: Tests fáciles de entender
- **Performance**: Tests rápidos y eficientes

### **Proceso**
1. **Análisis**: Análisis del código fuente
2. **Generación**: Creación automática de tests
3. **Validación**: Verificación de calidad
4. **Optimización**: Mejora de tests existentes

### **Priorización**
- **Crítico**: Funcionalidades core
- **Alto**: Funcionalidades importantes
- **Medio**: Funcionalidades secundarias
- **Bajo**: Funcionalidades opcionales

## 🚀 **USO**

### **Comando Básico**
```bash
# Generar tests automáticamente
@test-generator

# Generar tests específicos
@test-generator --type=unit
@test-generator --type=integration
@test-generator --coverage=80
```

### **Configuración**
```json
{
  "auto_generate": true,
  "notifications": true,
  "reporting": "json",
  "coverage_threshold": 80,
  "test_types": ["unit", "integration", "e2e"],
  "frameworks": ["jest", "cypress", "playwright"]
}
```

## 📊 **LOGGING**

### **Formato JSON**
```json
{
  "timestamp": "2025-08-31T10:00:00Z",
  "archivo": "src/utils.js",
  "tipo": "unit",
  "cobertura": 85,
  "casos": 12,
  "duracion": "30s"
}
```

## 🧪 **TESTING**

- **Unit Tests**: ✅ Implementado
- **Integration Tests**: ✅ Implementado
- **Security Tests**: ✅ Implementado
- **Performance Tests**: ✅ Implementado
- **Coverage Tests**: ✅ Implementado

## 📚 **DOCUMENTACIÓN ADICIONAL**

- **[API](API.md)**: Documentación de la API
- **[Ejemplos](ejemplos.md)**: Ejemplos de uso
- **[Checklist](checklist.md)**: Checklist de testing

## 👥 **CONTACTO**

- **Responsable**: QA Engineer / Test Automation Engineer
- **Email**: testing@proyecto.com
- **Slack**: #testing

---

## 🎯 **TIPOS DE TESTS**

### **Unit Tests**
- **Propósito**: Probar funciones individuales
- **Cobertura**: 80%+ requerida
- **Framework**: Jest, Mocha, Jasmine
- **Mocking**: Sinon, Jest Mock

### **Integration Tests**
- **Propósito**: Probar integración entre componentes
- **Cobertura**: 70%+ requerida
- **Framework**: Cypress, Playwright
- **Mocking**: Limitado

### **End-to-End Tests**
- **Propósito**: Probar flujos completos
- **Cobertura**: 60%+ requerida
- **Framework**: Cypress, Playwright, Selenium
- **Mocking**: Mínimo

### **Performance Tests**
- **Propósito**: Probar rendimiento
- **Cobertura**: Crítico
- **Framework**: K6, Artillery, JMeter
- **Métricas**: Tiempo de respuesta, throughput

### **Security Tests**
- **Propósito**: Probar seguridad
- **Cobertura**: Crítico
- **Framework**: OWASP ZAP, Snyk
- **Métricas**: Vulnerabilidades, compliance

---

## 📊 **MÉTRICAS DE COBERTURA**

### **Umbrales Mínimos**
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### **Umbrales Recomendados**
- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%

### **Umbrales Ideales**
- **Statements**: 95%
- **Branches**: 90%
- **Functions**: 95%
- **Lines**: 95%

---

## 🚀 **ESTRATEGIAS DE GENERACIÓN**

### **Generación Automática**
- **Análisis de código**: Identificación de funciones
- **Generación de casos**: Casos de prueba automáticos
- **Mocking inteligente**: Mocks apropiados
- **Assertions**: Validaciones automáticas

### **Generación Manual**
- **Casos edge**: Casos límite específicos
- **Casos de negocio**: Lógica de negocio
- **Casos de integración**: Flujos complejos
- **Casos de performance**: Escenarios de carga

### **Generación Híbrida**
- **Base automática**: Tests básicos automáticos
- **Refinamiento manual**: Mejoras específicas
- **Optimización**: Mejora continua
- **Mantenimiento**: Actualización automática

---

**📅 Última actualización**: Agosto 31, 2025  
**🧪 Estado**: Activo y funcional  
**📊 Completitud**: 100%
