# 📋 Tareas Específicas Nivel 2 - QuanNex Consolidación

## 🎯 Tareas Prioritarias para Completar Nivel 2

---

## 🔹 Semana 2 - Tareas Pendientes (Seguridad & Compliance)

### 🟡 Tarea 2.4: Implementar Policy Gate

**Objetivo:** Detectar y bloquear código inseguro antes de merge

#### Subtareas:
- [ ] **2.4.1:** Detectar APIs prohibidas
  ```bash
  # Buscar patrones peligrosos
  grep -r "eval\|exec\|Function\|setTimeout.*string\|setInterval.*string" src/ agents/
  ```

- [ ] **2.4.2:** Detectar secretos en claro
  ```bash
  # Buscar patrones de secretos
  grep -r "password.*=.*['\"].*['\"]\|api_key.*=.*['\"].*['\"]\|secret.*=.*['\"].*['\"]" src/ agents/
  ```

- [ ] **2.4.3:** Validar configuración crítica
  ```bash
  # Verificar archivos de configuración críticos
  test -f .env.example && echo "✅ .env.example exists" || echo "❌ Missing .env.example"
  test -f config/scan-globs.json && echo "✅ scan-globs.json exists" || echo "❌ Missing scan-globs.json"
  ```

- [ ] **2.4.4:** Crear script de policy check
  ```javascript
  // scripts/policy-check.mjs
  // Implementar validaciones de seguridad
  ```

### 🟡 Tarea 2.5: Integrar gitleaks

**Objetivo:** Detección automática de secretos en commits

#### Subtareas:
- [ ] **2.5.1:** Instalar gitleaks
  ```bash
  # macOS
  brew install gitleaks
  
  # Linux
  wget https://github.com/zricethezav/gitleaks/releases/latest/download/gitleaks_8.18.0_linux_x64.tar.gz
  tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
  sudo mv gitleaks /usr/local/bin/
  ```

- [ ] **2.5.2:** Configurar gitleaks
  ```toml
  # .gitleaks.toml
  [rules]
    # Reglas personalizadas para el proyecto
  ```

- [ ] **2.5.3:** Integrar en GitHub Actions
  ```yaml
  # .github/workflows/security-nightly.yml
  - name: Secret Scan
    uses: gitleaks/gitleaks-action@v2
  ```

---

## 🔹 Semana 3 - Tareas Prioritarias (Testing reforzado)

### 🔴 Tarea 3.1: Tests unitarios para tools

**Objetivo:** Cobertura ≥85% en `src/tools/`

#### Subtareas:
- [ ] **3.1.1:** Mejorar `src/tools/fetchUser.test.ts`
  ```typescript
  // Agregar casos edge y error handling
  describe('fetchUser error handling', () => {
    it('should handle network errors', async () => {
      // Test de error de red
    });
    
    it('should handle invalid responses', async () => {
      // Test de respuesta inválida
    });
  });
  ```

- [ ] **3.1.2:** Expandir `src/math/add.test.ts`
  ```typescript
  // Agregar casos edge
  describe('add edge cases', () => {
    it('should handle negative numbers', () => {
      expect(add(-1, -2)).toBe(-3);
    });
    
    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
    });
  });
  ```

- [ ] **3.1.3:** Crear tests para nuevas tools
  ```typescript
  // src/tools/newTool.test.ts
  // Tests para cualquier nueva tool agregada
  ```

### 🔴 Tarea 3.2: Tests unitarios para agentes

**Objetivo:** Cobertura ≥85% en `agents/`

#### Subtareas:
- [ ] **3.2.1:** Expandir `agents/metrics/agent.test.ts`
  ```typescript
  describe('metrics agent integration', () => {
    it('should connect to Prometheus server', async () => {
      // Test de conexión real
    });
    
    it('should parse Prometheus metrics correctly', async () => {
      // Test de parsing
    });
  });
  ```

- [ ] **3.2.2:** Expandir `agents/security/agent.test.ts`
  ```typescript
  describe('security agent integration', () => {
    it('should read scan-globs.json correctly', async () => {
      // Test de configuración
    });
    
    it('should scan files using globby', async () => {
      // Test de escaneo
    });
  });
  ```

- [ ] **3.2.3:** Crear tests para otros agentes
  ```typescript
  // agents/context/agent.test.ts
  // agents/optimization/agent.test.ts
  // agents/rules/agent.test.ts
  // agents/prompting/agent.test.ts
  ```

### 🔴 Tarea 3.3: Tests e2e en Docker

**Objetivo:** Validar workflow completo en container

#### Subtareas:
- [ ] **3.3.1:** Crear Dockerfile
  ```dockerfile
  # Dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  EXPOSE 3000
  CMD ["npm", "start"]
  ```

- [ ] **3.3.2:** Crear docker-compose.yml
  ```yaml
  # docker-compose.yml
  version: '3.8'
  services:
    quannex:
      build: .
      ports:
        - "3000:3000"
      environment:
        - NODE_ENV=test
  ```

- [ ] **3.3.3:** Crear script de test e2e
  ```bash
  # scripts/test-e2e.sh
  # Script para ejecutar workflow completo en Docker
  ```

- [ ] **3.3.4:** Integrar en CI
  ```yaml
  # .github/workflows/test-e2e.yml
  # Workflow para tests e2e en Docker
  ```

---

## 🔹 Semana 4 - Tareas Prioritarias (Documentación viva)

### 🔴 Tarea 4.1: Actualizar README.md

**Objetivo:** Documentación autoexplicativa

#### Subtareas:
- [ ] **4.1.1:** Quick start section
  ```markdown
  ## 🚀 Quick Start
  
  ### Prerequisites
  - Node.js 20+
  - npm 9+
  
  ### Installation
  ```bash
  git clone https://github.com/fegome90-cmd/QuanNex.git
  cd QuanNex
  npm install
  ```
  
  ### Running QuanNex
  ```bash
  ./scripts/execute-quannex-fault-detection.sh
  ```
  ```

- [ ] **4.1.2:** Architecture section
  ```markdown
  ## 🏗️ Architecture
  
  QuanNex consists of 7 specialized agents:
  - **Context Agent:** Analyzes system context
  - **Security Agent:** Performs security audits
  - **Metrics Agent:** Collects performance metrics
  - **Optimization Agent:** Identifies optimization opportunities
  - **Rules Agent:** Validates compliance
  - **Prompting Agent:** Synthesizes findings
  - **Fault-Synthesis Agent:** Generates remediation plans
  ```

- [ ] **4.1.3:** Troubleshooting section
  ```markdown
  ## 🔧 Troubleshooting
  
  ### Common Issues
  - **unknown_metric_type:** Check if metrics server is running
  - **files_scanned=0:** Verify scan-globs.json configuration
  - **Quality gate failures:** Check test coverage and code duplication
  ```

### 🔴 Tarea 4.2: Crear tutorial completo

**Objetivo:** Guía paso a paso para usuarios

#### Subtareas:
- [ ] **4.2.1:** Crear `docs/USAGE.md`
  ```markdown
  # 📖 QuanNex Usage Guide
  
  ## Running a Complete Workflow
  
  ### Step 1: Start the Metrics Server
  ```bash
  node src/server.mjs &
  ```
  
  ### Step 2: Execute the Workflow
  ```bash
  ./scripts/execute-quannex-fault-detection.sh
  ```
  
  ### Step 3: Review Results
  ```bash
  ls .reports/wf_*/
  ```
  ```

- [ ] **4.2.2:** Agregar ejemplos reales
  ```markdown
  ## 📊 Example Metrics Output
  
  ```json
  {
    "performance": {
      "status": "ok",
      "response_time_p50_ms": 245,
      "response_time_p95_ms": 450,
      "response_time_p99_ms": 800,
      "requests_count": 150
    }
  }
  ```
  ```

- [ ] **4.2.3:** Documentar extensibilidad
  ```markdown
  ## 🔧 Adding New Agents
  
  ### Step 1: Create Agent File
  ```javascript
  // agents/new-agent/agent.js
  export async function runNewAgent(input) {
    // Implementation
  }
  ```
  
  ### Step 2: Add to Workflow
  ```json
  // workflows/workflow-quannex-fault-detection.json
  {
    "step_id": "new_agent_analysis",
    "agent": "new-agent",
    "description": "New agent analysis"
  }
  ```
  ```

---

## 🎯 Tareas Críticas para Esta Semana

### Prioridad Alta:
1. **Completar Policy Gate** (Tarea 2.4)
2. **Integrar gitleaks** (Tarea 2.5)
3. **Iniciar tests unitarios** (Tarea 3.1)

### Prioridad Media:
4. **Preparar infraestructura Docker** (Tarea 3.3)
5. **Actualizar README.md** (Tarea 4.1)

### Prioridad Baja:
6. **Crear tutorial completo** (Tarea 4.2)
7. **Documentación técnica** (Tarea 4.3)

---

## 📊 Métricas de Éxito

### Semana 2 (Seguridad):
- [ ] Policy Gate implementado y funcionando
- [ ] gitleaks integrado en CI
- [ ] 0 secretos detectados en el repo

### Semana 3 (Testing):
- [ ] Cobertura ≥85% en tools/ y agents/
- [ ] Tests e2e funcionando en Docker
- [ ] Quality gates reforzados

### Semana 4 (Documentación):
- [ ] README.md completo y actualizado
- [ ] Tutorial paso a paso creado
- [ ] Ejemplos reales documentados

---

## 🚀 Comandos de Ejecución

### Para ejecutar tareas de seguridad:
```bash
# Verificar configuración actual
./scripts/policy-check.mjs
./scripts/scan-gate.mjs

# Ejecutar security audit
npm audit --omit=dev --audit-level=high
```

### Para ejecutar tests:
```bash
# Tests unitarios
npm test

# Tests con cobertura
npm run test:cov

# Quality gate
npm run quality:gate
```

### Para ejecutar workflow completo:
```bash
# Workflow QuanNex
./scripts/execute-quannex-fault-detection.sh

# Verificar resultados
ls .reports/wf_*/
```
