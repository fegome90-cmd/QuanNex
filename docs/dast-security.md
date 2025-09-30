# DAST Security Testing System

Este documento describe el sistema de **Dynamic Application Security Testing (DAST)** implementado en el Claude Project Init Kit.

## 📋 **Resumen**

El sistema DAST proporciona testing de seguridad dinámico para aplicaciones web y APIs, incluyendo:

- **Escaneo de vulnerabilidades dinámicas** en endpoints y servicios
- **Testing de seguridad automatizado** en CI/CD
- **Detección de vulnerabilidades comunes** (OWASP Top 10)
- **Integración con herramientas existentes** (npm audit, gitleaks, trivy)
- **Reportes de seguridad** estructurados y consolidados

## 🛠️ **Herramientas Incluidas**

### 1. DAST Scanner (`core/scripts/dast-scan.sh`)

Escáner principal para testing de seguridad dinámico.

**Características:**
- Escaneo de headers de seguridad
- Verificación de métodos HTTP permitidos
- Detección de información sensible
- Verificación de configuración HTTPS
- Escaneo específico para APIs
- Escaneo de aplicaciones web tradicionales

**Tipos de escaneo:**
- `basic` - Escaneo básico de vulnerabilidades comunes
- `api` - Enfocado en APIs REST/GraphQL
- `web` - Enfocado en aplicaciones web tradicionales
- `full` - Escaneo completo (puede ser lento)

**Uso:**
```bash
# Escaneo básico
./core/scripts/dast-scan.sh https://api.example.com

# Escaneo de API con output detallado
./core/scripts/dast-scan.sh -t api -v https://api.example.com/v1

# Escaneo completo con archivo de salida personalizado
./core/scripts/dast-scan.sh -t full -o custom-report.json https://app.example.com
```

### 2. Security Dependencies Scanner (`core/scripts/security-deps-scan.sh`)

Escáner de vulnerabilidades en dependencias y paquetes.

**Características:**
- Escaneo de dependencias npm
- Escaneo de dependencias Python
- Detección de secretos con gitleaks
- Escaneo de vulnerabilidades del sistema operativo
- Niveles de auditoría configurables

**Niveles de auditoría:**
- `low` - Solo vulnerabilidades críticas
- `moderate` - Críticas y altas (default)
- `high` - Críticas, altas y moderadas
- `critical` - Solo críticas

**Uso:**
```bash
# Escaneo con nivel moderado (default)
./core/scripts/security-deps-scan.sh

# Escaneo con nivel alto y output detallado
./core/scripts/security-deps-scan.sh -l high -v

# Escaneo solo crítico
./core/scripts/security-deps-scan.sh -l critical
```

### 3. Security Report Aggregator (`core/scripts/security-report-aggregator.sh`)

Combina múltiples reportes de seguridad en un resumen consolidado.

**Características:**
- Combina reportes de DAST, dependencias, gitleaks, trivy, ESLint
- Genera resumen por severidad y herramienta
- Reporte JSON estructurado
- Detección automática de reportes disponibles

**Uso:**
```bash
# Agregar todos los reportes disponibles
./core/scripts/security-report-aggregator.sh

# Agregar con output detallado
./core/scripts/security-report-aggregator.sh -v

# Archivo de salida personalizado
./core/scripts/security-report-aggregator.sh -o custom-summary.json
```

## 📦 **Scripts NPM**

El sistema incluye scripts NPM convenientes:

```bash
# DAST Scripts
npm run dast:scan <url>           # Escaneo DAST básico
npm run dast:basic <url>          # Escaneo básico
npm run dast:api <url>            # Escaneo de API
npm run dast:web <url>            # Escaneo de aplicación web
npm run dast:full <url>           # Escaneo completo

# Security Dependencies Scripts
npm run security:deps             # Escaneo de dependencias (moderado)
npm run security:deps:low         # Solo críticas
npm run security:deps:moderate    # Críticas y altas
npm run security:deps:high        # Críticas, altas y moderadas
npm run security:deps:critical    # Solo críticas

# Aggregation Scripts
npm run security:aggregate        # Agregar reportes
npm run security:full             # Escaneo completo + agregación
```

## 🔄 **CI/CD Integration**

### Workflow de GitHub Actions

El sistema incluye un workflow automatizado (`.github/workflows/dast-security.yml`):

**Triggers:**
- Push a `main` y `develop`
- Pull requests a `main`
- Ejecución diaria a las 2 AM UTC
- Ejecución manual con parámetros configurables

**Características:**
- Matriz de Node.js (18, 20, 22)
- Instalación automática de herramientas de seguridad
- Escaneo DAST configurable
- Escaneo de dependencias de seguridad
- Agregación de reportes
- Upload de artefactos
- Comentarios automáticos en PRs
- Fallo en issues críticos de seguridad

**Parámetros configurables:**
- `target_url` - URL objetivo para escaneo DAST
- `scan_type` - Tipo de escaneo (basic, api, web, full)
- `audit_level` - Nivel de auditoría (low, moderate, high, critical)

### Ejecución Manual

```bash
# Ejecutar workflow manualmente
gh workflow run dast-security.yml -f target_url=https://api.example.com -f scan_type=api -f audit_level=high
```

## 📊 **Estructura de Reportes**

### Reporte DAST

```json
{
  "scan_info": {
    "target": "https://api.example.com",
    "type": "basic",
    "timestamp": "2025-09-30T15:30:00Z",
    "scanner_version": "1.0.0"
  },
  "summary": {
    "total_findings": 3,
    "high_severity": 1,
    "medium_severity": 2,
    "low_severity": 0
  },
  "findings": [
    {
      "type": "missing_security_header",
      "header": "X-Content-Type-Options",
      "severity": "medium",
      "description": "Missing security header: X-Content-Type-Options"
    }
  ]
}
```

### Reporte de Dependencias

```json
{
  "scan_info": {
    "timestamp": "2025-09-30T15:30:00Z",
    "audit_level": "moderate",
    "scanner_version": "1.0.0"
  },
  "summary": {
    "total_findings": 2,
    "critical_severity": 0,
    "high_severity": 1,
    "medium_severity": 1,
    "low_severity": 0
  },
  "findings": [
    {
      "type": "npm_vulnerability",
      "package": "lodash",
      "severity": "high",
      "title": "Prototype Pollution",
      "range": ">=4.17.0 <4.17.12",
      "source": "npm_audit"
    }
  ]
}
```

### Reporte Consolidado

```json
{
  "consolidated_info": {
    "timestamp": "2025-09-30T15:30:00Z",
    "aggregator_version": "1.0.0",
    "reports_processed": 4
  },
  "summary": {
    "total_findings": 8,
    "by_severity": {
      "critical": 0,
      "high": 2,
      "medium": 4,
      "low": 2,
      "info": 0
    },
    "by_tool": {
      "dast": 3,
      "dependencies": 2,
      "gitleaks": 1,
      "trivy": 1,
      "eslint": 1
    }
  },
  "reports": [...]
}
```

## 🔍 **Tipos de Vulnerabilidades Detectadas**

### DAST Scanner

- **Headers de seguridad faltantes** (X-Content-Type-Options, X-Frame-Options, etc.)
- **Métodos HTTP peligrosos** (PUT, DELETE, PATCH)
- **Información sensible en headers** (Server, X-Powered-By)
- **Configuración HTTPS incorrecta**
- **Documentación de API expuesta**
- **Configuración CORS incorrecta**
- **Falta de rate limiting**
- **Directorios sensibles expuestos**

### Security Dependencies Scanner

- **Vulnerabilidades en dependencias npm**
- **Vulnerabilidades en dependencias Python**
- **Secretos en el código** (API keys, passwords, tokens)
- **Vulnerabilidades del sistema operativo**

## ⚙️ **Configuración Avanzada**

### Variables de Entorno

```bash
# Mantener artefactos para debugging
export KEEP_ARTIFACTS=1

# Timeout personalizado para requests
export DAST_TIMEOUT=60

# Nivel de verbosidad
export VERBOSE=true
```

### Archivos de Configuración

El sistema busca automáticamente archivos de configuración:

- `package.json` - Dependencias npm
- `requirements.txt` - Dependencias Python
- `pyproject.toml` - Dependencias Python (moderno)
- `Pipfile` - Dependencias Python (pipenv)
- `poetry.lock` - Dependencias Python (poetry)

### Herramientas Externas

El sistema puede usar herramientas externas opcionales:

- **gitleaks** - Detección de secretos
- **trivy** - Escaneo de vulnerabilidades del sistema
- **safety** - Escaneo de dependencias Python

## 🚨 **Alertas y Notificaciones**

### CI/CD Gates

El workflow falla automáticamente si se encuentran:

- Vulnerabilidades de alta severidad en DAST
- Vulnerabilidades críticas o altas en dependencias
- Secretos en el código
- Vulnerabilidades críticas del sistema

### Comentarios en PRs

El sistema genera comentarios automáticos en pull requests con:

- Resumen de herramientas ejecutadas
- Enlaces a reportes detallados
- Información de configuración utilizada

## 📈 **Métricas y Monitoreo**

### Métricas Disponibles

- **Total de findings** por severidad
- **Findings por herramienta**
- **Tiempo de ejecución** de escaneos
- **Tasa de éxito** de escaneos
- **Cobertura** de herramientas

### Dashboards

Los reportes se pueden integrar con:

- GitHub Security tab
- Herramientas de monitoreo externas
- Sistemas de alertas empresariales

## 🔧 **Troubleshooting**

### Problemas Comunes

1. **Herramientas no encontradas**
   ```bash
   # Instalar gitleaks
   wget -O gitleaks.tar.gz https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_8.18.0_linux_x64.tar.gz
   tar -xzf gitleaks.tar.gz
   sudo mv gitleaks /usr/local/bin/
   ```

2. **Timeouts en escaneos**
   ```bash
   # Aumentar timeout
   ./core/scripts/dast-scan.sh -T 60 https://slow-api.example.com
   ```

3. **Reportes no generados**
   ```bash
   # Verificar permisos
   chmod +x core/scripts/*.sh
   
   # Verificar directorios
   mkdir -p .reports/{dast,security,consolidated}
   ```

### Logs y Debugging

```bash
# Ejecutar con output detallado
./core/scripts/dast-scan.sh -v https://api.example.com

# Verificar reportes generados
ls -la .reports/dast/
ls -la .reports/security/
ls -la .reports/consolidated/
```

## 📚 **Referencias**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP DAST Guide](https://owasp.org/www-project-dast/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [NPM Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Trivy Documentation](https://trivy.dev/)

## 🤝 **Contribución**

Para contribuir al sistema DAST:

1. Crear un issue describiendo la mejora
2. Implementar la funcionalidad
3. Agregar tests correspondientes
4. Actualizar documentación
5. Crear pull request

## 📄 **Licencia**

Este sistema DAST está incluido en el Claude Project Init Kit bajo la licencia MIT.
