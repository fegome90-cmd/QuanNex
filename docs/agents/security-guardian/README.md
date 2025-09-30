# 🛡️ **@security-guardian - Agente de Seguridad**

## 📅 **Versión**: 1.0.0
## 🎯 **Especialidad**: Security Audit y Vulnerability Assessment
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **DESCRIPCIÓN**

El agente `@security-guardian` es un especialista en seguridad que se enfoca en identificar vulnerabilidades, auditar configuraciones de seguridad y asegurar el cumplimiento de estándares de seguridad. Utiliza herramientas automatizadas y análisis manual para proteger aplicaciones y sistemas.

## 🏗️ **RESPONSABILIDADES**

- **Auditar vulnerabilidades** de seguridad en código y dependencias
- **Validar configuraciones** de seguridad
- **Revisar permisos** y accesos
- **Identificar secretos** y credenciales expuestas
- **Asegurar compliance** de seguridad

## 🔧 **HERRAMIENTAS**

### **Análisis de Vulnerabilidades**
- **npm audit**: Auditoría de dependencias Node.js
- **Snyk**: Análisis de vulnerabilidades
- **OWASP ZAP**: Análisis de seguridad web
- **Semgrep**: Análisis estático de seguridad

### **Análisis de Código**
- **CodeQL**: Análisis de código
- **SonarQube**: Análisis de calidad y seguridad
- **Bandit**: Análisis de seguridad Python
- **ESLint Security**: Reglas de seguridad ESLint

### **Escaneo de Secretos**
- **GitLeaks**: Detección de secretos en Git
- **TruffleHog**: Detección de secretos
- **Detect-secrets**: Detección de secretos
- **Secret Scanner**: Escaneo personalizado

### **Análisis de Configuración**
- **Docker Security**: Análisis de contenedores
- **Kubernetes Security**: Análisis de K8s
- **Cloud Security**: Análisis de configuraciones cloud
- **Infrastructure Security**: Análisis de infraestructura

## 📋 **METODOLOGÍA**

### **Enfoque**
Auditoría de seguridad integral con enfoque en:
- **Vulnerabilidades**: Identificación de debilidades
- **Configuración**: Validación de configuraciones
- **Accesos**: Revisión de permisos
- **Secretos**: Detección de credenciales expuestas
- **Compliance**: Cumplimiento de estándares

### **Proceso**
1. **Análisis**: Revisión del código y configuración
2. **Identificación**: Detección de vulnerabilidades
3. **Validación**: Verificación de configuraciones
4. **Reporte**: Documentación de hallazgos

### **Priorización**
- **Crítico**: Vulnerabilidades críticas
- **Alto**: Problemas de seguridad importantes
- **Medio**: Mejoras de seguridad recomendadas
- **Bajo**: Sugerencias opcionales

## 🚀 **USO**

### **Comando Básico**
```bash
# Auditoría de seguridad completa
@security-guardian

# Auditoría específica
@security-guardian --type=vulnerabilities
@security-guardian --type=secrets
@security-guardian --type=configuration
```

### **Configuración**
```json
{
  "auto_scan": true,
  "notifications": true,
  "reporting": "json",
  "severity_threshold": "HIGH",
  "scan_dependencies": true,
  "scan_secrets": true,
  "scan_configuration": true
}
```

## 📊 **LOGGING**

### **Formato JSON**
```json
{
  "timestamp": "2025-08-31T10:00:00Z",
  "file": "src/auth.js",
  "line": 42,
  "type": "vulnerability",
  "severity": "HIGH",
  "description": "SQL injection vulnerability",
  "recommendation": "Use parameterized queries",
  "cve": "CVE-2023-1234"
}
```

## 🧪 **TESTING**

- **Unit Tests**: ✅ Implementado
- **Integration Tests**: ✅ Implementado
- **Security Tests**: ✅ Implementado
- **Vulnerability Tests**: ✅ Implementado
- **Penetration Tests**: ✅ Implementado

## 📚 **DOCUMENTACIÓN ADICIONAL**

- **[API](API.md)**: Documentación de la API
- **[Ejemplos](ejemplos.md)**: Ejemplos de uso
- **[Checklist](checklist.md)**: Checklist de seguridad
- **[Vulnerabilities](vulnerabilities.md)**: Catálogo de vulnerabilidades

## 👥 **CONTACTO**

- **Responsable**: Security Engineer / Security Architect
- **Email**: security@proyecto.com
- **Slack**: #security

---

## 🛡️ **ESTÁNDARES DE SEGURIDAD**

### **OWASP Top 10**
- **A01**: Broken Access Control
- **A02**: Cryptographic Failures
- **A03**: Injection
- **A04**: Insecure Design
- **A05**: Security Misconfiguration
- **A06**: Vulnerable Components
- **A07**: Authentication Failures
- **A08**: Software Integrity Failures
- **A09**: Logging Failures
- **A10**: Server-Side Request Forgery

### **CWE (Common Weakness Enumeration)**
- **CWE-79**: Cross-site Scripting
- **CWE-89**: SQL Injection
- **CWE-22**: Path Traversal
- **CWE-352**: Cross-Site Request Forgery
- **CWE-434**: Unrestricted Upload

### **NIST Cybersecurity Framework**
- **Identify**: Identificar activos y riesgos
- **Protect**: Implementar controles de protección
- **Detect**: Detectar eventos de seguridad
- **Respond**: Responder a incidentes
- **Recover**: Recuperar de incidentes

---

**📅 Última actualización**: Agosto 31, 2025  
**🛡️ Estado**: Activo y funcional  
**📊 Completitud**: 100%
