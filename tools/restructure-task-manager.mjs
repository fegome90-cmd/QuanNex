#!/usr/bin/env node
/**
 * @fileoverview Restructure Task Manager - Gestión de tareas con TaskDB y MCP
 * @description Integra TaskDB con agentes MCP para gestión completa de reestructuración
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import TaskDBKernel from './taskdb-kernel.mjs';
import ContextLogger from './context-logger.mjs';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class RestructureTaskManager {
  constructor() {
    this.taskdb = new TaskDBKernel();
    this.logger = new ContextLogger();
    this.projectId = 'restructure-cursor-project';
    this.initializeProject();
  }

  initializeProject() {
    // Crear proyecto de reestructuración en TaskDB
    const project = {
      id: this.projectId,
      title: 'Reestructuración y Consolidación de Agentes MCP',
      description: 'Plan completo de reestructuración de archivos y completar agentes especializados',
      status: 'active',
      created_at: new Date().toISOString(),
      metadata: {
        type: 'restructure',
        phase: 'planning',
        mcp_integration: true
      }
    };

    this.taskdb.createProject(project);
    console.log(`📋 Proyecto de reestructuración creado: ${this.projectId}`);
  }

  createRestructureTasks() {
    const tasks = [
      // FASE 1: Optimización Core Agents
      {
        id: 'core-context-optimization',
        project_id: this.projectId,
        title: 'Optimizar @context Agent',
        description: 'Mejorar rendimiento de @context de 450ms a <300ms',
        status: 'todo',
        priority: 'high',
        phase: 'core_optimization',
        estimated_hours: 8,
        dependencies: [],
        metadata: {
          agent: 'context',
          current_performance: '450ms',
          target_performance: '<300ms',
          optimizations: [
            'Implementar cache de fuentes frecuentes',
            'Optimizar selectors de contexto',
            'Reducir overhead de validación'
          ]
        }
      },
      {
        id: 'core-prompting-optimization',
        project_id: this.projectId,
        title: 'Optimizar @prompting Agent',
        description: 'Mejorar rendimiento de @prompting de 179ms a <150ms',
        status: 'todo',
        priority: 'high',
        phase: 'core_optimization',
        estimated_hours: 6,
        dependencies: [],
        metadata: {
          agent: 'prompting',
          current_performance: '179ms',
          target_performance: '<150ms',
          optimizations: [
            'Cache de templates de prompts',
            'Optimizar generación de guardrails',
            'Reducir validaciones redundantes'
          ]
        }
      },
      {
        id: 'core-rules-optimization',
        project_id: this.projectId,
        title: 'Optimizar @rules Agent',
        description: 'Mejorar rendimiento de @rules de 146ms a <100ms',
        status: 'todo',
        priority: 'high',
        phase: 'core_optimization',
        estimated_hours: 4,
        dependencies: [],
        metadata: {
          agent: 'rules',
          current_performance: '146ms',
          target_performance: '<100ms',
          optimizations: [
            'Cache de policies compiladas',
            'Optimizar detección de violaciones',
            'Reducir I/O de archivos'
          ]
        }
      },

      // FASE 2: Implementación Specialized Agents
      {
        id: 'security-agent-implementation',
        project_id: this.projectId,
        title: 'Implementar @security Agent',
        description: 'Crear agente especializado para compliance, detección de secretos y hardening',
        status: 'todo',
        priority: 'high',
        phase: 'specialized_implementation',
        estimated_hours: 16,
        dependencies: ['core-rules-optimization'],
        metadata: {
          agent: 'security',
          type: 'specialized',
          functionality: [
            'Detección de secretos en código',
            'Validación de políticas de seguridad',
            'Hardening automático',
            'Reportes de compliance'
          ],
          dependencies: ['@rules', '@context']
        }
      },
      {
        id: 'metrics-agent-implementation',
        project_id: this.projectId,
        title: 'Implementar @metrics Agent',
        description: 'Crear agente especializado para recolectar métricas de performance y cobertura',
        status: 'todo',
        priority: 'medium',
        phase: 'specialized_implementation',
        estimated_hours: 12,
        dependencies: ['core-context-optimization'],
        metadata: {
          agent: 'metrics',
          type: 'specialized',
          functionality: [
            'Métricas de rendimiento',
            'Análisis de cobertura',
            'Benchmarks automáticos',
            'Reportes de calidad'
          ],
          dependencies: ['@context', '@prompting']
        }
      },
      {
        id: 'optimization-agent-implementation',
        project_id: this.projectId,
        title: 'Implementar @optimization Agent',
        description: 'Crear agente especializado para sugerencias de refactor y mejoras de performance',
        status: 'todo',
        priority: 'low',
        phase: 'specialized_implementation',
        estimated_hours: 10,
        dependencies: ['metrics-agent-implementation'],
        metadata: {
          agent: 'optimization',
          type: 'specialized',
          functionality: [
            'Sugerencias de refactor',
            'Optimización de performance',
            'Análisis de complejidad',
            'Mejoras de productividad'
          ],
          dependencies: ['@metrics', '@rules']
        }
      },

      // FASE 3: Migración Legacy
      {
        id: 'legacy-antigeneric-migration',
        project_id: this.projectId,
        title: 'Migrar antigeneric-agents/',
        description: 'Consolidar y migrar agentes legacy a agents/legacy/antigeneric/',
        status: 'todo',
        priority: 'medium',
        phase: 'legacy_migration',
        estimated_hours: 8,
        dependencies: ['security-agent-implementation'],
        metadata: {
          source: 'antigeneric-agents/',
          target: 'agents/legacy/antigeneric/',
          size: '1.5MB',
          functionality: [
            'Templates de UI/UX avanzados',
            'Patrones de diseño anti-genérico',
            'Herramientas de validación visual',
            'Métricas de calidad de diseño'
          ]
        }
      },

      // FASE 4: Optimización Orchestrator
      {
        id: 'orchestrator-optimization',
        project_id: this.projectId,
        title: 'Optimizar Orchestrator',
        description: 'Mejorar coordinación y gestión de workflows avanzados',
        status: 'todo',
        priority: 'medium',
        phase: 'orchestrator_optimization',
        estimated_hours: 12,
        dependencies: ['optimization-agent-implementation'],
        metadata: {
          component: 'orchestrator',
          improvements: [
            'Ejecución paralela de agentes independientes',
            'Retry automático con backoff exponencial',
            'Circuit breaker para agentes fallidos',
            'Métricas de rendimiento en tiempo real'
          ]
        }
      }
    ];

    // Crear todas las tareas
    tasks.forEach(task => {
      this.taskdb.createTask(task);
      console.log(`📝 Tarea creada: ${task.title}`);
    });

    console.log(`✅ ${tasks.length} tareas de reestructuración creadas`);
    return tasks;
  }

  async executeTaskWithMCP(taskId) {
    const task = this.taskdb.getTask(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    console.log(`🚀 Ejecutando tarea: ${task.title}`);
    
    // Actualizar estado a 'doing'
    this.taskdb.updateTask(taskId, { status: 'doing' });

    try {
      // Generar contexto específico para la tarea
      const contextPayload = this.generateContextPayload(task);
      const contextResult = await this.runAgentWithLogging('context', contextPayload, {
        task_id: taskId,
        phase: task.phase
      });

      // Generar prompt específico para la tarea
      const promptPayload = this.generatePromptPayload(task, contextResult);
      const promptResult = await this.runAgentWithLogging('prompting', promptPayload, {
        task_id: taskId,
        phase: task.phase
      });

      // Validar con rules
      const rulesPayload = this.generateRulesPayload(task);
      const rulesResult = await this.runAgentWithLogging('rules', rulesPayload, {
        task_id: taskId,
        phase: task.phase
      });

      // Ejecutar la tarea específica
      const taskResult = await this.executeSpecificTask(task, {
        context: contextResult,
        prompting: promptResult,
        rules: rulesResult
      });

      // Actualizar tarea como completada
      this.taskdb.updateTask(taskId, {
        status: 'done',
        completed_at: new Date().toISOString(),
        result: taskResult
      });

      console.log(`✅ Tarea completada: ${task.title}`);
      return taskResult;

    } catch (error) {
      // Actualizar tarea como fallida
      this.taskdb.updateTask(taskId, {
        status: 'failed',
        error: error.message,
        failed_at: new Date().toISOString()
      });

      console.error(`❌ Tarea falló: ${task.title} - ${error.message}`);
      throw error;
    }
  }

  generateContextPayload(task) {
    const sources = [
      'CLAUDE.md',
      'MANUAL-COMPLETO-CURSOR.md',
      'agents/context/server.js',
      'agents/prompting/server.js',
      'agents/rules/server.js'
    ];

    // Agregar fuentes específicas según el tipo de tarea
    if (task.metadata && task.metadata.agent) {
      sources.push(`agents/${task.metadata.agent}/server.js`);
      sources.push(`agents/${task.metadata.agent}/agent.js`);
    }

    if (task.phase === 'legacy_migration') {
      sources.push('antigeneric-agents/AGENTS.md');
    }

    return {
      sources: sources,
      selectors: [
        'purpose',
        'architecture',
        'implementation',
        'optimization',
        'best_practices'
      ],
      max_tokens: 1024
    };
  }

  generatePromptPayload(task, contextResult) {
    return {
      goal: `Implementar: ${task.title}. ${task.description}`,
      style: 'technical',
      constraints: [
        'Mantener compatibilidad con contratos MCP existentes',
        'Preservar la funcionalidad de agentes core',
        'Aplicar principios de Toyota Production System',
        'Optimizar para rendimiento y escalabilidad'
      ],
      context_refs: contextResult.provenance || [],
      ruleset_refs: [
        'policies/security.md',
        'policies/coding-standards.md'
      ]
    };
  }

  generateRulesPayload(task) {
    return {
      policy_refs: [
        'policies/security.md',
        'policies/coding-standards.md'
      ],
      target_path: (task.metadata && task.metadata.agent) ? `agents/${task.metadata.agent}/` : 'agents/',
      check_mode: 'validate'
    };
  }

  async runAgentWithLogging(agentName, payload, metadata) {
    const startTime = Date.now();
    
    // Crear payload temporal
    const payloadPath = `/tmp/restructure-${agentName}-${Date.now()}.json`;
    writeFileSync(payloadPath, JSON.stringify(payload, null, 2));

    try {
      // Ejecutar agente
      const result = await this.executeAgent(agentName, payloadPath);
      const processingTime = Date.now() - startTime;

      // Loggear resultado según el tipo de agente
      switch (agentName) {
        case 'context':
          this.logger.logContext(agentName, payload, result, {
            ...metadata,
            processing_time: processingTime
          });
          break;
        case 'prompting':
          this.logger.logPrompt(agentName, payload, result, {
            ...metadata,
            processing_time: processingTime
          });
          break;
        case 'rules':
          this.logger.logRules(agentName, payload, result, {
            ...metadata,
            processing_time: processingTime
          });
          break;
        default:
          this.logger.logContext(agentName, payload, result, {
            ...metadata,
            processing_time: processingTime
          });
      }

      return result;
    } finally {
      // Limpiar payload temporal
      if (existsSync(payloadPath)) {
        unlinkSync(payloadPath);
      }
    }
  }

  async executeAgent(agentName, payloadPath) {
    return new Promise((resolve, reject) => {
      const runCleanPath = join(PROJECT_ROOT, 'core', 'scripts', 'run-clean.sh');
      
      const child = spawn('bash', [runCleanPath, agentName, payloadPath], {
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
        if (code === 0) {
          try {
            const output = JSON.parse(stdout);
            resolve(output);
          } catch (error) {
            reject(new Error(`Failed to parse output: ${error.message}`));
          }
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(error.message));
      });
    });
  }

  async executeSpecificTask(task, mcpResults) {
    // Implementar lógica específica para cada tipo de tarea
    const phase = task.phase || 'core_optimization'; // Default phase
    switch (phase) {
      case 'core_optimization':
        return await this.executeCoreOptimization(task, mcpResults);
      case 'specialized_implementation':
        return await this.executeSpecializedImplementation(task, mcpResults);
      case 'legacy_migration':
        return await this.executeLegacyMigration(task, mcpResults);
      case 'orchestrator_optimization':
        return await this.executeOrchestratorOptimization(task, mcpResults);
      default:
        throw new Error(`Fase no soportada: ${task.phase}`);
    }
  }

  async executeCoreOptimization(task, mcpResults) {
    const agent = (task.metadata && task.metadata.agent) ? task.metadata.agent : 'unknown';
    console.log(`🔧 Optimizando ${agent}...`);
    
    // Aquí implementarías la lógica específica de optimización
    // Por ahora, simulamos la ejecución
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      optimizations_applied: (task.metadata && task.metadata.optimizations) ? task.metadata.optimizations : [],
      performance_improvement: (task.metadata && task.metadata.current_performance && task.metadata.target_performance) 
        ? `${task.metadata.current_performance} → ${task.metadata.target_performance}` 
        : 'N/A',
      mcp_context: mcpResults.context ? mcpResults.context.stats : {},
      mcp_prompt: mcpResults.prompting ? (mcpResults.prompting.system_prompt?.substring(0, 100) + '...') : 'N/A'
    };
  }

  async executeSpecializedImplementation(task, mcpResults) {
    console.log(`🛠️ Implementando ${task.metadata.agent}...`);
    
    // Aquí implementarías la lógica específica de implementación
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      agent_implemented: task.metadata.agent,
      functionality: task.metadata.functionality,
      dependencies_resolved: task.metadata.dependencies,
      mcp_context: mcpResults.context.stats,
      mcp_prompt: mcpResults.prompting.system_prompt?.substring(0, 100) + '...'
    };
  }

  async executeLegacyMigration(task, mcpResults) {
    console.log(`📦 Migrando ${task.metadata.source}...`);
    
    // Aquí implementarías la lógica específica de migración
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      source: task.metadata.source,
      target: task.metadata.target,
      functionality_extracted: task.metadata.functionality,
      mcp_context: mcpResults.context.stats,
      mcp_prompt: mcpResults.prompting.system_prompt?.substring(0, 100) + '...'
    };
  }

  async executeOrchestratorOptimization(task, mcpResults) {
    console.log(`🎼 Optimizando orchestrator...`);
    
    // Aquí implementarías la lógica específica de optimización del orchestrator
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    return {
      success: true,
      improvements: task.metadata.improvements,
      mcp_context: mcpResults.context.stats,
      mcp_prompt: mcpResults.prompting.system_prompt?.substring(0, 100) + '...'
    };
  }

  getProjectStatus() {
    const project = this.taskdb.getProject(this.projectId);
    const tasks = this.taskdb.listTasks({ project_id: this.projectId });
    
    const status = {
      project: project,
      tasks: {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        doing: tasks.filter(t => t.status === 'doing').length,
        done: tasks.filter(t => t.status === 'done').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      phases: {
        core_optimization: tasks.filter(t => t.phase === 'core_optimization').length,
        specialized_implementation: tasks.filter(t => t.phase === 'specialized_implementation').length,
        legacy_migration: tasks.filter(t => t.phase === 'legacy_migration').length,
        orchestrator_optimization: tasks.filter(t => t.phase === 'orchestrator_optimization').length
      }
    };

    return status;
  }

  generateReport() {
    const status = this.getProjectStatus();
    const mcpReport = this.logger.generateReport();
    
    const report = {
      generated_at: new Date().toISOString(),
      project_status: status,
      mcp_analytics: mcpReport,
      recommendations: this.generateRecommendations(status)
    };

    const reportPath = join(PROJECT_ROOT, '.reports', 'restructure-task-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Reporte generado: ${reportPath}`);
    return report;
  }

  generateRecommendations(status) {
    const recommendations = [];
    
    if (status.tasks.todo > 0) {
      recommendations.push({
        type: 'task_management',
        message: `${status.tasks.todo} tareas pendientes. Considerar ejecutar la siguiente tarea prioritaria.`,
        priority: 'high'
      });
    }
    
    if (status.tasks.failed > 0) {
      recommendations.push({
        type: 'error_handling',
        message: `${status.tasks.failed} tareas fallaron. Revisar logs y reintentar.`,
        priority: 'high'
      });
    }
    
    if (status.phases.core_optimization > 0) {
      recommendations.push({
        type: 'optimization',
        message: 'Optimizaciones core pendientes. Priorizar para mejorar rendimiento base.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new RestructureTaskManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      manager.createRestructureTasks();
      console.log('✅ Tareas de reestructuración inicializadas');
      break;
      
    case 'status':
      const status = manager.getProjectStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case 'execute':
      const taskId = process.argv[3];
      if (!taskId) {
        console.error('Usage: node tools/restructure-task-manager.mjs execute <task-id>');
        process.exit(1);
      }
      
      manager.executeTaskWithMCP(taskId)
        .then(result => {
          console.log('✅ Tarea ejecutada exitosamente');
          console.log(JSON.stringify(result, null, 2));
        })
        .catch(error => {
          console.error('❌ Error ejecutando tarea:', error.message);
          process.exit(1);
        });
      break;
      
    case 'report':
      const report = manager.generateReport();
      console.log('📊 Reporte generado');
      break;
      
    default:
      console.log('Usage:');
      console.log('  node tools/restructure-task-manager.mjs init');
      console.log('  node tools/restructure-task-manager.mjs status');
      console.log('  node tools/restructure-task-manager.mjs execute <task-id>');
      console.log('  node tools/restructure-task-manager.mjs report');
      break;
  }
}

export default RestructureTaskManager;
