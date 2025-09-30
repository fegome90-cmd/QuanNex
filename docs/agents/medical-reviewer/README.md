# 🏥 **@medical-reviewer - Agente de Compliance Médico**

## 📅 **Versión**: 1.0.0
## 🎯 **Especialidad**: Medical Software Compliance y HIPAA
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **DESCRIPCIÓN**

El agente `@medical-reviewer` es un especialista en compliance médico que se enfoca en validar el cumplimiento de regulaciones HIPAA, HITECH y otras normativas médicas. Asegura la protección de datos de salud (PHI) y la implementación de mejores prácticas de seguridad médica.

## 🏗️ **RESPONSABILIDADES**

- **Revisar código** para compliance HIPAA y regulaciones médicas
- **Validar manejo seguro** de datos de salud (PHI)
- **Identificar vulnerabilidades** de seguridad específicas del sector médico
- **Asegurar implementación** de mejores prácticas de privacidad
- **Validar auditoría** y trazabilidad de datos médicos

## 🔧 **HERRAMIENTAS**

### **Compliance Médico**
- **HIPAA_Validator**: Validación de compliance HIPAA
- **PHI_Scanner**: Escaneo de datos de salud
- **Compliance_Checker**: Verificación de regulaciones
- **Medical_Compliance_Scanner**: Análisis integral

### **Seguridad**
- **npm audit**: Auditoría de dependencias
- **Snyk**: Análisis de vulnerabilidades
- **Semgrep**: Análisis estático de seguridad
- **OWASP ZAP**: Análisis de seguridad web

### **Testing**
- **Jest**: Testing unitario
- **Cypress**: Testing end-to-end
- **Playwright**: Testing de UI
- **Security_Tests**: Tests de seguridad específicos

### **Análisis**
- **CodeQL**: Análisis de código
- **SonarQube**: Métricas de calidad
- **Medical_Compliance_Scanner**: Análisis de compliance

## 📋 **METODOLOGÍA**

### **Enfoque**
Revisión de compliance médico y seguridad con enfoque en:
- **HIPAA**: Cumplimiento de regulaciones
- **Seguridad**: Protección de datos médicos
- **Compliance**: Adherencia a normativas
- **Privacidad**: Protección de información personal
- **Auditoría**: Trazabilidad y logging

### **Proceso**
1. **Análisis**: Revisión del código médico
2. **Validación**: Verificación de compliance
3. **Documentación**: Registro de hallazgos
4. **Certificación**: Validación de cumplimiento

### **Priorización**
- **Crítico**: Violaciones de HIPAA
- **Alto**: Problemas de seguridad médica
- **Medio**: Mejoras de compliance
- **Bajo**: Sugerencias opcionales

## 🚀 **USO**

### **Comando Básico**
```bash
# Revisar compliance médico
@medical-reviewer

# Revisar archivo específico
@medical-reviewer archivo-medico.js

# Revisar con configuración HIPAA
@medical-reviewer --config=hipaa
```

### **Configuración**
```json
{
  "auto_review": true,
  "notifications": true,
  "reporting": "json",
  "severity_threshold": "HIGH",
  "hipaa_strict": true,
  "compliance_required": true
}
```

## 📊 **LOGGING**

### **Formato JSON**
```json
{
  "timestamp": "2025-08-31T10:00:00Z",
  "archivo": "src/patient-data.js",
  "linea": 42,
  "tipo": "hipaa_violation",
  "severidad": "CRITICAL",
  "descripcion": "PHI data not encrypted",
  "recomendacion": "Implement AES-256 encryption",
  "hipaa_violation": true
}
```

## 🧪 **TESTING**

- **Unit Tests**: ✅ Implementado
- **Integration Tests**: ✅ Implementado
- **Security Tests**: ✅ Implementado
- **HIPAA Tests**: ✅ Implementado
- **Compliance Tests**: ✅ Implementado

## 📚 **DOCUMENTACIÓN ADICIONAL**

- **[API](API.md)**: Documentación de la API
- **[Ejemplos](ejemplos.md)**: Ejemplos de uso
- **[Checklist](checklist.md)**: Checklist de compliance
- **[HIPAA Checklist](hipaa-checklist.md)**: Checklist específico de HIPAA
- **[Compliance Guide](compliance-guide.md)**: Guía de compliance

## 👥 **CONTACTO**

- **Responsable**: Medical Compliance Officer / Security Specialist
- **Email**: medical-compliance@proyecto.com
- **Slack**: #medical-compliance

---

## 🏥 **REGULACIONES SOPORTADAS**

### **HIPAA (Health Insurance Portability and Accountability Act)**
- **Privacy Rule**: Protección de información de salud
- **Security Rule**: Medidas de seguridad técnicas y administrativas
- **Breach Notification Rule**: Notificación de violaciones

### **HITECH (Health Information Technology for Economic and Clinical Health Act)**
- **Enhanced Enforcement**: Sanciones aumentadas
- **Business Associate Agreements**: Contratos con terceros
- **Breach Notification**: Notificación de violaciones

### **GDPR (General Data Protection Regulation)**
- **Data Protection**: Protección de datos personales
- **Consent**: Consentimiento explícito
- **Right to be Forgotten**: Derecho al olvido

### **Regulaciones Locales**
- **Ley de Protección de Datos**: Regulaciones locales
- **Normativas de Salud**: Regulaciones específicas del país

---

**📅 Última actualización**: Agosto 31, 2025  
**🏥 Estado**: Activo y funcional  
**📊 Completitud**: 100%
