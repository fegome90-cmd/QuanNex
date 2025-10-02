#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync
} from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { hello, isHello } from '../shared/contracts/handshake.js';
import { validateReq, ok, fail } from '../shared/contracts/schema.js';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { checkRateLimit, getRateLimitStats } from './utils/rate-limiter.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
// import TaskRunner from './task-runner.js';
// import RouterV2 from './router-v2.js';
// import FSMV2 from './fsm-v2.js';
// import CanaryManager from './canary-manager.js';
// import PerformanceMonitor from './performance-monitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// CORRECCIÓN DE PATHS - Usar paths absolutos desde la raíz del proyecto
const PROJECT_ROOT = resolve(__dirname, '..');

const DEFAULT_TIMEOUT_MS = 30_000; // MEJORADO: timeout reducido de 60s a 30s
const KILL_GRACE_MS = 1_000; // MEJORADO: gracia reducida de 2s a 1s
const REPORTS_DIR = join(PROJECT_ROOT, '.reports'); // NEW

// MEJORA: Constantes para estados, evitando errores tipográficos.
// eslint-disable-next-line no-unused-vars
const STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  IDLE: 'idle'
};

function nowIso() {
  return new Date().toISOString();
}

function rid(prefix = 'wf') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

class WorkflowOrchestrator {
  constructor(opts = {}) {
    this.workflows = new Map();
    this.agentStatus = new Map();
    this.messageQueue = [];
    this.timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.isShuttingDown = false; // BLINDAJE: Flag para cierre seguro.
    // this.taskRunner = new TaskRunner({ orchestrator: this });
    
    // SEMANA 1: Router v2 + FSM v2 + Canary + Monitoreo
    // SEMANA 2: Context v2 + Handoffs
    this.version = '2.1.0';
    this.featureFlags = {
      routerV2: process.env.FEATURE_ROUTER_V2 === '1',
      fsmV2: process.env.FEATURE_FSM_V2 === '1',
      canary: process.env.FEATURE_CANARY === '1',
      monitoring: process.env.FEATURE_MONITORING === '1',
      contextV2: process.env.FEATURE_CONTEXT_V2 === '1',
      handoffs: process.env.FEATURE_HANDOFF === '1'
    };
    
    // Inicializar componentes v2
    // this.router = new RouterV2();
    // this.fsm = new FSMV2();
    // this.canary = new CanaryManager();
    // this.monitor = new PerformanceMonitor();
    
    this.metrics = {
      totalRequests: 0,
      canaryRequests: 0,
      controlRequests: 0,
      rollbacks: 0,
      alerts: 0,
      averageLatency: 0,
      p95Latency: 0,
      errorRate: 0
    };
    
    this.initializeAgents();
    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
    this.loadWorkflows();
    this.setupGracefulShutdown(); // BLINDAJE: Añadir listeners para cierre seguro.
  }

  // BLINDAJE: Asegura que el estado se guarde al cerrar el proceso.
  setupGracefulShutdown() {
    const handleShutdown = signal => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      // eslint-disable-next-line no-console
      console.log(
        `\n[INFO] Recibida señal ${signal}. Guardando estado antes de salir...`
      );
      this.saveWorkflows();
      // eslint-disable-next-line no-console
      console.log('[INFO] Estado guardado. Saliendo.');
      process.exit(0);
    };

    process.on('SIGINT', handleShutdown); // Ctrl+C
    process.on('SIGTERM', handleShutdown); // kill
  }

  // Load workflows from disk
  loadWorkflows() {
    const workflowsFile = join(REPORTS_DIR, 'workflows.json');
    if (existsSync(workflowsFile)) {
      try {
        const data = JSON.parse(readFileSync(workflowsFile, 'utf8'));
        for (const [id, workflow] of Object.entries(data)) {
          this.workflows.set(id, workflow);
        }
      } catch {
        // Ignore loading errors
      }
    }
  }

  // Save workflows to disk
  saveWorkflows() {
    const workflowsFile = join(REPORTS_DIR, 'workflows.json');
    const data = Object.fromEntries(this.workflows);
    writeFileSync(workflowsFile, JSON.stringify(data, null, 2));
  }

  initializeAgents() {
    this.agentStatus.set('context', { status: 'idle', lastHeartbeat: null });
    this.agentStatus.set('prompting', { status: 'idle', lastHeartbeat: null });
    this.agentStatus.set('rules', { status: 'idle', lastHeartbeat: null });
    
    // SEMANA 1: Inicializar monitoreo si está habilitado
    if (this.featureFlags.monitoring) {
      this.monitor.startMonitoring().catch(error => {
        console.error('❌ Error iniciando monitoreo:', error.message);
      });
    }
  }

  // NEW: validación mínima del workflow
  validateWorkflowConfig(cfg) {
    if (!Array.isArray(cfg.steps) || cfg.steps.length === 0) {
      throw new Error('Workflow requires non-empty steps[]');
    }
    const ids = new Set();
    for (const s of cfg.steps) {
      if (!s.step_id || ids.has(s.step_id))
        throw new Error(`Duplicate or missing step_id: ${s.step_id}`);
      ids.add(s.step_id);
      if (!s.agent) throw new Error(`Step ${s.step_id} missing agent`);
      if (s.depends_on && !Array.isArray(s.depends_on))
        throw new Error(`Step ${s.step_id} depends_on must be array`);
      if (s.max_retries != null && (s.max_retries < 0 || s.max_retries > 5)) {
        throw new Error(`Step ${s.step_id} max_retries out of range`);
      }
      // pass_if opcional: { jsonpath: '$.summary.ok', equals: true } o { exists: '$.result.tokens' } etc.
    }
  }

  async createWorkflow(workflowConfig) {
    this.validateWorkflowConfig(workflowConfig);
    const workflowId = rid('wf');

    const workflow = {
      workflow_id: workflowId,
      name: workflowConfig.name || 'Unnamed Workflow',
      description: workflowConfig.description || '',
      steps: workflowConfig.steps.map(s => ({
        ...s,
        status: 'pending',
        retry_count: 0
      })),
      status: 'pending',
      created_at: nowIso(),
      context: workflowConfig.context || {},
      results: {},
      artifacts_dir: join(REPORTS_DIR, workflowId) // NEW
    };
    if (!existsSync(workflow.artifacts_dir)) {
      mkdirSync(workflow.artifacts_dir, { recursive: true });
    }

    // NEW: registrar plan en disco
    writeFileSync(
      join(workflow.artifacts_dir, 'plan.json'),
      JSON.stringify(workflowConfig, null, 2)
    );
    this.workflows.set(workflowId, workflow);
    this.saveWorkflows();
    return workflow;
  }

  async executeWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    workflow.status = 'running';
    workflow.started_at = nowIso();
    const budget = workflow.context?.budget || {};
    const startTime = Date.now();
    let hopCount = 0;

    try {
      const executedSteps = new Set();
      const pending = new Set(workflow.steps.map(s => s.step_id));

      while (pending.size > 0) {
        if (budget.max_latency_ms && Date.now() - startTime > budget.max_latency_ms) {
          throw new Error('Budget max latency exceeded');
        }

        const ready = workflow.steps.filter(
          s =>
            pending.has(s.step_id) &&
            (!s.depends_on || s.depends_on.every(d => executedSteps.has(d)))
        );
        if (ready.length === 0) {
          throw new Error('Circular dependency or no ready steps');
        }

        const results = await Promise.allSettled(
          ready.map(s => this.executeStep(workflow, s))
        );

        for (let i = 0; i < results.length; i++) {
          const step = ready[i];
          const r = results[i];
          if (r.status === 'fulfilled') {
            workflow.results[step.step_id] = r.value;
            executedSteps.add(step.step_id);
            pending.delete(step.step_id);
            hopCount += 1;
            if (budget.max_hops && hopCount > budget.max_hops) {
              throw new Error('Budget max hops exceeded');
            }
          } else {
            step.status = 'failed';
            step.error = r.reason?.message || String(r.reason);
            // NEW: fail-fast de dependientes
            const dependents = workflow.steps.filter(x =>
              x.depends_on?.includes(step.step_id)
            );
            for (const d of dependents) {
              d.status = 'skipped';
              pending.delete(d.step_id);
            }
            throw new Error(`Step ${step.step_id} failed: ${step.error}`);
          }
        }
      }

      workflow.status = 'completed';
      workflow.completed_at = nowIso();
      this.writeWorkflowSummary(workflow); // NEW
      this.saveWorkflows();
      return workflow;
    } catch (err) {
      workflow.status = 'failed';
      workflow.error = { message: err.message, timestamp: nowIso() };
      this.writeWorkflowSummary(workflow); // NEW
      this.saveWorkflows();
      throw err;
    }
  }

  // NEW: persistir resumen y logs
  writeWorkflowSummary(workflow) {
    const summary = {
      workflow_id: workflow.workflow_id,
      name: workflow.name,
      status: workflow.status,
      started_at: workflow.started_at,
      completed_at: workflow.completed_at,
      error: workflow.error || null,
      steps: workflow.steps.map(s => ({
        step_id: s.step_id,
        agent: s.agent,
        status: s.status,
        retry_count: s.retry_count,
        error: s.error || null
      }))
    };
    writeFileSync(
      join(workflow.artifacts_dir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }

  // NEW: gate opcional por paso (pass_if). Soporte simple: equals/exits/jsonpath-lite
  checkPassIf(output, passIf) {
    if (!passIf) {
      return true;
    }
    try {
      if (passIf.equals != null && passIf.path) {
        const val = this.pick(output, passIf.path);
        return val === passIf.equals;
      }
      if (passIf.exists) {
        const val = this.pick(output, passIf.exists);
        return val !== undefined && val !== null;
      }
      return true;
    } catch {
      return false;
    }
  }

  // NEW: selector minimalista tipo "a.b.c"
  pick(obj, path) {
    return path
      .split('.')
      .reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
  }

  async executeStep(workflow, step) {
    step.status = 'running';
    const t0 = Date.now();

    try {
      const input = { ...step.input, workflow_context: workflow.context };
      const result = await this.callAgent(
        step.agent,
        step.action || '',
        input,
        { timeoutMs: step.timeout_ms || this.timeoutMs }
      );
      // NEW: gates
      if (!this.checkPassIf(result, step.pass_if)) {
        throw new Error(`pass_if gate failed for ${step.step_id}`);
      }

      step.status = 'completed';
      step.duration_ms = Date.now() - t0;

      // NEW: log por paso
      writeFileSync(
        join(workflow.artifacts_dir, `${step.step_id}.json`),
        JSON.stringify(
          { input, output: result, meta: { duration_ms: step.duration_ms } },
          null,
          2
        )
      );
      return result;
    } catch (error) {
      step.status = 'failed';
      step.duration_ms = Date.now() - t0;
      step.error = error.message;

      // retry
      const max = step.max_retries ?? 3;
      if (step.retry_count < max) {
        step.retry_count += 1;
        step.status = 'pending';
        return this.executeStep(workflow, step);
      }
      throw error;
    }
  }

  async runTaskPayload(payload, options = {}) {
    const baseTask = payload.task || payload;
    const threadStateId = baseTask.thread_state_id || baseTask.threadStateId;
    const task = {
      task_id: baseTask.task_id || baseTask.id,
      intent: baseTask.intent,
      confidence: baseTask.confidence,
      artifacts: baseTask.artifacts,
      metadata: baseTask.metadata || baseTask.plan || {},
      thread_state_id: threadStateId,
      threadStateId
    };

    // SEMANA 1: Usar Router v2 + FSM v2 si están habilitados
    if (this.featureFlags.routerV2 || this.featureFlags.fsmV2) {
      return await this.processRequestV2(task, options);
    }

    const runnerOptions = {
      diff: payload.diff,
      evidence: payload.evidence,
      plan: payload.plan,
      skipPolicy: options.skipPolicy,
      workflowConfig: options.workflowConfig,
      workflowId: options.workflowId
    };

    if (runnerOptions.workflowConfig) {
      runnerOptions.workflow = runnerOptions.workflowConfig;
      delete runnerOptions.workflowConfig;
    }

    // return this.taskRunner.run(task, runnerOptions);
    return { success: false, error: 'TaskRunner not available' };
  }

  // SEMANA 1: Procesamiento con Router v2 + FSM v2
  async processRequestV2(request, options = {}) {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    console.log(`📨 Procesando request v2 ${this.metrics.totalRequests}: ${request.intent || 'unknown'}`);

    try {
      // 1. Decidir si usar canary
      const useCanary = this.featureFlags.canary ? 
        await this.canary.shouldUseCanary(request) : false;

      if (useCanary) {
        this.metrics.canaryRequests++;
        console.log('🎯 Usando canary (Router v2 + FSM v2)');
      } else {
        this.metrics.controlRequests++;
        console.log('📊 Usando control (Router v1 + FSM v1)');
      }

      // 2. Ejecutar routing
      const routeResult = useCanary && this.featureFlags.routerV2 ?
        await this.router.route(request) :
        await this.fallbackRoute(request);

      // 3. Ejecutar FSM
      const fsmResult = useCanary && this.featureFlags.fsmV2 ?
        await this.fsm.execute(request) :
        await this.fallbackFSM(request);

      // 4. Combinar resultados
      const result = this.combineResults(routeResult, fsmResult, {
        useCanary,
        latency: performance.now() - startTime,
        timestamp: new Date().toISOString()
      });

      // 5. Registrar métricas
      if (this.featureFlags.canary) {
        await this.canary.recordMetrics(request, result, useCanary);
      }

      // 6. Actualizar métricas internas
      this.updateMetrics(result);

      console.log(`✅ Request v2 procesado exitosamente (${result.latency.toFixed(1)}ms)`);
      return result;

    } catch (error) {
      console.error('❌ Error procesando request v2:', error.message);
      
      // Registrar error en métricas
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
      
      return {
        success: false,
        error: error.message,
        latency: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async fallbackRoute(request) {
    console.log('🔄 Usando Router v1 (fallback)');
    
    // Simular routing v1
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      route: 'fallback',
      target_agent: 'agents.orchestrator.fallback',
      latency_ms: 100,
      optimized: false,
      version: 'v1'
    };
  }

  async fallbackFSM(request) {
    console.log('🔄 Usando FSM v1 (fallback)');
    
    // Simular FSM v1
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      version: 'v1',
      latency_ms: 500,
      timestamp: new Date().toISOString()
    };
  }

  combineResults(routeResult, fsmResult, metadata) {
    return {
      success: routeResult.success && fsmResult.success,
      route: routeResult.route || 'unknown',
      target_agent: routeResult.target_agent || 'unknown',
      fsm_state: fsmResult.finalState || 'unknown',
      latency: metadata.latency,
      latency_ms: Math.round(metadata.latency),
      optimized: routeResult.optimized || false,
      canary: metadata.useCanary,
      version: {
        router: routeResult.version || 'v1',
        fsm: fsmResult.version || 'v1'
      },
      performance: {
        p95: this.calculateP95(metadata.latency),
        errorRate: this.metrics.errorRate,
        throughput: this.calculateThroughput()
      },
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: metadata.timestamp,
        hops: routeResult.hops_saved || 0,
        performance_gain: routeResult.performance_gain || 0
      }
    };
  }

  calculateP95(currentLatency) {
    // Simular cálculo de P95 (en producción vendría de métricas reales)
    const baseP95 = 1000;
    const variation = (Math.random() - 0.5) * 200;
    return Math.round(baseP95 + variation);
  }

  calculateThroughput() {
    // Simular cálculo de throughput
    const baseThroughput = 50;
    const variation = (Math.random() - 0.5) * 10;
    return Math.round((baseThroughput + variation) * 10) / 10;
  }

  updateMetrics(result) {
    // Actualizar latencia promedio
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + result.latency) / 
      this.metrics.totalRequests;

    // Actualizar P95
    this.metrics.p95Latency = Math.max(this.metrics.p95Latency, result.latency);

    // Actualizar error rate
    if (!result.success) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / 
        this.metrics.totalRequests;
    }
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // GAP-002: Método para obtener estadísticas de rate limiting
  getRateLimitStats(agentName = null) {
    if (agentName) {
      return getRateLimitStats(agentName);
    }
    // Obtener estadísticas de todos los agentes
    const agents = ['context', 'prompting', 'rules', 'security', 'metrics', 'optimization'];
    const stats = {};
    for (const agent of agents) {
      stats[agent] = getRateLimitStats(agent);
    }
    return stats;
  }

  async callAgent(
    agentName,
    action,
    input,
    { timeoutMs = DEFAULT_TIMEOUT_MS } = {}
  ) {
    // GAP-002: Implementar rate limiting
    try {
      checkRateLimit(agentName);
    } catch (error) {
      throw new Error(`Rate limit exceeded for agent ${agentName}: ${error.message}`);
    }

    const runCleanPath = join(PROJECT_ROOT, 'core', 'scripts', 'run-clean.sh');
    if (!existsSync(runCleanPath)) {
      throw new Error(`run-clean.sh not found at ${runCleanPath}`);
    }

    const agentToken = process.env.MCP_AGENT_AUTH_TOKEN || '';
    return new Promise((resolve, reject) => {
      const child = spawn(
        'bash',
        [
          runCleanPath,
          agentName,
          '--stdin-json',
          '--out',
          `out/${agentName}.json`
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: PROJECT_ROOT,
          env: agentToken ? { ...process.env, MCP_AGENT_AUTH_TOKEN: agentToken } : process.env
        }
      );
      let stdout = '';
      let stderr = '';
      let timeout;

      const clean = signal => {
        try {
          clearTimeout(timeout);
        } catch {
          // Ignore cleanup errors
        }
        try {
          child.stdin.end();
        } catch {
          // Ignore stdin errors
        }
        if (signal === 'timeout') {
          try {
            child.kill('SIGTERM');
          } catch {
            // Ignore kill errors
          }
          setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch {
              // Ignore final kill errors
            }
          }, KILL_GRACE_MS);
        }
      };

      timeout = setTimeout(() => {
        clean('timeout');
        reject(new Error(`Agent ${agentName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.on('data', d => {
        stdout += d.toString();
      });
      child.stderr.on('data', d => {
        stderr += d.toString();
      });

      child.on('close', code => {
        clean();
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(
              new Error(
                `Parse error from ${agentName}: ${e.message}; stderr: ${stderr.slice(0, 500)}`
              )
            );
          }
        } else {
          reject(
            new Error(
              `Agent ${agentName} failed (${code}): ${stderr.slice(0, 500)}`
            )
          );
        }
      });

      // Enviar input JSON por stdin
      const payload = { action, ...input };
      if (agentToken) {
        payload.auth_token = agentToken;
      }
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }

  getWorkflow(id) {
    return this.workflows.get(id);
  }

  listWorkflows() {
    return Array.from(this.workflows.values());
  }

  getAgentStatus() {
    return Object.fromEntries(this.agentStatus);
  }

  // SEMANA 1: Métodos de estado y salud v2
  getStatus() {
    return {
      version: this.version,
      featureFlags: this.featureFlags,
      metrics: this.metrics,
      router: this.router.getMetrics(),
      fsm: this.fsm.getMetrics(),
      canary: this.canary.getMetrics(),
      monitor: this.monitor.getStatus()
    };
  }

  getHealth() {
    const status = this.getStatus();
    
    return {
      healthy: this.metrics.errorRate < 0.05,
      version: this.version,
      uptime: process.uptime(),
      requests: this.metrics.totalRequests,
      errorRate: this.metrics.errorRate,
      p95Latency: this.metrics.p95Latency,
      canaryPercentage: status.canary.canaryPercentage,
      alerts: status.monitor.alerts,
      rollbacks: status.canary.rollbackCount
    };
  }

  async healthCheck() {
    // MEJORA: Ejecución de health checks en paralelo para mayor velocidad.
    const healthPromises = Array.from(this.agentStatus.keys()).map(
      async agentName => {
        try {
          let testInput = {};
          switch (agentName) {
            case 'rules':
              testInput = {
                policy_refs: ['README.md'],
                compliance_level: 'basic'
              };
              break;
            case 'context':
              testInput = {
                sources: ['README.md'],
                selectors: ['test'],
                max_tokens: 100
              };
              break;
            case 'prompting':
              testInput = {
                goal: 'test',
                style: 'formal'
              };
              break;
          }

          await this.callAgent(agentName, 'ping', testInput, {
            timeoutMs: 5_000
          });
          return [agentName, { status: 'healthy', lastCheck: nowIso() }];
        } catch (e) {
          return [
            agentName,
            { status: 'unhealthy', error: e.message, lastCheck: nowIso() }
          ];
        }
      }
    );
    const healthResults = await Promise.all(healthPromises);
    return Object.fromEntries(healthResults);
  }

  // NEW: limpieza opcional de artefactos (para jobs efímeros)
  cleanup(workflowId) {
    const wf = this.workflows.get(workflowId);
    if (!wf) {
      return false;
    }
    try {
      rmSync(wf.artifacts_dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors - directory may not exist or be accessible
      // This is expected behavior for cleanup operations
    }
    return true;
  }
}

// --- CLI Mejorada con yargs ---
async function main() {
  const orchestrator = new WorkflowOrchestrator();

  // MEJORADO: Manejo de señales de terminación (del V3)
  const handleShutdown = async () => {
    console.log('\n🛑 Received shutdown signal...');
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    console.error('❌ Unhandled rejection:', reason);
    process.exit(1);
  });

  yargs(hideBin(process.argv))
    .scriptName('orchestrator')
    .command(
      'create [config]',
      'Crea un nuevo workflow desde un archivo JSON o stdin',
      y => {
        y.positional('config', {
          describe:
            'Ruta al archivo de configuración JSON. Si se omite, lee desde stdin.'
        });
      },
      async argv => {
        let configStr;
        if (argv.config && existsSync(argv.config)) {
          configStr = readFileSync(argv.config, 'utf8');
        } else {
          try {
            configStr = readFileSync(0, 'utf8'); // Lee desde stdin
          } catch {
            // eslint-disable-next-line no-console
            console.error(
              'Se requiere una configuración JSON desde un archivo o stdin.'
            );
            process.exit(1);
          }
        }
        const cfg = JSON.parse(configStr);
        const wf = await orchestrator.createWorkflow(cfg);
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(wf, null, 2));
        process.exit(0);
      }
    )
    .command(
      'execute <workflowId>',
      'Ejecuta un workflow existente por su ID',
      {},
      async argv => {
        // eslint-disable-next-line no-console
        console.log(`[INFO] Ejecutando workflow ${argv.workflowId}...`);
        const result = await orchestrator.executeWorkflow(argv.workflowId);
        // eslint-disable-next-line no-console
        console.log(
          `[INFO] Workflow ${argv.workflowId} finalizado con estado: ${result.status}`
        );
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }
    )
    .command(
      'status [workflowId]',
      'Muestra el estado de un workflow o lista todos',
      {},
      argv => {
        const result = argv.workflowId ?
          orchestrator.getWorkflow(argv.workflowId) :
          orchestrator.listWorkflows();
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }
    )
    .command(
      'health',
      'Realiza un chequeo de salud de todos los agentes',
      {},
      async() => {
        const health = await orchestrator.healthCheck();
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(health, null, 2));
        process.exit(0);
      }
    )
    .command(
      'task [payload]',
      'Evalua routing, presupuesto y politicas para una tarea',
      y =>
        y
          .positional('payload', {
            describe: 'Ruta al JSON de la tarea. Si se omite, lee desde stdin.'
          })
          .option('workflow', {
            type: 'string',
            describe: 'Ruta a un workflow JSON a ejecutar tras el enrutamiento'
          })
          .option('skip-policy', {
            type: 'boolean',
            default: false,
            describe: 'Omite la evaluacion de politicas (solo depuracion)'
          }),
      async argv => {
        let payloadRaw;
        if (argv.payload && existsSync(argv.payload)) {
          payloadRaw = readFileSync(argv.payload, 'utf8');
        } else {
          try {
            payloadRaw = readFileSync(0, 'utf8');
          } catch {
            // eslint-disable-next-line no-console
            console.error(
              'Se requiere una carga JSON desde un archivo o stdin para evaluar la tarea.'
            );
            process.exit(1);
          }
        }

        const payload = JSON.parse(payloadRaw);
        let workflowConfig;
        if (argv.workflow) {
          if (!existsSync(argv.workflow)) {
            // eslint-disable-next-line no-console
            console.error(`Workflow ${argv.workflow} no encontrado`);
            process.exit(1);
          }
          workflowConfig = JSON.parse(readFileSync(argv.workflow, 'utf8'));
        }

        const result = await orchestrator.runTaskPayload(payload, {
          skipPolicy: argv.skipPolicy,
          workflowConfig
        });
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }
    )
    .command(
      'cleanup <workflowId>',
      'Elimina los artefactos de un workflow',
      {},
      argv => {
        const ok = orchestrator.cleanup(argv.workflowId);
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({ workflow_id: argv.workflowId, cleaned: ok }, null, 2)
        );
        process.exit(0);
      }
    )
    .demandCommand(1, 'Debes proporcionar un comando.')
    .strict()
    .help()
    .wrap(120)
    .fail((msg, err) => {
      // eslint-disable-next-line no-console
      console.error(msg || err.message);
      process.exit(1);
    })
    .parse();
  
  // MEJORADO: Cleanup automático (del V3)
  process.on('exit', () => {
    console.log('🧹 Cleaning up...');
  });
}

// Nueva función para manejar mensajes con handshake
async function onMessage(msg) {
  if (isHello(msg)) return hello("orchestration");
  if (!validateReq(msg)) return fail("INVALID_SCHEMA_MIN");

  // Reenvío simple a agentes
  const target = msg.agent;
  if (!target) return fail("MISSING_AGENT");
  
  // Simular respuesta del agente
  if (target === 'context') {
    return ok({
      project: "demo-repo",
      branch: "main",
      filesChanged: ["src/index.js"],
    });
  }
  
  if (target === 'prompting') {
    return ok({
      templateId: "default",
      filled: "Template default with vars: {}",
    });
  }
  
  if (target === 'rules') {
    return ok({
      rulesetVersion: "1.0.0",
      violations: [],
      policy_ok: true,
    });
  }
  
  return fail(`UNKNOWN_AGENT: ${target}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Verificar si hay input en stdin para handshake
  if (!process.stdin.isTTY) {
    let rawInput = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      rawInput += chunk;
    });
    
    process.stdin.on('end', async () => {
      if (rawInput.trim()) {
        try {
          const data = JSON.parse(rawInput);
          if (data.type === "hello" || data.requestId) {
            const response = await onMessage(data);
            console.log(JSON.stringify(response, null, 2));
            process.exit(0);
          }
        } catch (error) {
          // Continuar con lógica normal
        }
      }
      
      // Si no es handshake, ejecutar lógica normal
      main().catch(e => {
        console.error(` ${e.message}`);
        process.exit(1);
      });
    });
  } else {
    // Sin input en stdin, ejecutar lógica normal
    main().catch(e => {
      console.error(` ${e.message}`);
      process.exit(1);
    });
  }
}

export default WorkflowOrchestrator;
