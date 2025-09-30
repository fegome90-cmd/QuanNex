#!/usr/bin/env node

/**
 * Agent TaskDB Integration - Integración entre agentes y TaskDB
 * PR-L: Integración agentes ↔ TaskDB (TaskKernel)
 * 
 * Proporciona integración completa entre agentes y la base de datos de tareas
 * con contratos de I/O validados y gestión automática de tareas
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import TaskDBKernel from './taskdb-kernel.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración por defecto
const DEFAULT_CONFIG = {
  taskdb: {
    dataDir: join(PROJECT_ROOT, 'data'),
    dbFile: 'taskdb.json'
  },
  agents: {
    context: {
      project: 'Agent Context Project',
      feature: 'Context Processing'
    },
    prompting: {
      project: 'Agent Prompting Project',
      feature: 'Prompt Generation'
    },
    rules: {
      project: 'Agent Rules Project',
      feature: 'Rules Processing'
    }
  },
  contracts: {
    input: {
      required: ['action', 'data'],
      optional: ['task_id', 'project_id', 'metadata']
    },
    output: {
      required: ['success', 'timestamp'],
      optional: ['result', 'task_id', 'metadata', 'performance']
    }
  }
};

class AgentTaskDBIntegration {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.taskdb = new TaskDBKernel(this.config.taskdb);
    this.projects = new Map();
    this.tasks = new Map();
    
    this.init();
  }

  /**
   * Inicializar la integración
   */
  async init() {
    console.log('🔄 Inicializando integración Agent ↔ TaskDB...');
    
    try {
      // Crear proyectos para cada agente si no existen
      await this.ensureAgentProjects();
      
      // Cargar tareas existentes
      await this.loadExistingTasks();
      
      console.log('✅ Integración Agent ↔ TaskDB inicializada');
    } catch (error) {
      console.error(`❌ Error inicializando integración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Asegurar que existen proyectos para cada agente
   */
  async ensureAgentProjects() {
    for (const [agentName, agentConfig] of Object.entries(this.config.agents)) {
      const existingProjects = this.taskdb.listProjects();
      let project = existingProjects.find(p => p.title === agentConfig.project);
      
      if (!project) {
        project = this.taskdb.createProject({
          title: agentConfig.project,
          description: `Proyecto para el agente ${agentName}`,
          features: [agentConfig.feature],
          data: {
            agent: agentName,
            integration_version: '1.0.0'
          }
        });
        console.log(`✅ Proyecto creado para agente ${agentName}: ${project.id}`);
      }
      
      this.projects.set(agentName, project);
    }
  }

  /**
   * Cargar tareas existentes
   */
  async loadExistingTasks() {
    const allTasks = this.taskdb.listTasks();
    
    for (const task of allTasks) {
      const project = this.taskdb.getProject(task.project_id);
      if (project) {
        const agentName = this.getAgentByProject(project);
        if (agentName) {
          this.tasks.set(task.id, { ...task, agent: agentName });
        }
      }
    }
    
    console.log(`📋 Cargadas ${this.tasks.size} tareas existentes`);
  }

  /**
   * Obtener agente por proyecto
   */
  getAgentByProject(project) {
    for (const [agentName, agentConfig] of Object.entries(this.config.agents)) {
      if (project.title === agentConfig.project) {
        return agentName;
      }
    }
    return null;
  }

  /**
   * Procesar input de agente con integración TaskDB
   */
  async processAgentInput(agentName, input) {
    try {
      // Validar input según contrato
      this.validateInput(input);
      
      // Crear tarea en TaskDB
      const task = await this.createAgentTask(agentName, input);
      
      // Procesar con agente
      const result = await this.executeAgent(agentName, input);
      
      // Actualizar tarea con resultado
      await this.updateAgentTask(task.id, {
        status: result.success ? 'done' : 'review',
        data: {
          ...task.data,
          result: result,
          completed_at: new Date().toISOString()
        }
      });
      
      // Validar output según contrato
      this.validateOutput(result);
      
      return {
        ...result,
        task_id: task.id,
        metadata: {
          agent: agentName,
          project_id: task.project_id,
          created_at: task.created_at,
          completed_at: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error(`❌ Error procesando input de agente ${agentName}: ${error.message}`);
      
      // Crear tarea de error si es posible
      try {
        const task = await this.createAgentTask(agentName, input);
        await this.updateAgentTask(task.id, {
          status: 'review',
          data: {
            ...task.data,
            error: error.message,
            failed_at: new Date().toISOString()
          }
        });
      } catch (taskError) {
        console.error(`❌ Error creando tarea de error: ${taskError.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Crear tarea para agente
   */
  async createAgentTask(agentName, input) {
    const project = this.projects.get(agentName);
    if (!project) {
      throw new Error(`Proyecto no encontrado para agente ${agentName}`);
    }

    const task = this.taskdb.createTask({
      project_id: project.id,
      title: `Tarea ${agentName} - ${input.action}`,
      description: `Procesamiento de ${input.action} por agente ${agentName}`,
      status: 'doing',
      assignee: agentName,
      feature: this.config.agents[agentName].feature,
      data: {
        agent: agentName,
        input: input,
        created_at: new Date().toISOString()
      }
    });

    this.tasks.set(task.id, { ...task, agent: agentName });
    return task;
  }

  /**
   * Actualizar tarea de agente
   */
  async updateAgentTask(taskId, updateData) {
    const task = this.taskdb.updateTask(taskId, updateData);
    this.tasks.set(taskId, { ...task, agent: this.tasks.get(taskId)?.agent });
    return task;
  }

  /**
   * Ejecutar agente
   */
  async executeAgent(agentName, input) {
    const agentPath = join(PROJECT_ROOT, 'agents', agentName, 'server.js');
    
    if (!existsSync(agentPath)) {
      throw new Error(`Agente no encontrado: ${agentPath}`);
    }

    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      
      const child = spawn('node', [agentPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: PROJECT_ROOT
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Agente falló con código ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Error parseando output del agente: ${error.message}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Enviar input al agente
      child.stdin.write(JSON.stringify(input));
      child.stdin.end();
    });
  }

  /**
   * Validar input según contrato
   */
  validateInput(input) {
    const contract = this.config.contracts.input;
    
    // Validar campos requeridos
    for (const field of contract.required) {
      if (!(field in input)) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }
    
    // Validar tipos básicos
    if (typeof input.action !== 'string') {
      throw new Error('Campo "action" debe ser string');
    }
    
    if (typeof input.data !== 'object' || input.data === null) {
      throw new Error('Campo "data" debe ser objeto');
    }
  }

  /**
   * Validar output según contrato
   */
  validateOutput(output) {
    const contract = this.config.contracts.output;
    
    // Validar campos requeridos
    for (const field of contract.required) {
      if (!(field in output)) {
        throw new Error(`Campo requerido faltante en output: ${field}`);
      }
    }
    
    // Validar tipos básicos
    if (typeof output.success !== 'boolean') {
      throw new Error('Campo "success" debe ser boolean');
    }
    
    if (typeof output.timestamp !== 'string') {
      throw new Error('Campo "timestamp" debe ser string');
    }
  }

  /**
   * Obtener estadísticas de integración
   */
  getIntegrationStats() {
    const stats = {
      total_projects: this.projects.size,
      total_tasks: this.tasks.size,
      tasks_by_agent: {},
      tasks_by_status: {},
      performance_metrics: {}
    };

    // Estadísticas por agente
    for (const [agentName] of Object.entries(this.config.agents)) {
      const agentTasks = Array.from(this.tasks.values()).filter(t => t.agent === agentName);
      stats.tasks_by_agent[agentName] = agentTasks.length;
    }

    // Estadísticas por estado
    const allTasks = Array.from(this.tasks.values());
    for (const task of allTasks) {
      const status = task.status || 'unknown';
      stats.tasks_by_status[status] = (stats.tasks_by_status[status] || 0) + 1;
    }

    // Métricas de rendimiento
    const completedTasks = allTasks.filter(t => t.status === 'done');
    if (completedTasks.length > 0) {
      const durations = completedTasks
        .filter(t => t.data?.result?.performance?.duration)
        .map(t => t.data.result.performance.duration);
      
      if (durations.length > 0) {
        stats.performance_metrics = {
          avg_duration: durations.reduce((a, b) => a + b, 0) / durations.length,
          min_duration: Math.min(...durations),
          max_duration: Math.max(...durations)
        };
      }
    }

    return stats;
  }

  /**
   * Obtener tareas por agente
   */
  getTasksByAgent(agentName) {
    return Array.from(this.tasks.values()).filter(t => t.agent === agentName);
  }

  /**
   * Obtener tareas por estado
   */
  getTasksByStatus(status) {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  /**
   * Limpiar tareas completadas
   */
  async cleanupCompletedTasks() {
    const completedTasks = this.getTasksByStatus('done');
    let cleaned = 0;

    for (const task of completedTasks) {
      try {
        this.taskdb.deleteTask(task.id);
        this.tasks.delete(task.id);
        cleaned++;
      } catch (error) {
        console.warn(`⚠️ Error eliminando tarea ${task.id}: ${error.message}`);
      }
    }

    console.log(`🧹 Limpiadas ${cleaned} tareas completadas`);
    return cleaned;
  }

  /**
   * Exportar datos de integración
   */
  exportIntegrationData() {
    const data = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      projects: Array.from(this.projects.values()),
      tasks: Array.from(this.tasks.values()),
      stats: this.getIntegrationStats()
    };

    const outputFile = join(this.config.taskdb.dataDir, `integration-export-${Date.now()}.json`);
    writeFileSync(outputFile, JSON.stringify(data, null, 2));
    
    console.log(`📤 Datos de integración exportados a: ${outputFile}`);
    return outputFile;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const integration = new AgentTaskDBIntegration();

  try {
    switch (command) {
      case 'init':
        console.log('✅ Integración Agent ↔ TaskDB inicializada');
        break;

      case 'stats':
        const stats = integration.getIntegrationStats();
        console.log('📊 Estadísticas de integración:');
        console.log(JSON.stringify(stats, null, 2));
        break;

      case 'test':
        // Test de integración
        const testInput = {
          action: 'test',
          data: { test: true }
        };
        
        console.log('🧪 Probando integración con agente context...');
        integration.processAgentInput('context', testInput)
          .then(result => {
            console.log('✅ Test exitoso:', result);
          })
          .catch(error => {
            console.error('❌ Test falló:', error.message);
          });
        break;

      case 'cleanup':
        integration.cleanupCompletedTasks();
        break;

      case 'export':
        const exportFile = integration.exportIntegrationData();
        console.log(`📤 Exportado a: ${exportFile}`);
        break;

      default:
        console.log(`
Agent TaskDB Integration - Integración entre agentes y TaskDB

Comandos disponibles:
  init     - Inicializar integración
  stats    - Mostrar estadísticas
  test     - Probar integración
  cleanup  - Limpiar tareas completadas
  export   - Exportar datos de integración

Uso: node tools/agent-taskdb-integration.mjs <comando>
        `);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

export default AgentTaskDBIntegration;
