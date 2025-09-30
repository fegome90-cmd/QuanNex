# Manual Completo del Proyecto Cursor

## Guía Definitiva del Sistema

---

## 1. Visión General del Proyecto

### ¿Qué es Cursor?

Cursor es un sistema avanzado de **inicialización y gestión de proyectos Claude Code** que implementa principios del **Toyota Production System** para garantizar estabilidad, calidad y mejora continua. Está diseñado como un kit de inicialización basado en shell scripts que crea proyectos especializados con configuraciones optimizadas y agentes MCP integrados.

### Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    Proyecto Cursor                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Core      │  │  Agentes    │  │ Orquestador │              │
│  │  Scripts    │  │   MCP       │  │  Workflows  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   TaskDB    │  │ Benchmarks  │  │  Sistema    │              │
│  │   Gestión   │  │  Métricas   │  │ Autónomo    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Plantillas  │  │ Esquemas    │  │ Documentos  │              │
│  │  Proyecto   │  │ JSON        │  │  Referencia │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Filosofía de Diseño

- **Estabilidad Primero**: Sistema de "quality gates" inspirado en Toyota (A-E)
- **Autonomía de Proyecto**: Sistema independiente que puede operar sin dependencias externas
- **Operaciones Atómicas**: Staging y rollback para prevenir estados parciales
- **Contratos MCP**: Validación estricta de esquemas JSON (v1.0.0)

### Separación Clara de Proyectos

**IMPORTANTE**: Cursor es un sistema **completamente independiente** y autónomo. Para evitar confusiones, es crucial entender la separación entre proyectos:

#### Proyecto Cursor (Sistema Interno)
- **Propósito**: Kit de inicialización y gestión de proyectos Claude Code
- **Características**: Autónomo, no requiere servicios externos
- **Ubicación**: `/core/claude-project-init.sh` y agentes internos
- **Dependencias**: Solo herramientas estándar del sistema

#### Archon (Proyecto Externo Independiente)
- **Propósito**: Servidor MCP externo con servicios distribuidos
- **Características**: Sistema separado con su propia arquitectura
- **Ubicación**: Proyecto independiente con recursos exclusivos
- **Relación**: **Opcional** - Cursor puede operar sin Archon

#### Antigeneric (Proyecto Externo Independiente)
- **Propósito**: Sistema anti-genérico con recursos propios
- **Características**: Proyecto separado con arquitectura única
- **Ubicación**: Recursos y configuración completamente independientes
- **Relación**: **Opcional** - Cursor puede operar sin Antigeneric

### Relaciones y Dependencias

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ecosistema de Proyectos                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Cursor    │  │   Archon    │  │ Antigeneric │              │
│  │  (Interno)  │  │  (Externo)  │  │  (Externo)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Autónomo    │  │ Servidor    │  │ Recursos    │              │
│  │ 100%        │  │  MCP        │  │  Propios    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Sin       │  │   Opcional  │  │   Opcional  │              │
│  │ Dependencias│  │ Integración │  │ Integración │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Principio de Autonomía**: Cursor está diseñado para funcionar perfectamente sin Archon o Antigeneric. Estas integraciones son mejoras opcionales, no requisitos.

### Documentación de Proyectos Externos

#### Archon - Servidor MCP Externo

**Archon** es un proyecto independiente que proporciona servicios MCP distribuidos. Aunque puede integrarse opcionalmente con Cursor, es un sistema completamente separado con su propia arquitectura y recursos.

**Características de Archon**:
- Servidor MCP independiente con servicios distribuidos
- Recursos exclusivos en carpetas externas dedicadas
- Arquitectura propia y configuración independiente
- **Relación con Cursor**: Opcional y externa

**Integración Opcional** (si está disponible):
```bash
# Estas operaciones requieren Archon instalado separadamente
# y son OPCIONALES para el funcionamiento de Cursor

# Gestión de proyectos externos (si Archon está disponible)
archon:manage_project(action="create", title="Proyecto Archon")

# Investigación avanzada (si Archon está disponible)
archon:perform_rag_query(query="patrones avanzados", match_count=5)
```

#### Antigeneric - Sistema Anti-Genérico

**Antigeneric** es otro proyecto independiente que mantiene recursos y configuración completamente separados de Cursor.

**Características de Antigeneric**:
- Sistema independiente con arquitectura propia
- Recursos exclusivos y configuración separada
- Funcionamiento autónomo completo
- **Relación con Cursor**: Ninguna dependencia directa

**Nota Importante**: Antigeneric opera en su propio ecosistema y no afecta el funcionamiento autónomo de Cursor.

### Tipos de Proyecto Soportados

1. **Frontend**: React/Vue/Angular con testing Playwright
2. **Backend**: Node.js/Python/Go con arquitectura escalable
3. **Fullstack**: Combinación frontend + backend con DevOps
4. **Médico**: Cumplimiento HIPAA + auditorías de seguridad
5. **Diseño**: Sistema anti-genérico con validación de unicidad
6. **Genérico**: Plantilla base mínima para personalización

---

## 2. Sistema MCP

### ¿Qué es MCP?

**Model Context Protocol (MCP)** es un protocolo que permite a los modelos de IA interactuar con herramientas y fuentes de datos externas de manera segura y estructurada. Cursor implementa agentes MCP especializados que siguen contratos estrictos de entrada/salida.

### Arquitectura MCP en Cursor

```
┌─────────────────────────────────────────────────────────────┐
│                    Sistema MCP Cursor                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   @context  │  │ @prompting  │  │   @rules    │          │
│  │   Agent     │  │   Agent     │  │   Agent     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Servidor   │  │  Cliente    │  │  Esquemas   │          │
│  │   MCP       │  │   JSON      │  │  Validación │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ run-clean.sh│  │ Sandbox     │  │ Contratos   │          │
│  │  Wrapper    │  │  Seguro     │  │  Test       │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Agentes Disponibles

#### @context Agent

**Propósito**: Agrega extractos contextuales de fuentes del repositorio, filtra por selectores y devuelve bundles con trazabilidad de procedencia.

**Características**:
- Fuentes máximas: 50 archivos
- Selectores máximos: 50 patrones
- Auto-ajuste: `max_tokens < 256` → 256
- Protección contra ataques: Rechaza `..` y rutas absolutas

**Ejemplo de Uso**:
```bash
cat payloads/context-test-payload.json | node agents/context/agent.js
core/scripts/run-clean.sh context payloads/context-test-payload.json
```

**Payload de Ejemplo**:
```json
{
  "sources": [
    "agents/README.md",
    "agents/context/README.md",
    "CLAUDE.md"
  ],
  "selectors": [
    "purpose",
    "inputs",
    "outputs",
    "commands"
  ],
  "max_tokens": 512
}
```

#### @prompting Agent

**Propósito**: Genera pares de prompts sistema/usuario usando orquestación determinística estilo MCP con E/S validada por esquema.

**Estilos Disponibles**:
- `default`, `formal`, `concise`, `creative`, `technical`

**Ejemplo de Uso**:
```bash
cat payloads/prompting-test-payload.json | node agents/prompting/agent.js
core/scripts/run-clean.sh prompting payloads/prompting-test-payload.json
```

#### @rules Agent

**Propósito**: Compila documentos de políticas referenciados en guardrails accionables, marca artefactos faltantes y emite guía de asesoramiento con contratos MCP determinísticos.

**Niveles de Cumplimiento**:
- `none`, `basic`, `strict`

**Ejemplo de Uso**:
```bash
cat payloads/rules-test-payload.json | node agents/rules/agent.js
core/scripts/run-clean.sh rules payloads/rules-test-payload.json
```

### Otros Agentes Especializados

- **@docsync**: Sincronización de documentación
- **@lint**: Análisis de calidad de código
- **@orchestrator**: Gestión de workflows
- **@refactor**: Refactorización de código
- **@secscan**: Análisis de seguridad
- **@tests**: Generación y ejecución de tests

---

## 3. Orquestador

### Funcionalidad

El orquestador (`orchestration/orchestrator.js`) es un sistema avanzado de gestión de workflows que coordina la ejecución de agentes MCP con características empresariales.

### Características Principales

- **Ejecución Paralela**: Ejecuta pasos independientes simultáneamente
- **Gestión de Dependencias**: Controla el orden de ejecución basado en dependencias
- **Sistema de Reintentos**: Hasta 5 reintentos configurables por paso
- **Gates de Calidad**: Validación condicional con `pass_if`
- **Timeouts Configurables**: Control de tiempo de ejecución por paso
- **Persistencia de Estado**: Guarda workflows en `.reports/workflows.json`
- **Logging Estructurado**: Registros detallados por paso y workflow

### Estados de Workflow

```javascript
const STATUS = {
  PENDING: 'pending',    // Esperando ejecución
  RUNNING: 'running',    // En ejecución
  COMPLETED: 'completed', // Completado exitosamente
  FAILED: 'failed',      // Falló
  SKIPPED: 'skipped',    // Omitido por dependencia
  IDLE: 'idle'          // Inactivo
};
```

### Ejemplo de Workflow

```json
{
  "name": "Análisis Completo de Proyecto",
  "description": "Workflow para analizar calidad y seguridad",
  "context": {
    "project_type": "frontend",
    "target_dir": "."
  },
  "steps": [
    {
      "step_id": "context_analysis",
      "agent": "context",
      "action": "analyze",
      "input": {
        "sources": ["README.md", "package.json"],
        "selectors": ["dependencies", "scripts"]
      },
      "depends_on": [],
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step_id": "security_scan",
      "agent": "secscan",
      "action": "scan",
      "input": {
        "scan_type": "comprehensive"
      },
      "depends_on": ["context_analysis"],
      "pass_if": {
        "jsonpath": "$.summary.vulnerabilities",
        "equals": 0
      }
    }
  ]
}
```

### Comandos del Orquestador

```bash
# Crear workflow desde archivo JSON
node orchestration/orchestrator.js create workflow.json

# Crear workflow desde stdin
cat workflow.json | node orchestration/orchestrator.js create

# Ejecutar workflow
node orchestration/orchestrator.js execute <workflow_id>

# Ver estado de workflows
node orchestration/orchestrator.js status [workflow_id]

# Health check de agentes
node orchestration/orchestrator.js health

# Limpiar artefactos
node orchestration/orchestrator.js cleanup <workflow_id>
```

---

## 4. Sistema de Benchmarks

### Funcionalidad

El sistema de benchmarks proporciona métricas reproducibles de rendimiento para evaluar la calidad y eficiencia de los agentes y workflows.

### Métricas Principales

- **Latencia**: p50, p95, p99 de tiempos de respuesta
- **Throughput**: Operaciones por segundo
- **Uso de CPU**: Porcentaje de utilización durante ejecución
- **Uso de Memoria**: MB consumidos por operación
- **Tasa de Éxito**: Porcentaje de operaciones completadas exitosamente
- **Calidad de Output**: Métricas específicas por tipo de agente

### Reportes de Benchmarks

Los reportes se generan en `reports/bench/*.json` con estructura estandarizada:

```json
{
  "benchmark_id": "bench_20250130_143022_abc123",
  "timestamp": "2025-01-30T14:30:22.000Z",
  "agent": "context",
  "metrics": {
    "latency_p50_ms": 245,
    "latency_p95_ms": 678,
    "throughput_ops_sec": 4.2,
    "cpu_usage_percent": 15.7,
    "memory_mb": 89.3,
    "success_rate": 0.98
  },
  "samples": 100,
  "duration_ms": 30000
}
```

### Ejecución de Benchmarks

```bash
# Benchmark específico de agente
node tools/bench-agents.mjs --agent context --samples 100

# Benchmark completo del sistema
node tools/bench-agents.mjs --all --duration 60000

# Benchmark con diferentes niveles de carga
node tools/bench-agents.mjs --agent prompting --concurrency 1,5,10
```

---

## 5. TaskDB

### Funcionalidad

TaskDB es el sistema de gestión de tareas que proporciona persistencia y seguimiento de proyectos y tareas a través de una interfaz JSON portable.

### Estructura de Datos

```json
{
  "version": "1.0.0",
  "projects": [
    {
      "id": "mg6uhe8qpppazcvvons",
      "title": "Agent Context Project",
      "description": "Proyecto para el agente context",
      "docs": [],
      "features": ["Context Processing"],
      "data": {
        "agent": "context",
        "integration_version": "1.0.0"
      },
      "github_repo": null,
      "pinned": false,
      "created_at": "2025-09-30T17:42:04.634Z",
      "updated_at": "2025-09-30T17:42:04.647Z"
    }
  ],
  "tasks": []
}
```

### Estados de Tarea

- `todo`: Pendiente de ejecución
- `doing`: En progreso
- `review`: Completada, pendiente revisión
- `done`: Finalizada completamente
- `cancelled`: Cancelada

### Integración con Agentes

Los agentes pueden interactuar con TaskDB para:

1. **Crear Tareas**: Gestión directa mediante operaciones de archivo JSON
2. **Actualizar Estado**: Modificación directa del archivo de tareas
3. **Consultar Tareas**: Lectura directa desde el archivo JSON
4. **Gestión de Proyectos**: Operaciones autónomas sin dependencias externas

### Ejemplo de Uso Autónomo

```javascript
// Crear proyecto directamente en TaskDB
const fs = require('fs');
const taskdbPath = 'data/taskdb.json';

let taskdb = JSON.parse(fs.readFileSync(taskdbPath, 'utf8'));

// Crear nuevo proyecto
const newProject = {
  id: "proj_" + Date.now(),
  title: "Nuevo Proyecto Frontend",
  description: "Proyecto creado autónomamente",
  docs: [],
  features: ["Frontend Development"],
  data: {
    project_type: "frontend",
    created_by: "cursor_system"
  },
  github_repo: null,
  pinned: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

taskdb.projects.push(newProject);

// Crear tarea asociada
const newTask = {
  id: "task_" + Date.now(),
  project_id: newProject.id,
  title: "Implementar componente de login",
  description: "Crear componente de autenticación",
  status: "todo",
  feature: "Authentication",
  task_order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

taskdb.tasks.push(newTask);

// Guardar cambios
fs.writeFileSync(taskdbPath, JSON.stringify(taskdb, null, 2));
```

---

## 6. Estructura de Archivos

### Organización del Proyecto

```
cursor-project/
├── claude-project-init.sh          # Script principal de inicialización
├── core/                           # Núcleo del sistema (post PR-N)
│   ├── claude-project-init.sh      # Inicializador movido
│   ├── scripts/                    # Scripts de mantenimiento
│   │   ├── run-clean.sh           # Wrapper para agentes MCP
│   │   ├── verify-dependencies.sh # Verificación de dependencias
│   │   ├── test-claude-init.sh    # Tests de integración
│   │   └── security-scan.sh       # Análisis de seguridad
│   └── templates/                  # Plantillas de proyecto
│       ├── manifest.json          # Manifiesto de versiones
│       ├── claude/                # Configuraciones CLAUDE.md
│       └── deployment/            # Configuraciones despliegue
├── agents/                        # Agentes MCP especializados
│   ├── context/                   # Agente de procesamiento contextual
│   ├── prompting/                 # Agente de generación de prompts
│   ├── rules/                     # Agente de reglas y políticas
│   ├── docsync/                   # Sincronización de docs
│   ├── lint/                      # Análisis de calidad
│   ├── orchestrator/              # Gestión de workflows
│   ├── refactor/                  # Refactorización
│   ├── secscan/                   # Seguridad
│   └── tests/                     # Generación de tests
├── orchestration/                 # Sistema de orquestación
│   └── orchestrator.js            # Motor de workflows
├── data/                          # Datos del sistema
│   └── taskdb.json               # Base de datos de tareas
├── schemas/                       # Esquemas JSON de validación
│   ├── agent.schema.json         # Definición de agentes
│   └── agents/                   # Esquemas específicos por agente
├── docs/                          # Documentación
├── reports/                       # Reportes y métricas
│   ├── bench/                     # Resultados de benchmarks
│   └── edge/                      # Reportes especiales
├── payloads/                      # Ejemplos de payloads
├── tools/                         # Herramientas utilitarias
├── .claude/                       # Configuración Claude Code
├── .reports/                      # Artefactos de workflows
└── out/                          # Salidas de agentes
```

### Archivos Clave por Función

| Función | Archivo Principal | Descripción |
|---------|------------------|-------------|
| Inicialización | `core/claude-project-init.sh` | Script principal de creación de proyectos |
| Orquestación | `orchestration/orchestrator.js` | Motor de workflows y ejecución de agentes |
| Gestión de Tareas | `data/taskdb.json` | Base de datos de proyectos y tareas |
| Configuración | `.cursorrules` | Reglas específicas de Cursor |
| Documentación | `CLAUDE.md` | Guía de desarrollo para Claude Code |
| Auditoría | `AUDIT-CURSOR.md` | Estado del proyecto y hallazgos |

---

## 7. Comandos y Herramientas

### Comandos de Desarrollo Principales

#### Inicialización de Proyectos

```bash
# Inicialización interactiva
./core/claude-project-init.sh

# Vista previa sin crear archivos
./core/claude-project-init.sh --dry-run

# Inicialización específica por tipo
./core/claude-project-init.sh --type frontend
```

#### Gestión Autónoma del Sistema

```bash
# Health check completo del sistema
make health-check

# Verificación de configuración interna
make config-check

# Tests de integración autónomos
make integration-tests

# Tests de sistema completo
make system-tests
```

#### Testing y Calidad

```bash
# Tests de integración completos
./core/scripts/test-claude-init.sh

# Linting de shell scripts
./core/scripts/lint-shell.sh

# Escaneo de secretos
./core/scripts/scan-secrets.sh

# Verificación de dependencias
./core/scripts/verify-dependencies.sh

# Tests unitarios
./core/scripts/test-unit.sh
```

#### CI/CD y Validación

```bash
# Validación completa del proyecto
./core/scripts/validate-project.sh

# Recolección de reportes
./core/scripts/collect-reports.sh

# Health check del sistema
./core/scripts/healthcheck.sh
```

### Herramientas Especializadas

#### Análisis de Calidad

```bash
# Limpieza del workspace
node tools/cleanup.mjs

# Linting de paths
node tools/path-lint.mjs

# Linting de documentación
node tools/docs-lint.mjs

# Migración de layout
node tools/migrate-layout.mjs --dry-run
```

#### Benchmarks y Métricas

```bash
# Benchmarks de agentes
node tools/bench-agents.mjs --agent context --samples 100

# Benchmarks de sistema completo
node tools/bench-agents.mjs --all --duration 60000

# Análisis de métricas
node tools/analyze-metrics.mjs reports/bench/
```

#### Seguridad y Cumplimiento

```bash
# Escaneo de seguridad completo
./core/scripts/security-scan.sh --type=all .

# Auditoría de cumplimiento médico
./core/scripts/check-phi.sh

# Validación de configuración ESLint
./core/scripts/eslint-check.sh
```

---

## 8. Flujos de Trabajo

### Flujo de Trabajo Diario

#### Inicio de Sesión de Desarrollo

1. **Verificar Estado del Proyecto**
   ```bash
   node orchestration/orchestrator.js health
   ./core/scripts/verify-dependencies.sh
   ```

2. **Revisar Tareas Pendientes**
    ```bash
    # Usando TaskDB autónomo
    cat data/taskdb.json | jq '.tasks[] | select(.status == "todo") | .title'
    ```

3. **Investigación y Planificación**
    ```bash
    # Investigación usando agentes internos
    node agents/context/agent.js payloads/context-research-payload.json
    
    # Análisis de código existente
    node agents/lint/agent.js payloads/lint-analysis-payload.json
    ```

4. **Ejecución de Tarea**
    ```bash
    # Actualizar estado usando operaciones directas
    node tools/update-task-status.js current_task doing
    
    # Implementar siguiendo análisis interno
    # ... desarrollo ...
    
    # Marcar para revisión
    node tools/update-task-status.js current_task review
    ```

#### Fin de Sesión de Desarrollo

1. **Actualizar Estado de Tareas**
   ```bash
   # Completar tareas finalizadas
   archon:manage_task(action="update", task_id="completed_task", update_fields={"status": "done"})
   ```

2. **Crear Nuevas Tareas si es Necesario**
   ```bash
   # Crear tareas para trabajo futuro
   archon:manage_task(action="create", title="Nueva funcionalidad", task_order=5)
   ```

3. **Limpieza del Workspace**
   ```bash
   node tools/cleanup.mjs
   ```

### Flujo de Trabajo de Proyecto Completo

#### 1. Creación de Nuevo Proyecto

```bash
# 1. Crear proyecto en TaskDB autónomo
node tools/create-project.js "Mi Nuevo Proyecto" "fullstack"

# 2. Investigación inicial usando agentes internos
node agents/context/agent.js payloads/context-research-payload.json

# 3. Crear tareas de planificación
node tools/create-task.js "Diseñar arquitectura" 1
node tools/create-task.js "Configurar entorno" 2

# 4. Inicializar proyecto con Cursor
./core/claude-project-init.sh --type fullstack
```

#### 2. Desarrollo Iterativo

```bash
# 1. Obtener siguiente tarea prioritaria
cat data/taskdb.json | jq '.tasks[] | select(.status == "todo") | .title'

# 2. Investigación específica de tarea usando agentes internos
node agents/context/agent.js payloads/context-specific-payload.json

# 3. Implementación con agentes
node orchestration/orchestrator.js create workflow-desarrollo.json
node orchestration/orchestrator.js execute <workflow_id>

# 4. Validación y testing
./core/scripts/test-unit.sh
./core/scripts/security-scan.sh --type=basic .

# 5. Actualizar estado de tarea
node tools/update-task-status.js current review
```

#### 3. Revisión y Despliegue

```bash
# 1. Ejecutar tests completos
./core/scripts/test-claude-init.sh

# 2. Análisis de seguridad
./core/scripts/security-scan.sh --type=all .

# 3. Benchmarks de rendimiento
node tools/bench-agents.mjs --all --samples 50

# 4. Generar reportes
./core/scripts/collect-reports.sh

# 5. Despliegue si todo pasa
./core/scripts/deployment-check.sh
```

---

## 9. Solución de Problemas

### Problemas Comunes y Soluciones

#### 1. Error: "Agente timed out"

**Síntomas**: Los agentes tardan demasiado en responder o fallan por timeout.

**Causas Posibles**:
- Recursos insuficientes del sistema
- Archivos de entrada demasiado grandes
- Problemas de red o conectividad

**Soluciones**:
```bash
# 1. Verificar estado del sistema
node orchestration/orchestrator.js health

# 2. Ajustar timeouts en workflow
{
  "steps": [
    {
      "step_id": "analisis_largo",
      "timeout_ms": 120000,  // 2 minutos
      "max_retries": 2
    }
  ]
}

# 3. Reducir tamaño de entrada
{
  "max_tokens": 256,  // Reducir de 512
  "sources": ["solo_archivos_escenciales.md"]
}

# 4. Verificar recursos del sistema
htop  # o top para monitorear CPU/memoria
```

#### 2. Error: "JSON inválido" o "unbound variable"

**Síntomas**: Errores de parsing JSON o variables no definidas en scripts.

**Causas Posibles**:
- Archivos de configuración corruptos
- Variables de entorno no configuradas
- Problemas de permisos en archivos

**Soluciones**:
```bash
# 1. Validar JSON de configuración
jq empty config.json 2>/dev/null || echo "JSON inválido"

# 2. Verificar permisos
ls -la config.json

# 3. Reconfigurar entorno
source ~/.bashrc
npm install  # si faltan dependencias

# 4. Usar herramienta de parche automática
node tools/run-autofix.mjs
```

#### 3. Error: "Dependencia circular" en workflows

**Síntomas**: El orquestador detecta dependencias circulares entre pasos.

**Causas Posibles**:
- Configuración incorrecta de `depends_on`
- Lógica de workflow mal diseñada

**Soluciones**:
```bash
# 1. Visualizar dependencias
node orchestration/orchestrator.js status <workflow_id>

# 2. Rediseñar workflow
{
  "steps": [
    {
      "step_id": "a",
      "depends_on": []  // Sin dependencias
    },
    {
      "step_id": "b",
      "depends_on": ["a"]  // Depende solo de A
    },
    {
      "step_id": "c",
      "depends_on": ["a"]  // Depende solo de A, paralelo a B
    }
  ]
}

# 3. Usar herramienta de validación
node tools/validate-workflow.mjs workflow.json
```

#### 4. Error: "Artefactos oficiales faltantes"

**Síntomas**: No se generan archivos `out/context.json`, `out/prompting.json`.

**Causas Posibles**:
- Directorio `out/` no existe
- Problemas de permisos de escritura
- Agentes fallando silenciosamente

**Soluciones**:
```bash
# 1. Crear directorio out/
mkdir -p out

# 2. Verificar permisos
chmod 755 out/

# 3. Ejecutar agente directamente
core/scripts/run-clean.sh context payloads/context-test-payload.json

# 4. Verificar generación de archivos
test -s out/context.json && echo "✅ Archivo generado correctamente"

# 5. Usar orquestador para diagnóstico
node orchestration/orchestrator.js create diagnostico-workflow.json
node orchestration/orchestrator.js execute <workflow_id>
```

#### 5. Error: "Dependencias externas no disponibles"

**Síntomas**: Intentos de usar servicios externos opcionales que no están disponibles.

**Causas Posibles**:
- Archon o Antigeneric no están instalados (lo cual es normal)
- Configuración intentando acceder a servicios externos opcionales
- Problemas de configuración de integración opcional

**Soluciones**:
```bash
# 1. Verificar que el sistema funciona autónomamente
node orchestration/orchestrator.js health

# 2. Usar funcionalidades internas exclusivamente
./core/scripts/verify-dependencies.sh
./core/scripts/test-claude-init.sh

# 3. Configurar para modo autónomo
export CURSOR_AUTONOMOUS_MODE=true

# 4. Verificar que todas las funciones críticas funcionan
# El sistema debe operar perfectamente sin servicios externos

# 5. Documentar integración opcional si es necesaria
echo "Archon y Antigeneric son proyectos externos independientes"
echo "Cursor funciona autónomamente sin estas dependencias"
```

### Herramientas de Diagnóstico

#### Health Check Completo

```bash
#!/bin/bash
# Script de diagnóstico completo

echo "=== Health Check Completo de Cursor ==="

# 1. Verificar dependencias
echo -n "Dependencias: "
./core/scripts/verify-dependencies.sh && echo "✅ OK" || echo "❌ FALLÓ"

# 2. Health check de agentes
echo -n "Agentes MCP: "
node orchestration/orchestrator.js health | jq '. | map_values(.status)' && echo "✅ OK" || echo "❌ FALLÓ"

# 3. Verificar TaskDB
echo -n "TaskDB: "
test -f data/taskdb.json && echo "✅ OK" || echo "❌ FALTANTE"

# 4. Verificar configuración Archon
echo -n "Archon: "
make archon-check && echo "✅ OK" || echo "❌ FALLÓ"

# 5. Ejecutar tests básicos
echo -n "Tests básicos: "
./core/scripts/test-unit.sh && echo "✅ OK" || echo "❌ FALLÓ"

echo "=== Fin del Health Check ==="
```

#### Log de Diagnóstico Detallado

```bash
# Habilitar logging detallado
export DEBUG=1
export LOG_LEVEL=debug

# Ejecutar con logging
node orchestration/orchestrator.js execute <workflow_id> 2>&1 | tee debug.log

# Analizar logs
grep -E "(ERROR|WARN|✅|❌)" debug.log
```

### Procedimientos de Recuperación

#### Recuperación de Estado de Proyecto

```bash
# 1. Backup de estado actual
cp -r .reports .reports.backup.$(date +%Y%m%d_%H%M%S)

# 2. Limpiar estado corrupto
node tools/cleanup.mjs

# 3. Recrear estructura básica
mkdir -p out .reports tmp

# 4. Verificar integridad
./core/scripts/validate-project.sh

# 5. Restaurar desde backup si es necesario
# cp -r .reports.backup.LATEST/.reports/* .reports/
```

#### Recuperación de Agentes MCP

```bash
# 1. Reiniciar servicios Archon
make archon-bootstrap

# 2. Probar agentes individualmente
core/scripts/run-clean.sh context payloads/context-test-payload.json
core/scripts/run-clean.sh prompting payloads/prompting-test-payload.json
core/scripts/run-clean.sh rules payloads/rules-test-payload.json

# 3. Verificar generación de artefactos
ls -la out/

# 4. Ejecutar health check completo
node orchestration/orchestrator.js health
```

---

## 10. Recursos Adicionales

### Documentación de Referencia

- [`CLAUDE.md`](CLAUDE.md) - Guía completa de desarrollo
- [`AUDIT-CURSOR.md`](AUDIT-CURSOR.md) - Estado actual y hallazgos
- [`core/templates/README.md`](core/templates/README.md) - Documentación de plantillas
- [`docs/`](docs/) - Documentación adicional especializada

### Ejemplos y Casos de Uso

- [`payloads/`](payloads/) - Ejemplos de payloads para agentes
- [`ejemplos/`](ejemplos/) - Casos de uso prácticos
- [`test-data/`](test-data/) - Datos de prueba
- [`analisis-motor-rete/`](analisis-motor-rete/) - Ejemplo complejo de análisis

### Comunidad y Soporte

Para soporte adicional, revisar:
- Issues en el repositorio GitHub
- Comunidad de desarrolladores Claude Code
- Documentación interna del proyecto Cursor

---

## Conclusión

Este manual proporciona una guía completa y definitiva del proyecto Cursor, enfatizando su naturaleza autónoma e independiente. El sistema está diseñado con principios de estabilidad y calidad, operando como un sistema completamente independiente sin requerir servicios externos como Archon o Antigeneric.

### Principios Fundamentales

1. **Autonomía Total**: Cursor funciona perfectamente sin dependencias externas
2. **Separación Clara**: Proyectos externos (Archon, Antigeneric) son independientes
3. **Operación Autónoma**: TaskDB y agentes internos manejan toda la funcionalidad
4. **Integraciones Opcionales**: Servicios externos son mejoras, no requisitos

### Mantenimiento Autónomo

Para mantener el sistema funcionando óptimamente, se recomienda:
1. Ejecutar health checks internos regularmente
2. Mantener herramientas del sistema actualizadas
3. Revisar y actualizar workflows internos según necesidades
4. Documentar nuevos hallazgos y soluciones
5. Preservar la independencia del sistema

### Estado de Proyectos Externos

**Archon** y **Antigeneric** son proyectos independientes con sus propias carpetas de recursos externos. No forman parte del núcleo de Cursor y su integración es completamente opcional.

**Versión del Manual**: 2.0.0 (Actualización crítica de arquitectura)
**Fecha de Actualización**: 2025-09-30
**Estado**: Autónomo e independiente
