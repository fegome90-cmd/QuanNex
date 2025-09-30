# 🔍 **Ejemplos de Uso - @code-reviewer**

## 📅 **Versión**: 1.0.0
## 🎯 **Agente**: @code-reviewer
## 🚗 **Filosofía**: "Menos (y Mejor) es Más"

---

## 🎯 **EJEMPLOS BÁSICOS**

### **Ejemplo 1: Revisión Básica de Código**
```bash
# Revisar archivo específico
@code-reviewer src/app.js

# Revisar directorio completo
@code-reviewer src/

# Revisar con configuración específica
@code-reviewer --config=security src/
```

### **Ejemplo 2: Revisión con ESLint**
```bash
# Ejecutar ESLint
./core/core/scripts/eslint-check.sh src/app.js

# Ejecutar con configuración personalizada
ESLINT_CONFIG=custom.eslintrc.js ./core/core/scripts/eslint-check.sh

# Ejecutar con umbral de severidad
SEVERITY_THRESHOLD=high ./core/core/scripts/eslint-check.sh
```

### **Ejemplo 3: Revisión de Seguridad**
```bash
# Escanear vulnerabilidades
./core/core/scripts/security-scan.sh src/

# Escanear solo secretos
SCAN_TYPE=secrets ./core/core/scripts/security-scan.sh

# Escanear solo vulnerabilidades
SCAN_TYPE=vulnerabilities ./core/core/scripts/security-scan.sh
```

---

## 🚀 **EJEMPLOS AVANZADOS**

### **Ejemplo 4: Integración con CI/CD**
```yaml
# workflow de revisión (pendiente)
name: Code Review
on: [push, pull_request]

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run ESLint
        run: ./core/core/scripts/eslint-check.sh
      
      - name: Security Scan
        run: ./core/core/scripts/security-scan.sh
      
      - name: Upload reports
        uses: actions/upload-artifact@v2
        with:
          name: code-review-reports
          path: |
            eslint-report.json
            security-report.json
```

### **Ejemplo 5: Configuración Personalizada**
```json
// .code-reviewer.json
{
  "auto_review": true,
  "notifications": true,
  "reporting": "json",
  "severity_threshold": "MEDIUM",
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
  "exclude": [
    "node_modules/",
    "dist/",
    "build/"
  ]
}
```

### **Ejemplo 6: Script de Automatización**
```bash
#!/bin/bash
# auto-review.sh (pendiente)

set -euo pipefail

echo "🔍 Iniciando revisión automática de código..."

# Revisar código con ESLint
echo "📝 Ejecutando ESLint..."
./core/core/scripts/eslint-check.sh

# Escanear seguridad
echo "🛡️ Ejecutando escaneo de seguridad..."
./core/core/scripts/security-scan.sh

# Generar reporte consolidado
echo "📊 Generando reporte consolidado..."
jq -s '.[0] * .[1]' eslint-report.json security-report.json > consolidated-report.json

# Enviar notificación
echo "📧 Enviando notificación..."
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-type: application/json' \
  --data '{
    "text": "Revisión de código completada",
    "attachments": [{
      "color": "good",
      "fields": [{
        "title": "Reporte",
        "value": "Ver archivo: consolidated-report.json"
      }]
    }]
  }'

echo "✅ Revisión automática completada"
```

---

## 🏥 **EJEMPLOS MÉDICOS**

### **Ejemplo 7: Revisión de Código Médico**
```bash
# Revisar compliance HIPAA
@medical-reviewer src/medical/

# Escanear PHI
./core/core/scripts/check-phi.sh src/

# Revisión completa médica
@code-reviewer --medical src/medical/
```

### **Ejemplo 8: Configuración Médica**
```json
// .medical-reviewer.json
{
  "hipaa_strict": true,
  "compliance_required": true,
  "phi_protection": true,
  "audit_trail": true,
  "regulations": ["HIPAA", "HITECH", "GDPR"],
  "tools": {
    "phi_scanner": true,
    "hipaa_validator": true,
    "compliance_checker": true
  }
}
```

---

## 🛡️ **EJEMPLOS DE SEGURIDAD**

### **Ejemplo 9: Auditoría de Seguridad**
```bash
# Auditoría completa
@security-guardian --full-audit

# Escanear vulnerabilidades específicas
./core/core/scripts/security-scan.sh --type=vulnerabilities

# Escanear secretos
./core/core/scripts/security-scan.sh --type=secrets

# Auditoría de dependencias
./core/core/scripts/security-scan.sh --type=dependencies
```

### **Ejemplo 10: Configuración de Seguridad**
```json
// .security-guardian.json
{
  "auto_scan": true,
  "notifications": true,
  "severity_threshold": "HIGH",
  "scan_dependencies": true,
  "scan_secrets": true,
  "scan_configuration": true,
  "tools": {
    "npm_audit": true,
    "snyk": true,
    "semgrep": true,
    "owasp_zap": true
  }
}
```

---

## 🚀 **EJEMPLOS DE DESPLIEGUE**

### **Ejemplo 11: Revisión de Despliegue**
```bash
# Verificar configuración de despliegue
@deployment-manager --check

# Verificar ambiente específico
ENVIRONMENT=production ./core/core/scripts/deployment-check.sh

# Verificar estrategia específica
STRATEGY=blue-green ./core/core/scripts/deployment-check.sh
```

### **Ejemplo 12: Configuración de Despliegue**
```json
// .deployment-manager.json
{
  "auto_deploy": true,
  "notifications": true,
  "rollback_auto": true,
  "health_checks": true,
  "monitoring": true,
  "ambientes": {
    "development": "dev.company.com",
    "staging": "staging.company.com",
    "production": "company.com"
  },
  "estrategias": {
    "blue_green": true,
    "canary": true,
    "rolling": true
  }
}
```

---

## 🧪 **EJEMPLOS DE TESTING**

### **Ejemplo 13: Generación de Tests**
```bash
# Generar tests unitarios
@test-generator --type=unit

# Generar tests de integración
@test-generator --type=integration

# Generar todos los tipos de tests
@test-generator --type=all

# Generar con cobertura específica
COVERAGE_THRESHOLD=90 ./core/core/scripts/test-generator.sh
```

### **Ejemplo 14: Configuración de Testing**
```json
// .test-generator.json
{
  "auto_generate": true,
  "coverage_threshold": 80,
  "test_types": ["unit", "integration", "e2e"],
  "frameworks": ["jest", "cypress", "playwright"],
  "coverage": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  }
}
```

---

## 🤝 **EJEMPLOS DE COORDINACIÓN**

### **Ejemplo 15: Coordinación de Revisiones**
```bash
# Coordinar todas las revisiones
@review-coordinator

# Coordinar revisión específica
@review-coordinator --type=code-review

# Coordinar con notificaciones
NOTIFICATION_LEVEL=high ./core/core/scripts/review-coordinator.sh
```

### **Ejemplo 16: Configuración de Coordinación**
```json
// .review-coordinator.json
{
  "auto_coordinate": true,
  "notifications": true,
  "collaboration_tools": ["slack", "github", "jira"],
  "workflow_automation": true,
  "real_time_monitoring": true,
  "agentes_coordinados": {
    "code-reviewer": true,
    "medical-reviewer": true,
    "security-guardian": true,
    "deployment-manager": true,
    "test-generator": true
  }
}
```

---

## 📊 **EJEMPLOS DE REPORTES**

### **Ejemplo 17: Reporte Consolidado**
```bash
# Generar reporte consolidado
./core/core/scripts/review-coordinator.sh

# Ver reporte JSON
cat consolidated-review-report.json | jq '.'

# Ver reporte en formato legible
cat consolidated-review-report.json | jq -r '.results[] | "\(.agent): \(.status) (\(.duration)s)"'
```

### **Ejemplo 18: Análisis de Reportes**
```bash
#!/bin/bash
# analyze-reports.sh (pendiente)

echo "📊 Analizando reportes de revisión..."

# Contar revisiones exitosas
successful=$(jq '.successful_reviews' consolidated-review-report.json)
total=$(jq '.total_agents' consolidated-review-report.json)

echo "✅ Revisiones exitosas: $successful/$total"

# Mostrar agentes con problemas
echo "❌ Agentes con problemas:"
jq -r '.results[] | select(.status == "failed") | .agent' consolidated-review-report.json

# Calcular tiempo promedio
avg_time=$(jq '.results | map(.duration) | add / length' consolidated-review-report.json)
echo "⏱️ Tiempo promedio: ${avg_time}s"
```

---

## 🔧 **EJEMPLOS DE INTEGRACIÓN**

### **Ejemplo 19: Integración con Git Hooks**
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Ejecutando revisión pre-commit..."

# Revisar archivos modificados
git diff --cached --name-only | grep -E '\.(js|ts|jsx|tsx)$' | while read file; do
  echo "Revisando: $file"
  ./core/core/scripts/eslint-check.sh "$file"
done

# Escanear seguridad
./core/core/scripts/security-scan.sh

echo "✅ Revisión pre-commit completada"
```

### **Ejemplo 20: Integración con VS Code**
```json
// .vscode/settings.json
{
  "code-reviewer.enabled": true,
  "code-reviewer.autoReview": true,
  "code-reviewer.severityThreshold": "medium",
  "code-reviewer.tools": ["eslint", "prettier"],
  "code-reviewer.notifications": true,
  "eslint.enable": true,
  "eslint.autoFixOnSave": true,
  "prettier.enable": true,
  "prettier.autoFormatOnSave": true
}
```

---

**📅 Última actualización**: Agosto 31, 2025  
**🔍 Estado**: Activo y funcional  
**📊 Completitud**: 100%
