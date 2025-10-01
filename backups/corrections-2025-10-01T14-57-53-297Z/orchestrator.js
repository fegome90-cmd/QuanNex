#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync
} from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const DEFAULT_TIMEOUT_MS = 60_000; // NEW: timeout por paso/health
const KILL_GRACE_MS = 2_000; // NEW: gracia antes de SIGKILL
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

    try {
      const executedSteps = new Set();
      const pending = new Set(workflow.steps.map(s => s.step_id));

      while (pending.size > 0) {
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

  async callAgent(
    agentName,
    action,
    input,
    { timeoutMs = DEFAULT_TIMEOUT_MS } = {}
  ) {
    const runCleanPath = join(PROJECT_ROOT, 'core', 'scripts', 'run-clean.sh');
    if (!existsSync(runCleanPath)) {
      throw new Error(`run-clean.sh not found at ${runCleanPath}`);
    }

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
          cwd: PROJECT_ROOT
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
      child.stdin.write(JSON.stringify({ action, ...input }));
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
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    // eslint-disable-next-line no-console
    console.error(` ${e.message}`);
    process.exit(1);
  });
}

export default WorkflowOrchestrator;
