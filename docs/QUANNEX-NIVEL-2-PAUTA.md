# 🥈 Pauta de Ejecución – Nivel 2 (Consolidación)
## QuanNex: De "Ya no se rompe" → "Ya da confianza real"

---

## 🎯 Objetivos del Nivel 2

- **Métricas accionables visibles** y gates que fallen cuando algo no cuadra
- **Auditoría de seguridad y compliance mínimas** que bloqueen código inseguro
- **Tests reforzados** (unit + e2e) con cobertura aceptable en módulos críticos
- **Documentación viva** que enseñe a levantar y mantener QuanNex paso a paso

---

## 📅 Plan en 4 hitos semanales

### 🔹 Semana 1 — Métricas accionables

#### Objetivos:
1. Conectar agente de métricas al endpoint `/metrics` (Prometheus + prom-client)
2. Implementar Metrics Gate → falla si aparece `unknown_metric_type`
3. Asegurar exportación de:
   - p50 / p95 / p99 (latencia)
   - RPS (requests por segundo aprox)
   - Error-rate básico
4. Validar en workflow: paso Metrics Gate pasa consistentemente

#### Tareas específicas:
- [ ] **Tarea 1.1:** Verificar servidor Prometheus (`src/server.mjs`)
  - Validar que expone `/metrics` correctamente
  - Confirmar métricas de latencia (histogram buckets)
  - Verificar contadores de requests

- [ ] **Tarea 1.2:** Conectar agente de métricas (`agents/metrics/agent.js`)
  - Validar conexión a `http://localhost:3000/metrics`
  - Confirmar parsing de texto Prometheus
  - Verificar mapeo a categorías válidas (performance, security, reliability, maintainability)

- [ ] **Tarea 1.3:** Implementar Metrics Gate (`scripts/metrics-gate.mjs`)
  - Validar que falla si hay `unknown_metric_type`
  - Confirmar que pasa cuando métricas son válidas
  - Integrar en CI pipeline

- [ ] **Tarea 1.4:** Validar en workflow completo
  - Ejecutar `./scripts/execute-quannex-fault-detection.sh`
  - Confirmar que Metrics Gate pasa consistentemente
  - Documentar métricas exportadas

#### ✅ Entregable: 
Pipeline que reporta métricas reales y nunca más "unknown_metric_type"

---

### 🔹 Semana 2 — Security & Compliance

#### Objetivos:
1. Conectar agente de seguridad a `config/scan-globs.json`
2. Implementar Scan Gate → falla si `files_scanned = 0`
3. Agregar Policy Gate (APIs prohibidas, secretos en claro, etc.)
4. Ajustar Security Audit en CI:
   - En PR: `npm audit --omit=dev --audit-level=high` (rápido)
   - Nightly: audit completo + secret scan (ej: gitleaks)

#### Tareas específicas:
- [ ] **Tarea 2.1:** Verificar configuración de escaneo (`config/scan-globs.json`)
  - Confirmar que encuentra archivos reales (462 archivos)
  - Validar patrones de globs para código y configuraciones
  - Probar con diferentes tipos de archivos

- [ ] **Tarea 2.2:** Conectar agente de seguridad (`agents/security/agent.js`)
  - Validar lectura de `config/scan-globs.json`
  - Confirmar escaneo de archivos usando globby
  - Verificar reporte de archivos escaneados

- [ ] **Tarea 2.3:** Implementar Scan Gate (`scripts/scan-gate.mjs`)
  - Validar que falla si `files_scanned = 0`
  - Confirmar que pasa cuando encuentra archivos
  - Integrar en CI pipeline

- [ ] **Tarea 2.4:** Implementar Policy Gate (`scripts/policy-check.mjs`)
  - Detectar APIs prohibidas (eval, exec, etc.)
  - Detectar secretos en claro (API keys, passwords)
  - Validar configuración de archivos críticos

- [ ] **Tarea 2.5:** Configurar Security Audit en CI
  - PR-fast: timeout 2min, audit-level=high
  - Nightly: audit completo con secret scan
  - Integrar gitleaks para detección de secretos

#### ✅ Entregable: 
Pipeline que nunca pasa con 0 archivos escaneados y bloquea código inseguro

---

### 🔹 Semana 3 — Testing reforzado

#### Objetivos:
1. Subir cobertura a ≥85% en `agents/` y `tools/`
   - Cada tool con: test de happy path + test de error
   - Cada agente con: selección de tool, manejo de error, salida formateada
2. Integrar tests e2e básicos en Docker:
   - Arrancar QuanNex en container
   - Simular 1 flujo completo (plan → ejecución → logs)
   - Validar que gates pasan dentro de Docker
3. Reforzar quality gate con cobertura por directorio (no global)

#### Tareas específicas:
- [ ] **Tarea 3.1:** Tests unitarios para tools (`src/tools/`)
  - `fetchUser.test.ts`: happy path + error handling
  - `math/add.test.ts`: casos edge + validación
  - Cobertura objetivo: ≥85% líneas

- [ ] **Tarea 3.2:** Tests unitarios para agentes (`agents/`)
  - `agents/metrics/agent.test.ts`: conexión Prometheus + parsing
  - `agents/security/agent.test.ts`: escaneo + configuración
  - `agents/context/agent.test.ts`: análisis contextual
  - Cobertura objetivo: ≥85% líneas

- [ ] **Tarea 3.3:** Tests e2e en Docker
  - `Dockerfile` para QuanNex
  - `docker-compose.yml` con servicios necesarios
  - Script de test e2e completo
  - Validación de gates dentro de container

- [ ] **Tarea 3.4:** Reforzar Quality Gate (`scripts/quality-gate.mjs`)
  - Cobertura por directorio específico
  - Umbrales diferenciados por criticidad
  - Detección de archivos sin tests

- [ ] **Tarea 3.5:** Integrar en CI pipeline
  - Tests unitarios en cada PR
  - Tests e2e en nightly builds
  - Coverage reports en GitHub Actions

#### ✅ Entregable: 
Gates que bloquean si falta test en tools/agents o si cobertura <85%

---

### 🔹 Semana 4 — Documentación viva

#### Objetivos:
1. Actualizar README.md con:
   - Cómo levantar el proyecto (local y Docker)
   - Explicación de cada gate
   - Cómo interpretar métricas
2. Crear tutorial paso a paso (ejemplo: `docs/USAGE.md`):
   - "Cómo correr un workflow completo"
   - "Cómo agregar una nueva tool"
   - "Cómo pasan/fallan los gates"
3. Agregar ejemplos reales en la documentación (capturas, JSON de métricas, etc.)

#### Tareas específicas:
- [ ] **Tarea 4.1:** Actualizar README.md principal
  - Quick start: instalación y ejecución
  - Arquitectura del sistema QuanNex
  - Explicación de cada componente
  - Troubleshooting común

- [ ] **Tarea 4.2:** Crear tutorial completo (`docs/USAGE.md`)
  - Paso a paso: ejecutar workflow completo
  - Cómo agregar nueva tool/agente
  - Interpretación de métricas y reportes
  - Configuración de gates

- [ ] **Tarea 4.3:** Documentación técnica (`docs/TECHNICAL.md`)
  - Arquitectura de agentes
  - Protocolo de comunicación
  - Extensibilidad del sistema
  - Performance y escalabilidad

- [ ] **Tarea 4.4:** Ejemplos prácticos
  - Capturas de pantalla de métricas
  - JSON de reportes reales
  - Logs de ejecución exitosa
  - Casos de uso comunes

- [ ] **Tarea 4.5:** Documentación de desarrollo
  - Cómo contribuir al proyecto
  - Estándares de código
  - Proceso de testing
  - Release process

#### ✅ Entregable: 
Repo con documentación autoexplicativa que cualquier dev puede levantar y mantener

---

## 🚦 Gates de salida (checklist Nivel 2)

### Métricas:
- [ ] **Metrics Gate:** no más `unknown_metric_type`
- [ ] **Métricas exportadas:** p50/p95/p99, RPS, error-rate
- [ ] **Consistencia:** Metrics Gate pasa en 100% de ejecuciones

### Seguridad:
- [ ] **Scan Gate:** nunca más `files_scanned=0`
- [ ] **Policy Gate:** bloquea APIs/secretos inseguros
- [ ] **Security Audit:** PR-fast + nightly funcionando

### Testing:
- [ ] **Coverage por carpeta:** ≥85% en agents/tools
- [ ] **Tests unitarios:** happy path + error para cada tool/agente
- [ ] **Tests e2e:** workflow completo en Docker

### Documentación:
- [ ] **README:** actualizado con quick start
- [ ] **Tutorial:** paso a paso completo
- [ ] **Ejemplos:** capturas y JSON reales

---

## 📌 Resumen de hitos:

- **Semana 1** → Métricas accionables
- **Semana 2** → Seguridad & Compliance  
- **Semana 3** → Tests reforzados
- **Semana 4** → Documentación viva

---

## 🎯 Estado actual vs objetivo:

### ✅ Ya implementado (Nivel 1):
- Sistema multi-agente funcionando
- Workflow de detección de fallas operativo
- Métricas básicas exportadas
- Security audit configurado
- Quality gates básicos

### 🎯 Objetivo Nivel 2:
- Métricas accionables y confiables
- Seguridad robusta con compliance
- Tests comprehensivos con cobertura alta
- Documentación completa y viva

**Resultado:** Sistema QuanNex que da confianza real para uso en producción
