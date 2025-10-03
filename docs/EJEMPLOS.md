# Ejemplos Reales de QuanNex

## 📊 Ejemplo de Métricas Prometheus

### Endpoint `/metrics`
```bash
curl http://localhost:3000/metrics
```

**Salida típica:**
```
# HELP qn_http_requests_total Total HTTP requests
# TYPE qn_http_requests_total counter
qn_http_requests_total{route="/health",method="GET",code="200"} 42
qn_http_requests_total{route="/metrics",method="GET",code="200"} 15

# HELP qn_http_request_duration_seconds HTTP request duration
# TYPE qn_http_request_duration_seconds histogram
qn_http_request_duration_seconds_bucket{route="/health",method="GET",code="200",le="0.1"} 40
qn_http_request_duration_seconds_bucket{route="/health",method="GET",code="200",le="0.5"} 42
qn_http_request_duration_seconds_sum{route="/health",method="GET",code="200"} 1.234
qn_http_request_duration_seconds_count{route="/health",method="GET",code="200"} 42
```

### Interpretación
- **42 requests** al endpoint `/health`
- **p95 latencia**: ~0.1 segundos (muy rápido)
- **Suma total**: 1.234 segundos
- **Promedio**: 1.234/42 = 29ms por request

## 🔒 Ejemplo de Policy Check

### Ejecución
```bash
node scripts/policy-check.mjs
```

**Salida exitosa:**
```
[POLICY] 🚀 Iniciando Policy Check...
[POLICY] 🔍 Verificando archivos críticos...
[POLICY] ✅ Archivos críticos presentes.
[POLICY] 🔍 Verificando configuración de escaneo...
[POLICY] ✅ Policy Check: 464 archivos encontrados para escanear.
[POLICY] 🔍 Escaneando APIs prohibidas...
[POLICY] ✅ Verificación de APIs prohibidas OK.
[POLICY] 🔍 Escaneando secretos en código...
[POLICY] ✅ Verificación de secretos OK.
[POLICY] ✅ Policy Check completado exitosamente.
```

**Salida con errores:**
```
[POLICY] 🚀 Iniciando Policy Check...
[POLICY] 🔍 Verificando archivos críticos...
❌ [POLICY-FAIL] Archivos críticos faltantes: package.json

[POLICY] 🔍 Verificando configuración de escaneo...
❌ [POLICY-FAIL] Se detectaron APIs prohibidas:
 - src/malicious.js:15 eval( - "const result = eval(userInput);"
 - src/unsafe.js:8 exec( - "exec('rm -rf /');"
```

## 🔍 Ejemplo de Scan Gate

### Configuración (`config/scan-globs.json`)
```json
{
  "code": [
    "src/**/*.{ts,js,mjs}",
    "agents/**/*.{js,mjs}"
  ],
  "configs": [
    "**/*.{json,yml,yaml}",
    "package*.json",
    "*.config.{js,ts}"
  ],
  "security": [
    "**/*.env*",
    "**/*secret*",
    "**/*key*"
  ]
}
```

### Ejecución
```bash
node scripts/scan-gate.mjs
```

**Salida exitosa:**
```
🔍 Scan Gate - Verificando archivos escaneados...

✅ [SCAN-GATE] OK (464 archivos escaneados)

📊 Detalles del scan:
  Archivos escaneados: 464
  Vulnerabilidades encontradas: 0
  Archivos de código: 171
  Archivos de configuración: 217
  Archivos de seguridad: 3
```

## 📈 Ejemplo de Quality Gate

### Ejecución
```bash
npm run quality:gate
```

**Salida exitosa:**
```
[QUALITY] 🚀 Iniciando Quality Gate...
[QUALITY] Escaneo de "archivos a medias" OK.
[QUALITY] Chequeo de tamaño de archivo OK.
[QUALITY] ✅ Quality Gate completado exitosamente.
```

**Salida con problemas:**
```
[QUALITY] 🚀 Iniciando Quality Gate...
[QUALITY] Escaneo de "archivos a medias" OK.
[QUALITY] Chequeo de tamaño de archivo OK.
[QUALITY] Warning: 27 archivos sin tests:
 - src/server.ts
 - src/server.mjs
 - utils/workflow-json-fix.mjs
[QUALITY-FAIL] No existe coverage/lcov.info. Ejecuta "npm run test:cov" antes del gate.
```

## 🧪 Ejemplo de Test E2E

### Reporte generado (`reports/e2e-test-report.json`)
```json
{
  "timestamp": "2025-10-02T22:28:08.977Z",
  "environment": "docker",
  "tests": {
    "server_health": true,
    "metrics_endpoint": false,
    "quality_gate": false,
    "policy_check": true,
    "scan_gate": true,
    "metrics_gate": false,
    "workflow_simulation": true
  },
  "summary": {
    "total_tests": 7,
    "passed": 4,
    "failed": 3,
    "success_rate": "57%"
  }
}
```

### Interpretación
- ✅ **4/7 tests pasaron** (57% de éxito)
- ✅ **Servidor saludable**: Endpoint `/health` responde
- ✅ **Policy Check**: Configuración válida
- ✅ **Scan Gate**: 464 archivos escaneados
- ⚠️ **Métricas**: Endpoint `/metrics` con error 500
- ⚠️ **Quality Gate**: Falta cobertura de tests

## 🔄 Ejemplo de Workflow Completo

### Definición (`workflows/workflow-quannex-fault-detection.json`)
```json
{
  "name": "QuanNex Fault Detection",
  "description": "Detección avanzada de fallas en el sistema",
  "steps": [
    {
      "id": "context_analysis",
      "agent": "context",
      "tool": "analyze_project_state",
      "timeout": 30
    },
    {
      "id": "security_scan",
      "agent": "security", 
      "tool": "run_vulnerability_scan",
      "timeout": 60
    },
    {
      "id": "metrics_collection",
      "agent": "metrics",
      "tool": "collect_metrics",
      "timeout": 15
    }
  ]
}
```

### Ejecución
```bash
node orchestration/orchestrator-gateway.js workflows/workflow-quannex-fault-detection.json
```

**Salida típica:**
```
🚀 Iniciando workflow: QuanNex Fault Detection
📋 Ejecutando paso 1/3: context_analysis
✅ Context analysis completado en 2.3s
📋 Ejecutando paso 2/3: security_scan  
✅ Security scan completado en 45.2s
📋 Ejecutando paso 3/3: metrics_collection
✅ Metrics collection completado en 1.1s
🎉 Workflow completado exitosamente en 48.6s
```

## 🐳 Ejemplo de Docker E2E

### Build de imagen
```bash
docker build -f Dockerfile.test -t quannex-e2e-test .
```

**Salida:**
```
#0 building with "desktop-linux" instance using docker driver
#1 [internal] load build definition from Dockerfile.test
#2 [internal] load metadata for docker.io/library/node:20-alpine
#3 [1/13] FROM docker.io/library/node:20-alpine
#4 [2/13] RUN apk add --no-cache curl
#5 [3/13] WORKDIR /app
#6 [4/13] COPY package*.json ./
#7 [5/13] RUN npm ci
#8 [6/13] COPY src/ ./src/
#9 [7/13] COPY agents/ ./agents/
#10 [8/13] COPY scripts/ ./scripts/
#11 [9/13] COPY config/ ./config/
#12 [10/13] EXPOSE 3000
#13 [11/13] CMD ["node", "scripts/e2e-test.mjs"]
#14 exporting to image
#15 DONE 6.4s
```

### Ejecución en contenedor
```bash
docker run --rm quannex-e2e-test
```

**Salida:**
```
[E2E] 🚀 Iniciando test e2e de QuanNex...
[E2E] 🔍 Verificando salud del servidor...
[E2E] ⚠️ Servidor no disponible: fetch failed
[E2E] 📊 Verificando endpoint de métricas...
[E2E] ⚠️ Error en endpoint de métricas: fetch failed
[E2E] 🚪 Ejecutando Quality Gate...
[E2E] ⚠️ Quality Gate falló: Command failed
[E2E] 🔒 Ejecutando Policy Check...
[E2E] ✅ Policy Check pasó
[E2E] 🔍 Ejecutando Scan Gate...
[E2E] ✅ Scan Gate pasó
[E2E] 📈 Ejecutando Metrics Gate...
[E2E] ⚠️ Metrics Gate falló: Command failed
[E2E] 🔄 Simulando workflow completo...
[E2E] ⚠️ /health: fetch failed
[E2E] ⚠️ /metrics: fetch failed
[E2E] ⚠️ /agent/metrics: fetch failed
[E2E] ⚠️ /agent/security: fetch failed
[E2E] 📋 Generando reporte e2e...
[E2E] 📄 Reporte guardado en: reports/e2e-test-report.json

❌ [E2E-FAIL] Test e2e falló: solo 3/7 tests pasaron (43%)
```

## 📊 Ejemplo de Cobertura de Tests

### Ejecución
```bash
npm run test:cov
```

**Salida:**
```
 RUN  v3.2.4 /Users/felipe/Developer/startkit-main
      Coverage enabled with istanbul

 ✓ src/math/add.test.ts (10 tests) 2ms
 ✓ src/tools/fetchUser.test.ts (7 tests) 104ms
 ✓ agents/security/agent.test.ts (8 tests) 22ms

 Test Files  3 passed (3)
      Tests  25 passed (25)

 % Coverage report from istanbul
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |    0.56 |     0.94 |    0.91 |    0.57 |                   
 src/math          |     100 |      100 |     100 |     100 |                   
  add.ts           |     100 |      100 |     100 |     100 |                   
 src/tools         |     100 |    88.88 |     100 |     100 |                   
  fetchUser.ts     |     100 |    88.88 |     100 |     100 | 39                
 agents/security   |     100 |      100 |     100 |     100 |                   
  agent.mjs        |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

### Interpretación
- ✅ **src/math**: 100% cobertura (perfecto)
- ✅ **src/tools**: 100% líneas, 88.88% branches
- ✅ **agents/security**: 100% cobertura (perfecto)
- 📊 **Total**: 56% cobertura general (mejorable)

## 🔧 Ejemplo de Troubleshooting

### Problema: "unknown_metric_type"
```bash
# Diagnóstico
curl http://localhost:3000/metrics
# Respuesta: 500 Internal Server Error

# Solución
pkill -f "node src/server.mjs"
node src/server.mjs &
sleep 3
curl http://localhost:3000/metrics
# Respuesta: Métricas Prometheus válidas
```

### Problema: "0 archivos escaneados"
```bash
# Diagnóstico
cat config/scan-globs.json
# Verificar configuración

# Solución
node scripts/policy-check.mjs
# Respuesta: ✅ Policy Check: 464 archivos encontrados para escanear
```

### Problema: Quality Gate falla
```bash
# Diagnóstico
npm run test:cov
# Generar cobertura

# Solución
npm run quality:gate
# Respuesta: ✅ Quality Gate completado exitosamente
```

---

**💡 Tip**: Siempre revisa los logs en `reports/` para diagnóstico detallado de problemas.
