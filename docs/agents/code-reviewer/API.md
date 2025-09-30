# 🔍 **API Documentation - @code-reviewer**

## 📅 **Versión**: 1.0.0
## 🎯 **Agente**: @code-reviewer
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **API OVERVIEW**

El agente `@code-reviewer` proporciona una API completa para revisión de código, análisis de calidad y validación de seguridad. La API está diseñada para ser simple, eficiente y fácil de usar.

## 🚀 **ENDPOINTS**

### **POST /api/code-review/analyze**
Analiza código y genera reporte de revisión.

**Request:**
```json
{
  "files": ["src/app.js", "src/utils.js"],
  "options": {
    "severity_threshold": "medium",
    "include_suggestions": true,
    "format": "json"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "analysis": {
    "total_files": 2,
    "issues_found": 5,
    "severity_breakdown": {
      "critical": 0,
      "high": 1,
      "medium": 2,
      "low": 2
    }
  },
  "issues": [
    {
      "file": "src/app.js",
      "line": 42,
      "severity": "high",
      "type": "security",
      "message": "Potential XSS vulnerability",
      "suggestion": "Use proper input sanitization"
    }
  ]
}
```

### **GET /api/code-review/status**
Obtiene el estado actual del agente.

**Response:**
```json
{
  "status": "active",
  "version": "1.0.0",
  "last_analysis": "2025-08-31T10:00:00Z",
  "tools_available": ["ESLint", "Prettier", "SonarQube"]
}
```

### **POST /api/code-review/configure**
Configura el agente con nuevas opciones.

**Request:**
```json
{
  "auto_review": true,
  "notifications": true,
  "severity_threshold": "high",
  "tools": ["ESLint", "Prettier"]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Configuration updated successfully"
}
```

## 🔧 **HERRAMIENTAS INTEGRADAS**

### **ESLint Integration**
```bash
# Ejecutar ESLint
curl -X POST /api/code-review/eslint \
  -H "Content-Type: application/json" \
  -d '{"files": ["src/**/*.js"], "config": "custom"}'
```

### **Prettier Integration**
```bash
# Formatear código
curl -X POST /api/code-review/prettier \
  -H "Content-Type: application/json" \
  -d '{"files": ["src/**/*.js"], "write": true}'
```

### **SonarQube Integration**
```bash
# Análisis con SonarQube
curl -X POST /api/code-review/sonar \
  -H "Content-Type: application/json" \
  -d '{"project_key": "my-project", "quality_gate": true}'
```

## 📊 **MÉTRICAS Y REPORTES**

### **GET /api/code-review/metrics**
Obtiene métricas de calidad del código.

**Response:**
```json
{
  "coverage": 85.5,
  "complexity": 12.3,
  "duplications": 2.1,
  "maintainability": 78.9,
  "reliability": 92.1,
  "security": 88.7
}
```

### **GET /api/code-review/reports**
Obtiene reportes históricos.

**Query Parameters:**
- `start_date`: Fecha de inicio (ISO 8601)
- `end_date`: Fecha de fin (ISO 8601)
- `format`: Formato del reporte (json, html, pdf)

**Response:**
```json
{
  "reports": [
    {
      "date": "2025-08-31",
      "files_analyzed": 45,
      "issues_found": 12,
      "trend": "improving"
    }
  ]
}
```

## 🚨 **ERROR HANDLING**

### **Error Responses**
```json
{
  "status": "error",
  "error_code": "INVALID_FILE",
  "message": "File not found or inaccessible",
  "details": {
    "file": "src/nonexistent.js",
    "suggestion": "Check file path and permissions"
  }
}
```

### **Error Codes**
- `INVALID_FILE`: Archivo no encontrado o inaccesible
- `ANALYSIS_FAILED`: Error durante el análisis
- `TOOL_UNAVAILABLE`: Herramienta no disponible
- `CONFIGURATION_ERROR`: Error de configuración

## 🔐 **AUTHENTICATION**

### **API Key Authentication**
```bash
curl -H "X-API-Key: your-api-key" \
  -X POST /api/code-review/analyze
```

### **JWT Authentication**
```bash
curl -H "Authorization: Bearer your-jwt-token" \
  -X POST /api/code-review/analyze
```

## 📝 **EXAMPLES**

### **Basic Code Analysis**
```bash
# Analizar archivo específico
curl -X POST /api/code-review/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "files": ["src/app.js"],
    "options": {
      "severity_threshold": "medium"
    }
  }'
```

### **Batch Analysis**
```bash
# Analizar múltiples archivos
curl -X POST /api/code-review/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "files": ["src/**/*.js", "tests/**/*.js"],
    "options": {
      "include_suggestions": true,
      "format": "detailed"
    }
  }'
```

### **Configuration Update**
```bash
# Actualizar configuración
curl -X POST /api/code-review/configure \
  -H "Content-Type: application/json" \
  -d '{
    "auto_review": true,
    "severity_threshold": "high",
    "notifications": {
      "email": "dev@company.com",
      "slack": "#code-review"
    }
  }'
```

## 🚀 **WEBHOOKS**

### **Webhook Configuration**
```json
{
  "webhooks": [
    {
      "url": "https://your-app.com/webhooks/code-review",
      "events": ["analysis_completed", "critical_issue_found"],
      "secret": "webhook-secret"
    }
  ]
}
```

### **Webhook Payload**
```json
{
  "event": "analysis_completed",
  "timestamp": "2025-08-31T10:00:00Z",
  "data": {
    "files_analyzed": 10,
    "issues_found": 3,
    "severity": "medium"
  }
}
```

## 📚 **SDK EXAMPLES**

### **JavaScript SDK**
```javascript
import { CodeReviewer } from '@code-reviewer/sdk';

const reviewer = new CodeReviewer({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.code-reviewer.com'
});

// Analizar código
const result = await reviewer.analyze({
  files: ['src/app.js'],
  options: {
    severity_threshold: 'high'
  }
});

console.log(result.issues);
```

### **Python SDK**
```python
from code_reviewer import CodeReviewer

reviewer = CodeReviewer(api_key='your-api-key')

# Analizar código
result = reviewer.analyze(
    files=['src/app.py'],
    options={
        'severity_threshold': 'high'
    }
)

print(result.issues)
```

## 🔧 **CONFIGURATION**

### **Environment Variables**
```bash
# Configuración básica
export CODE_REVIEWER_API_KEY=your-api-key
export CODE_REVIEWER_BASE_URL=https://api.code-reviewer.com
export CODE_REVIEWER_LOG_LEVEL=info

# Configuración de herramientas
export ESLINT_CONFIG_PATH=.eslintrc.js
export PRETTIER_CONFIG_PATH=.prettierrc
export SONARQUBE_URL=https://sonar.company.com
```

### **Configuration File**
```json
{
  "api": {
    "base_url": "https://api.code-reviewer.com",
    "timeout": 30,
    "retries": 3
  },
  "tools": {
    "eslint": {
      "enabled": true,
      "config": ".eslintrc.js"
    },
    "prettier": {
      "enabled": true,
      "config": ".prettierrc"
    },
    "sonarqube": {
      "enabled": true,
      "url": "https://sonar.company.com"
    }
  },
  "notifications": {
    "email": "dev@company.com",
    "slack": "#code-review"
  }
}
```

---

**📅 Última actualización**: Agosto 31, 2025  
**🔍 Estado**: Activo y funcional  
**📊 Completitud**: 100%
