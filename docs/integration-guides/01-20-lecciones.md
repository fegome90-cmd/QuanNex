# Guía de Integración: 20 Lecciones de Agentes IA

## ¿Qué es la mejora?
Conjunto de 20 lecciones prácticas para construcción de agentes IA, desde fundamentos hasta optimizaciones avanzadas. Incluye arquitectura de agentes, manejo de no-determinismo, optimización de prompts y herramientas.

**Archivo Fuente**: [`mejoras_agentes/mejoras_agentes_0.1_optimized.txt`](mejoras_agentes/mejoras_agentes_0.1_optimized.txt)


## Componentes relevantes del proyecto:
- `agents/base/agent.js` - Arquitectura base de agentes
- `orchestration/orchestrator.js` - Orquestación multi-agente
- `core/rules-enforcer.js` - Sistema de reglas y guardrails
- `templates/agents/` - Plantillas de agentes

## Integración paso a paso:

### 1. Implementar guardrails de entrada/salida

```javascript
// En core/rules-enforcer.js
const { MAX_BUDGET, MIN_BUDGET } = require('../config/constants');
const logger = require('./centralized-logger');

class InputGuardrails {
  constructor() {
    this.maxBudget = MAX_BUDGET || 1000000;
    this.logger = logger;
  }

  validateInput(input) {
    // Validación de presupuesto razonable
    if (input.budget > this.maxBudget) {
      this.logger.warn(`Presupuesto excede límites: ${input.budget} > ${this.maxBudget}`);
      throw new Error("Presupuesto excede límites permitidos");
    }
    if (input.budget < MIN_BUDGET) {
      throw new Error("Presupuesto por debajo del mínimo requerido");
    }
    return true;
  }
}

// Tests unitarios
const { expect } = require('chai');

describe('InputGuardrails', () => {
  let guardrails;

  beforeEach(() => {
    guardrails = new InputGuardrails();
  });

  it('debe validar presupuesto válido', () => {
    const result = guardrails.validateInput({ budget: 500000 });
    expect(result).to.be.true;
  });

  it('debe rechazar presupuesto excesivo', () => {
    expect(() => guardrails.validateInput({ budget: 2000000 })).to.throw('Presupuesto excede límites permitidos');
  });

  it('debe rechazar presupuesto insuficiente', () => {
    expect(() => guardrails.validateInput({ budget: 1000 })).to.throw('Presupuesto por debajo del mínimo requerido');
  });
});
```

### 2. Especializar agentes por dominio

```javascript
// En agents/slack-agent.js
const BaseAgent = require('./base/agent');
const { SlackAPI } = require('../external/slack-api');
const logger = require('../core/centralized-logger');

class SlackAgent extends BaseAgent {
  constructor(config = {}) {
    super(config);
    this.capabilities = ['slack_api', 'messaging', 'channel_management'];
    this.slackAPI = new SlackAPI(config.token);
    this.logger = logger;
  }

  async sendMessage(channel, message) {
    try {
      const result = await this.slackAPI.sendMessage(channel, message);
      this.logger.info(`Mensaje enviado a ${channel}`);
      return result;
    } catch (error) {
      this.logger.error(`Error enviando mensaje: ${error.message}`);
      throw error;
    }
  }

  async getChannelHistory(channel, limit = 100) {
    return await this.slackAPI.getChannelHistory(channel, limit);
  }
}

module.exports = SlackAgent;

// Tests unitarios
const { expect } = require('chai');
const sinon = require('sinon');

describe('SlackAgent', () => {
  let slackAgent;
  let mockSlackAPI;

  beforeEach(() => {
    mockSlackAPI = {
      sendMessage: sinon.stub().resolves({ ok: true }),
      getChannelHistory: sinon.stub().resolves([])
    };
    slackAgent = new SlackAgent({ token: 'test-token' });
    slackAgent.slackAPI = mockSlackAPI;
  });

  it('debe enviar mensaje correctamente', async () => {
    const result = await slackAgent.sendMessage('#general', 'Hola mundo');
    expect(result.ok).to.be.true;
    expect(mockSlackAPI.sendMessage.calledOnce).to.be.true;
  });

  it('debe obtener historial de canal', async () => {
    const history = await slackAgent.getChannelHistory('#general');
    expect(Array.isArray(history)).to.be.true;
    expect(mockSlackAPI.getChannelHistory.calledOnce).to.be.true;
  });
});
```

### 3. Implementar manejo de memoria

```javascript
// En core/memory-system.js
const VectorDB = require('../external/vector-db');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./centralized-logger');

class MemorySystem {
  constructor(config = {}) {
    this.shortTerm = [];
    this.maxShortTermSize = config.maxShortTermSize || 100;
    this.longTerm = new VectorDB(config.vectorDBConfig);
    this.storagePath = config.storagePath || path.join(__dirname, '../data/memory');
    this.logger = logger;
  }

  async storeMemory(type, content) {
    try {
      if (type === 'short') {
        this.shortTerm.push(content);
        if (this.shortTerm.length > this.maxShortTermSize) {
          this.shortTerm.shift(); // FIFO
        }
        await this.persistShortTerm();
      } else {
        await this.longTerm.store(content);
      }
      this.logger.debug(`Memoria almacenada: tipo=${type}, tamaño=${content.length}`);
    } catch (error) {
      this.logger.error(`Error almacenando memoria: ${error.message}`);
      throw error;
    }
  }

  async retrieveMemory(query, type = 'long') {
    if (type === 'short') {
      return this.shortTerm.filter(item => item.includes(query));
    } else {
      return await this.longTerm.search(query);
    }
  }

  async persistShortTerm() {
    const filePath = path.join(this.storagePath, 'short-term.json');
    await fs.writeFile(filePath, JSON.stringify(this.shortTerm, null, 2));
  }

  async loadShortTerm() {
    const filePath = path.join(this.storagePath, 'short-term.json');
    try {
      const data = await fs.readFile(filePath, 'utf8');
      this.shortTerm = JSON.parse(data);
    } catch (error) {
      this.logger.warn('No se pudo cargar memoria a corto plazo, iniciando vacía');
      this.shortTerm = [];
    }
  }
}

module.exports = MemorySystem;

// Tests unitarios
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs').promises;

describe('MemorySystem', () => {
  let memorySystem;
  let mockVectorDB;

  beforeEach(() => {
    mockVectorDB = {
      store: sinon.stub().resolves(),
      search: sinon.stub().resolves([])
    };
    memorySystem = new MemorySystem();
    memorySystem.longTerm = mockVectorDB;
  });

  it('debe almacenar memoria a corto plazo', async () => {
    await memorySystem.storeMemory('short', 'test content');
    expect(memorySystem.shortTerm).to.include('test content');
  });

  it('debe almacenar memoria a largo plazo', async () => {
    await memorySystem.storeMemory('long', 'test content');
    expect(mockVectorDB.store.calledOnce).to.be.true;
  });

  it('debe recuperar memoria a corto plazo', async () => {
    memorySystem.shortTerm = ['hello world', 'test content'];
    const results = await memorySystem.retrieveMemory('test', 'short');
    expect(results).to.deep.equal(['test content']);
  });
});
```

### 4. Optimizar herramientas

```javascript
// Anatomía de herramienta perfecta
async function optimizedTool(query, maxResults = 10) {
  try {
    const results = await vectorSearch(query);
    const formatted = results.map(r => ({
      id: r.id,
      title: r.title,
      content: r.content,
      relevance: r.score
    }));

    return `# Resultados\n\n${formatted.map(r =>
      `### ${r.title}\n**Relevancia**: ${r.relevance}\n${r.content}`
    ).join('\n\n')}`;
  } catch (error) {
    return `# Error\n\n**Problema**: ${error.message}\n**Sugerencia**: Verificar parámetros`;
  }
}
```

## Riesgos potenciales:
- **No-determinismo**: Comportamiento impredecible en producción
- **Explosión de alucinaciones**: En workflows multi-agente complejos
- **Context length**: LLMs locales con límites de contexto
- **Cambio de modelo**: Interpretación diferente de prompts

## Medidas de Mitigación con Testing

### No-determinismo:
- **Tests**: Unitarios (Jest) para funciones determinísticas, integración para workflows, e2e (Cypress) para escenarios completos, carga (k6) para estabilidad.
- **Gates**: Cobertura unitaria >85%, tiempo de respuesta <2s en tests de integración.
- **Métricas**: Baseline de varianza de respuestas <5%, KPI de consistencia 95%.
- **Herramientas**: Jest, Cypress, k6, Prometheus para monitoreo.
- **Automatización**: CI/CD con tests paralelos, alertas en desviaciones >10%.

### Explosión de alucinaciones:
- **Tests**: Seguridad (OWASP ZAP) para detección de alucinaciones, integración multi-agente, e2e con validación humana simulada.
- **Gates**: Tasa de alucinaciones detectadas <1%, validación de coherencia >90%.
- **Métricas**: Baseline de precisión 92%, KPI de reducción de falsos positivos 80%.
- **Herramientas**: OWASP ZAP, Selenium para e2e, Grafana para dashboards.
- **Automatización**: Tests automatizados en pipelines, rollback automático si tasa >2%.

### Context length:
- **Tests**: Unitarios para límites de contexto, integración con diferentes tamaños de input, carga para memoria.
- **Gates**: Procesamiento de contextos >4096 tokens sin errores, uso de memoria <80%.
- **Métricas**: Baseline de throughput 100 req/s, KPI de latencia <500ms.
- **Herramientas**: Artillery para carga, New Relic para monitoreo.
- **Automatización**: Tests de regresión en cada commit, escalado automático.

### Cambio de modelo:
- **Tests**: Integración con múltiples modelos (GPT-4, Claude), e2e para compatibilidad, unitarios para adaptadores.
- **Gates**: Compatibilidad >95% entre modelos, degradación <10% en métricas.
- **Métricas**: Baseline de accuracy 90%, KPI de estabilidad inter-modelo 85%.
- **Herramientas**: Hugging Face Transformers, TensorFlow Serving.
- **Automatización**: Suite de compatibilidad en CI, A/B testing automatizado.

## Medidas de seguridad:
- **Pruebas unitarias**: Validar cada componente independiente
- **Backups**: Versionado completo antes de cambios
- **Validación de compatibilidad**: Tests de integración con componentes existentes
- **Monitoreo**: Logs detallados de comportamiento de agentes
- **Rollback plan**: Capacidad de revertir cambios críticos

## Referencias Cruzadas

- **Arquitectura General**: Ver [ARCHITECTURE-OVERVIEW.md](../ARCHITECTURE-OVERVIEW.md)
- **Validación Empírica**: Ver [VALIDATION-EMPRICA.md](../VALIDATION-EMPRICA.md)
- **Requisitos Técnicos**: Ver [REQUIREMENTS-TECHNICAL.md](../REQUIREMENTS-TECHNICAL.md)
- **Scripts de Validación**: Ver [../validation-scripts/](../validation-scripts/)

## Diagrama Arquitectural

```mermaid
graph TB
    A[Agente IA] --> B[Guardrails Input]
    A --> C[Guardrails Output]
    A --> D[Especialización por Dominio]
    A --> E[Sistema de Memoria]

    B --> F[Validación Presupuesto]
    B --> G[Sanitización Input]

    C --> H[Validación Respuesta]
    C --> I[Corrección Automática]

    D --> J[Slack Agent]
    D --> K[Database Agent]
    D --> L[Orquestador]

    E --> M[Memoria Corto Plazo]
    E --> N[Memoria Largo Plazo - RAG]

    F --> O[Tests Unitarios]
    G --> O
    H --> P[Tests Integración]
    I --> P
    J --> Q[Tests E2E]
    K --> Q
    L --> Q
    M --> R[Tests Carga]
    N --> R

---

## 📋 **REGISTRO DE ACTIVIDADES - 2024-10-02**

### ✅ **Completado: Análisis Exhaustivo de Parches**

**Fecha**: 2024-10-02  
**Responsable**: Claude (AI Assistant)  
**Tipo**: Análisis de Riesgos y Planificación

#### **Actividades Realizadas:**

1. **Análisis de Fallas Críticas**:
   - Identificadas **15 fallas críticas adicionales** en el sistema actual
   - Verificación automática con MCP QuanNex confirmó problemas de imports
   - Documentación completa de errores y soluciones

2. **Plan de Integración Completo**:
   - Diseñado plan de **6 pasos secuenciales** para integración de 20 Lecciones
   - Código completo documentado para cada paso
   - Gates automáticos con umbrales medibles
   - Secuencia de commits sugerida

3. **Documentación Técnica**:
   - `ANALISIS-PARCHES-20-LECCIONES.md` actualizado con plan completo
   - Código JavaScript completo para todos los componentes
   - Tests exhaustivos (unit, integration, E2E, load)
   - GitHub Actions workflow completo

#### **Archivos Modificados:**
- `ANALISIS-PARCHES-20-LECCIONES.md` - Plan completo de integración
- `docs/integration-guides/01-20-lecciones.md` - Registro de actividades

#### **Métricas Alcanzadas:**
- **15 fallas críticas** identificadas y documentadas
- **6 pasos** de integración diseñados
- **25+ items** de checklist pre-implementación
- **5 gates automáticos** con umbrales específicos
- **100% documentación** en texto (sin archivos reales)

#### **Estado Actual:**
- ✅ Análisis de riesgos completado
- ✅ Plan de integración diseñado
- ✅ Documentación técnica completa
- ⏳ Pendiente: Resolución de fallas críticas antes de implementación
- ⏳ Pendiente: Implementación gradual de los 6 pasos

#### **Próximas Acciones:**
1. Resolver las 15 fallas críticas identificadas por MCP QuanNex
2. Implementar Paso 0: Carpeta de conocimiento
3. Implementar Paso 1: Guardrails de entrada/salida
4. Continuar con pasos 2-6 según plan secuencial

#### **Riesgos Identificados:**
- **No-Determinismo**: Mitigado con guardrails y schemas
- **Alucinaciones**: Mitigado con límites de agentes
- **Context Length**: Mitigado con compresión/rotación
- **Cambio de Modelo**: Mitigado con versionado de prompts
