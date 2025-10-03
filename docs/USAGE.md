# Guía de Uso de QuanNex

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 20+
- npm 9+
- Git

### Instalación
```bash
git clone <tu-repo>
cd startkit-main
npm install
```

### Levantar el Proyecto
```bash
# Desarrollo local
npm run dev

# Con métricas
node src/server.mjs &
npm run test:e2e
```

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. **Orquestador** (`orchestration/orchestrator-gateway.js`)
- Punto de entrada principal
- Carga workflows desde `workflows/`
- Ejecuta agentes en secuencia
- Maneja errores y timeouts

#### 2. **Agentes** (`agents/`)
- **Métricas**: Recolecta métricas de Prometheus
- **Seguridad**: Escanea vulnerabilidades y políticas
- **Optimización**: Analiza rendimiento
- **Contexto**: Gestiona contexto del proyecto
- **Reglas**: Aplica políticas de compliance

#### 3. **Tools** (`src/tools/`)
- Funciones utilitarias reutilizables
- Validación de datos
- Operaciones de base de datos

#### 4. **Gates de Calidad** (`scripts/`)
- **Quality Gate**: Cobertura de tests, duplicación
- **Policy Gate**: APIs prohibidas, secretos
- **Scan Gate**: Archivos escaneados
- **Metrics Gate**: Tipos de métricas válidas

## 📊 Cómo Interpretar Métricas

### Endpoint de Métricas (`/metrics`)
```bash
curl http://localhost:3000/metrics
```

**Métricas Clave:**
- `qn_http_requests_total`: Total de requests HTTP
- `qn_http_request_duration_seconds`: Duración de requests
- `qn_health_checks_total`: Checks de salud

### Interpretación de Latencia
- **p50**: 50% de requests más rápidos
- **p95**: 95% de requests más rápidos  
- **p99**: 99% de requests más rápidos

**SLOs Recomendados:**
- p95 < 600ms para endpoints internos
- p99 < 1000ms para endpoints críticos

## 🔒 Seguridad y Compliance

### Policy Gate
```bash
node scripts/policy-check.mjs
```

**Verifica:**
- Archivos críticos presentes
- Configuración de escaneo válida
- APIs prohibidas (eval, exec, etc.)
- Secretos en código

### Scan Gate
```bash
node scripts/scan-gate.mjs
```

**Configuración:** `config/scan-globs.json`
```json
{
  "code": ["src/**/*.{ts,js,mjs}"],
  "configs": ["**/*.{json,yml,yaml}"]
}
```

### Gitleaks (Secret Scanning)
```bash
node scripts/gitleaks-check.mjs
```

## 🧪 Testing

### Tests Unitarios
```bash
# Ejecutar todos los tests
npm test

# Con cobertura
npm run test:cov

# Solo agentes
npx vitest run agents/ --coverage
```

### Tests E2E
```bash
# Local
npm run test:e2e

# En Docker
docker build -f Dockerfile.test -t quannex-e2e-test .
docker run --rm quannex-e2e-test
```

### Cobertura Requerida
- **src/tools/**: ≥85% líneas
- **agents/**: ≥85% líneas
- **src/math/**: ≥85% líneas

## 🚪 Gates de Calidad

### Quality Gate
```bash
npm run quality:gate
```

**Criterios:**
- Cobertura por directorio ≥85%
- Sin duplicación de código
- Archivos completos (no a medias)
- Tamaño de archivo <10KB

### Metrics Gate
```bash
node scripts/metrics-gate.mjs
```

**Valida:**
- No hay `unknown_metric_type`
- Métricas de Prometheus válidas
- Endpoint `/metrics` accesible

## 🔄 Workflows

### Workflow de Fault Detection
```bash
node orchestration/orchestrator-gateway.js workflows/workflow-quannex-fault-detection.json
```

**Pasos:**
1. Context Agent: Analiza estado del proyecto
2. Security Agent: Escanea vulnerabilidades
3. Metrics Agent: Recolecta métricas
4. Optimization Agent: Analiza rendimiento
5. Rules Agent: Verifica compliance
6. Prompting Agent: Genera reportes

### Workflow de CI/CD
```bash
# Pre-push completo
npm run prepush

# Solo quality gate
npm run quality:gate
```

## 🐳 Docker

### Desarrollo
```bash
# Build imagen de test
docker build -f Dockerfile.test -t quannex-e2e-test .

# Ejecutar tests e2e
docker run --rm quannex-e2e-test
```

### Producción
```bash
# Build imagen principal
docker build -t quannex-prod .

# Ejecutar con métricas
docker run -p 3000:3000 quannex-prod
```

## 📈 Monitoreo

### Health Checks
```bash
curl http://localhost:3000/health
```

**Respuesta:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T22:27:17.445Z",
  "uptime": 389.918260875
}
```

### Métricas de Prometheus
```bash
curl http://localhost:3000/metrics | grep qn_
```

## 🛠️ Troubleshooting

### Problemas Comunes

#### 1. "unknown_metric_type"
```bash
# Verificar servidor corriendo
curl http://localhost:3000/metrics

# Reiniciar servidor
pkill -f "node src/server.mjs"
node src/server.mjs &
```

#### 2. "0 archivos escaneados"
```bash
# Verificar configuración
cat config/scan-globs.json

# Ejecutar policy check
node scripts/policy-check.mjs
```

#### 3. Quality Gate falla
```bash
# Generar cobertura
npm run test:cov

# Verificar archivos duplicados
npm run quality:gate
```

### Logs y Debugging
```bash
# Logs del servidor
tail -f logs/quannex.log

# Debug de agentes
DEBUG=quannex:* node orchestration/orchestrator-gateway.js
```

## 📚 Referencias

### Archivos de Configuración
- `vitest.config.ts`: Configuración de tests
- `config/scan-globs.json`: Patrones de escaneo
- `.gitleaks.toml`: Reglas de secretos
- `package.json`: Scripts y dependencias

### Directorios Importantes
- `agents/`: Agentes del sistema
- `src/tools/`: Herramientas utilitarias
- `scripts/`: Gates y validaciones
- `workflows/`: Definiciones de workflows
- `reports/`: Reportes generados

### Variables de Entorno
```bash
export METRICS_URL=http://localhost:3000/metrics
export METRICS_PROVIDER=prometheus
export SCAN_GLOBS_PATH=config/scan-globs.json
```

## 🎯 Mejores Prácticas

### Desarrollo
1. **Siempre ejecutar tests antes de commit**
2. **Mantener cobertura ≥85% en módulos críticos**
3. **Usar gates de calidad en CI/CD**
4. **Documentar cambios en workflows**

### Operaciones
1. **Monitorear métricas de latencia p95**
2. **Ejecutar scans de seguridad diarios**
3. **Revisar reportes de compliance semanalmente**
4. **Mantener documentación actualizada**

### Seguridad
1. **Nunca commitear secretos**
2. **Usar variables de entorno para configuración**
3. **Ejecutar gitleaks en cada PR**
4. **Revisar APIs prohibidas regularmente**

---

**¿Necesitas ayuda?** Revisa los logs en `reports/` o ejecuta `npm run test:e2e` para diagnóstico completo.
