#!/usr/bin/env node

/**
 * TaskDB Core - Sistema Antifrágil de Gestión de Tareas
 * Plan Maestro TaskDB - Ola 1: Robustez
 *
 * Implementa las entidades núcleo del sistema TaskDB con:
 * - Entidades: task, run, gate, artifact, event, report
 * - Esquemas con policy_version y status_derived
 * - API CRUD completa
 * - Validación de integridad
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración del sistema
const CONFIG = {
  backend: process.env.TASKDB_BACKEND || 'sqlite',
  dataDir: process.env.TASKDB_DATA_DIR || join(__dirname, '../data'),
  dbFile: process.env.TASKDB_DB_FILE || 'taskdb.sqlite',
  policyVersion: process.env.TASKDB_POLICY_VERSION || '1.0.0',
};

class TaskDBCore {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.dataDir = this.config.dataDir;
    this.dbFile = join(this.dataDir, this.config.dbFile);

    // Asegurar que el directorio existe
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    this.init();
  }

  /**
   * Inicializar el sistema TaskDB
   */
  init() {
    try {
      this.initializeDatabase();
      this.initializePolicies();
      console.log(`[TaskDB Core] Sistema inicializado con backend: ${this.config.backend}`);
    } catch (error) {
      console.error('[TaskDB Core] Error en inicialización:', error.message);
      throw error;
    }
  }

  /**
   * Inicializar la base de datos
   */
  initializeDatabase() {
    if (this.config.backend === 'sqlite') {
      this.initSQLite();
    } else if (this.config.backend === 'postgresql') {
      this.initPostgreSQL();
    } else {
      throw new Error(`Backend no soportado: ${this.config.backend}`);
    }
  }

  /**
   * Inicializar SQLite
   */
  initSQLite() {
    // Para SQLite, usamos un archivo JSON como fallback por ahora
    // En la Ola 3 migraremos a SQLite real
    this.jsonFile = join(this.dataDir, 'taskdb-core.json');
    this.loadJSONData();
  }

  /**
   * Inicializar PostgreSQL
   */
  initPostgreSQL() {
    // Implementación futura en Ola 3
    throw new Error('PostgreSQL será implementado en Ola 3');
  }

  /**
   * Cargar datos desde JSON (fallback para Ola 1)
   */
  loadJSONData() {
    if (existsSync(this.jsonFile)) {
      const data = JSON.parse(readFileSync(this.jsonFile, 'utf8'));
      this.data = data;
    } else {
      this.data = {
        version: '1.0.0',
        policies: [],
        tasks: [],
        runs: [],
        gates: [],
        artifacts: [],
        events: [],
        reports: [],
      };
      this.saveJSONData();
    }
  }

  /**
   * Guardar datos en JSON
   */
  saveJSONData() {
    writeFileSync(this.jsonFile, JSON.stringify(this.data, null, 2), 'utf8');
  }

  /**
   * Inicializar políticas
   */
  initializePolicies() {
    const initialPolicy = {
      id: randomUUID(),
      version: '1.0.0',
      name: 'Initial Policy',
      description: 'Política inicial del TaskDB',
      rules: {
        task_validation: {
          required_fields: ['title', 'description', 'priority'],
          max_title_length: 255,
          allowed_priorities: ['critical', 'high', 'medium', 'low'],
        },
        run_validation: {
          max_duration_ms: 3600000,
          required_metrics: ['success_rate', 'error_count'],
        },
        gate_validation: {
          required_types: ['lint', 'policy', 'security', 'quality', 'truth'],
          max_checks_per_gate: 100,
        },
      },
      created_at: new Date().toISOString(),
      is_active: true,
    };

    if (!this.data.policies.find(p => p.version === '1.0.0')) {
      this.data.policies.push(initialPolicy);
      this.saveJSONData();
    }
  }

  // ==================== API CRUD ====================

  /**
   * Crear una nueva tarea
   */
  createTask(taskData) {
    const task = {
      id: randomUUID(),
      title: taskData.title,
      description: taskData.description || '',
      status: 'todo',
      priority: taskData.priority || 'medium',
      policy_version: this.config.policyVersion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      assigned_to: taskData.assigned_to || null,
      tags: taskData.tags || [],
      metadata: taskData.metadata || {},
    };

    this.validateTask(task);
    this.data.tasks.push(task);
    this.saveJSONData();
    this.createEvent('task_created', task.id, 'task', task);

    return task;
  }

  /**
   * Actualizar una tarea
   */
  updateTask(taskId, updates) {
    const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    const oldTask = { ...this.data.tasks[taskIndex] };
    const updatedTask = {
      ...oldTask,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.validateTask(updatedTask);
    this.data.tasks[taskIndex] = updatedTask;
    this.saveJSONData();
    this.createEvent('task_updated', taskId, 'task', { old: oldTask, new: updatedTask });

    return updatedTask;
  }

  /**
   * Crear un run
   */
  createRun(runData) {
    const run = {
      id: randomUUID(),
      task_id: runData.task_id,
      status: 'pending',
      started_at: new Date().toISOString(),
      completed_at: null,
      duration_ms: null,
      tool_calls: runData.tool_calls || [],
      metrics: runData.metrics || {},
      error_message: null,
    };

    this.validateRun(run);
    this.data.runs.push(run);
    this.saveJSONData();
    this.createEvent('run_started', run.id, 'run', run);

    return run;
  }

  /**
   * Actualizar un run
   */
  updateRun(runId, updates) {
    const runIndex = this.data.runs.findIndex(r => r.id === runId);
    if (runIndex === -1) {
      throw new Error(`Run no encontrado: ${runId}`);
    }

    const oldRun = { ...this.data.runs[runIndex] };
    const updatedRun = {
      ...oldRun,
      ...updates,
    };

    // Calcular duración si se completó
    if (updates.status === 'completed' || updates.status === 'failed') {
      const startTime = new Date(oldRun.started_at).getTime();
      const endTime = new Date().getTime();
      updatedRun.completed_at = new Date().toISOString();
      updatedRun.duration_ms = endTime - startTime;
    }

    this.validateRun(updatedRun);
    this.data.runs[runIndex] = updatedRun;
    this.saveJSONData();
    this.createEvent('run_completed', runId, 'run', updatedRun);

    return updatedRun;
  }

  /**
   * Crear un gate
   */
  createGate(gateData) {
    const gate = {
      id: randomUUID(),
      name: gateData.name,
      type: gateData.type,
      status: 'pending',
      checks: gateData.checks || [],
      policy_version: this.config.policyVersion,
      run_id: gateData.run_id || null,
      created_at: new Date().toISOString(),
    };

    this.validateGate(gate);
    this.data.gates.push(gate);
    this.saveJSONData();
    this.createEvent('gate_created', gate.id, 'gate', gate);

    return gate;
  }

  /**
   * Actualizar un gate
   */
  updateGate(gateId, updates) {
    const gateIndex = this.data.gates.findIndex(g => g.id === gateId);
    if (gateIndex === -1) {
      throw new Error(`Gate no encontrado: ${gateId}`);
    }

    const oldGate = { ...this.data.gates[gateIndex] };
    const updatedGate = {
      ...oldGate,
      ...updates,
    };

    this.validateGate(updatedGate);
    this.data.gates[gateIndex] = updatedGate;
    this.saveJSONData();
    this.createEvent('gate_updated', gateId, 'gate', updatedGate);

    return updatedGate;
  }

  /**
   * Crear un artifact
   */
  createArtifact(artifactData) {
    const artifact = {
      id: randomUUID(),
      name: artifactData.name,
      type: artifactData.type,
      uri: artifactData.uri,
      hash: artifactData.hash,
      size_bytes: artifactData.size_bytes,
      created_at: new Date().toISOString(),
      run_id: artifactData.run_id,
      metadata: artifactData.metadata || {},
    };

    this.validateArtifact(artifact);
    this.data.artifacts.push(artifact);
    this.saveJSONData();
    this.createEvent('artifact_created', artifact.id, 'artifact', artifact);

    return artifact;
  }

  /**
   * Crear un evento
   */
  createEvent(type, entityId, entityType, data, source = 'api') {
    const event = {
      id: randomUUID(),
      type,
      entity_id: entityId,
      entity_type: entityType,
      timestamp: new Date().toISOString(),
      data,
      source,
    };

    this.data.events.push(event);
    this.saveJSONData();

    return event;
  }

  /**
   * Crear un reporte con provenance
   */
  createReport(reportData) {
    const report = {
      id: randomUUID(),
      title: reportData.title,
      type: reportData.type,
      status: 'draft',
      content: reportData.content,
      report_provenance: reportData.report_provenance || {},
      created_at: new Date().toISOString(),
      published_at: null,
      retracted_at: null,
    };

    this.validateReport(report);
    this.data.reports.push(report);
    this.saveJSONData();
    this.createEvent('report_created', report.id, 'report', report);

    return report;
  }

  // ==================== VALIDACIONES ====================

  /**
   * Validar una tarea
   */
  validateTask(task) {
    const policy = this.data.policies.find(p => p.version === task.policy_version);
    if (!policy) {
      throw new Error(`Política no encontrada: ${task.policy_version}`);
    }

    const rules = policy.rules.task_validation;

    // Validar campos requeridos
    for (const field of rules.required_fields) {
      if (!task[field]) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    // Validar longitud del título
    if (task.title.length > rules.max_title_length) {
      throw new Error(`Título excede longitud máxima: ${rules.max_title_length}`);
    }

    // Validar prioridad
    if (!rules.allowed_priorities.includes(task.priority)) {
      throw new Error(`Prioridad no válida: ${task.priority}`);
    }
  }

  /**
   * Validar un run
   */
  validateRun(run) {
    const policy = this.data.policies.find(p => p.version === this.config.policyVersion);
    const rules = policy.rules.run_validation;

    // Validar duración máxima
    if (run.duration_ms && run.duration_ms > rules.max_duration_ms) {
      throw new Error(`Duración excede máximo: ${rules.max_duration_ms}ms`);
    }

    // Validar métricas requeridas para runs completados
    if (run.status === 'completed') {
      for (const metric of rules.required_metrics) {
        if (run.metrics[metric] === undefined || run.metrics[metric] === null) {
          throw new Error(`Métrica requerida faltante: ${metric}`);
        }
      }
    }
  }

  /**
   * Validar un gate
   */
  validateGate(gate) {
    const policy = this.data.policies.find(p => p.version === gate.policy_version);
    const rules = policy.rules.gate_validation;

    // Validar tipo de gate
    if (!rules.required_types.includes(gate.type)) {
      throw new Error(`Tipo de gate no válido: ${gate.type}`);
    }

    // Validar número máximo de checks
    if (gate.checks.length > rules.max_checks_per_gate) {
      throw new Error(`Número de checks excede máximo: ${rules.max_checks_per_gate}`);
    }
  }

  /**
   * Validar un artifact
   */
  validateArtifact(artifact) {
    if (!artifact.hash || artifact.hash.length !== 64) {
      throw new Error('Hash SHA256 requerido (64 caracteres)');
    }

    if (artifact.size_bytes < 0) {
      throw new Error('Tamaño debe ser positivo');
    }
  }

  /**
   * Validar un reporte
   */
  validateReport(report) {
    if (!report.report_provenance) {
      throw new Error('Report provenance es requerido');
    }

    if (!report.report_provenance.verification_snapshot_ts) {
      throw new Error('verification_snapshot_ts es requerido en provenance');
    }
  }

  // ==================== QUERIES ====================

  /**
   * Obtener tareas por estado
   */
  getTasksByStatus(status) {
    return this.data.tasks.filter(t => t.status === status);
  }

  /**
   * Obtener runs por tarea
   */
  getRunsByTask(taskId) {
    return this.data.runs.filter(r => r.task_id === taskId);
  }

  /**
   * Obtener gates por run
   */
  getGatesByRun(runId) {
    return this.data.gates.filter(g => g.run_id === runId);
  }

  /**
   * Obtener artifacts por run
   */
  getArtifactsByRun(runId) {
    return this.data.artifacts.filter(a => a.run_id === runId);
  }

  /**
   * Obtener eventos por entidad
   */
  getEventsByEntity(entityId, entityType) {
    return this.data.events.filter(e => e.entity_id === entityId && e.entity_type === entityType);
  }

  /**
   * Calcular status derivado de una tarea
   */
  calculateTaskStatusDerived(taskId) {
    const task = this.data.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    const runs = this.getRunsByTask(taskId);
    const gates = runs.flatMap(run => this.getGatesByRun(run.id));

    const totalRuns = runs.length;
    const successfulRuns = runs.filter(r => r.status === 'completed').length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;
    const totalGates = gates.length;
    const passedGates = gates.filter(g => g.status === 'pass').length;
    const failedGates = gates.filter(g => g.status === 'fail').length;

    const healthScore =
      totalRuns === 0
        ? 0.0
        : (successfulRuns / totalRuns) * (totalGates === 0 ? 1 : passedGates / totalGates);

    let derivedStatus;
    if (task.status === 'done') {
      derivedStatus = 'completed';
    } else if (task.status === 'cancelled') {
      derivedStatus = 'cancelled';
    } else if (failedGates > 0) {
      derivedStatus = 'blocked';
    } else if (runs.some(r => r.status === 'running')) {
      derivedStatus = 'running';
    } else if (failedRuns > 0) {
      derivedStatus = 'failed';
    } else {
      derivedStatus = 'pending';
    }

    return {
      task_id: taskId,
      task_status: task.status,
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      failed_runs: failedRuns,
      total_gates: totalGates,
      passed_gates: passedGates,
      failed_gates: failedGates,
      health_score: healthScore,
      derived_status: derivedStatus,
    };
  }

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtener estadísticas generales del sistema
   */
  getSystemStats() {
    return {
      total_tasks: this.data.tasks.length,
      tasks_by_status: {
        todo: this.getTasksByStatus('todo').length,
        doing: this.getTasksByStatus('doing').length,
        review: this.getTasksByStatus('review').length,
        done: this.getTasksByStatus('done').length,
        cancelled: this.getTasksByStatus('cancelled').length,
      },
      total_runs: this.data.runs.length,
      total_gates: this.data.gates.length,
      total_artifacts: this.data.artifacts.length,
      total_events: this.data.events.length,
      total_reports: this.data.reports.length,
      policy_versions: this.data.policies.map(p => p.version),
    };
  }
}

export default TaskDBCore;
