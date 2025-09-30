# 🛡️ **API Documentation - @security-guardian**

## 📅 **Versión**: 1.0.0
## 🎯 **Agente**: @security-guardian
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **API OVERVIEW**

El agente `@security-guardian` proporciona una API completa para auditoría de seguridad, análisis de vulnerabilidades y detección de secretos. La API está diseñada para identificar y mitigar riesgos de seguridad.

## 🚀 **ENDPOINTS**

### **POST /api/security/scan**
Ejecuta escaneo de seguridad completo.

**Request:**
```json
{
  "scan_type": "all",
  "options": {
    "severity_threshold": "high",
    "include_secrets": true,
    "include_vulnerabilities": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "scan_results": {
    "vulnerabilities_found": 2,
    "secrets_found": 1,
    "risk_level": "medium"
  },
  "findings": [
    {
      "type": "vulnerability",
      "severity": "high",
      "description": "SQL injection vulnerability",
      "file": "src/database.js",
      "line": 42
    }
  ]
}
```

---

**📅 Última actualización**: Agosto 31, 2025  
**🛡️ Estado**: Activo y funcional  
**📊 Completitud**: 100%
