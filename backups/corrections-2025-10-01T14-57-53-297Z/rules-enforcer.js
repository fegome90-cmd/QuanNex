#!/usr/bin/env node
/**
 * Rules Enforcer - Sistema de Integración Automática del Agente de Rules
 *
 * Este módulo asegura que el agente de rules se ejecute automáticamente
 * y obligue a la IA de Cursor a seguir las reglas del proyecto.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import RulesProtectionSystem from './rules-protection-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class RulesEnforcer {
  constructor() {
    this.rulesAgentPath = join(PROJECT_ROOT, 'agents/rules/agent.js');
    this.taskDbPath = join(PROJECT_ROOT, 'data/taskdb.json');
    this.enforcementLogPath = join(
      PROJECT_ROOT,
      '.reports/rules-enforcement.log'
    );
    this.policyRefs = [
      'docs/AGENTS.md',
      'docs/audits/2025-09-initial-gap.md',
      'docs/PLAN-REPARACION-GAPS-2025-10-01.md'
    ];

    // Inicializar sistema de protección
    this.protection = new RulesProtectionSystem();
  }

  /**
   * Ejecuta el agente de rules con políticas específicas
   */
  async enforceRules(context = {}) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // 1. Verificar permisos de ejecución con sistema de protección
      const permissionCheck = await this.protection.canExecute(context);
      if (!permissionCheck.allowed) {
        console.log(
          `⏸️  [RULES-ENFORCER] Ejecución bloqueada: ${permissionCheck.reason}`
        );
        return {
          blocked: true,
          reason: permissionCheck.reason,
          timestamp: new Date().toISOString()
        };
      }

      const payload = {
        policy_refs: this.policyRefs,
        tone: 'assertive',
        compliance_level: 'strict',
        domain: 'mcp-project',
        context: context
      };

      console.log('🔍 [RULES-ENFORCER] Ejecutando agente de rules...');

      const result = await this.runRulesAgent(payload);

      // 2. Aplicar límites de violaciones
      if (result.violations && result.violations.length > 0) {
        console.log(
          '⚠️  [RULES-ENFORCER] Violaciones detectadas:',
          result.violations.length
        );

        // Limitar número de violaciones procesadas
        const maxViolations = 5;
        const limitedViolations = result.violations.slice(0, maxViolations);

        if (result.violations.length > maxViolations) {
          console.log(
            `⚠️  [RULES-ENFORCER] Limitando violaciones a ${maxViolations} de ${result.violations.length}`
          );
        }

        await this.handleViolations(limitedViolations, context);
        await this.protection.recordActivity('violations_handled', {
          count: limitedViolations.length
        });
      }

      // 3. Aplicar límites de consejos
      if (result.advice && result.advice.length > 0) {
        console.log(
          '💡 [RULES-ENFORCER] Consejos aplicados:',
          result.advice.length
        );

        // Limitar número de consejos aplicados
        const maxAdvice = 3;
        const limitedAdvice = result.advice.slice(0, maxAdvice);

        if (result.advice.length > maxAdvice) {
          console.log(
            `⚠️  [RULES-ENFORCER] Limitando consejos a ${maxAdvice} de ${result.advice.length}`
          );
        }

        await this.applyAdvice(limitedAdvice, context);
        await this.protection.recordActivity('advice_applied', {
          count: limitedAdvice.length
        });
      }

      // 4. Registrar métricas de performance
      const executionTime = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = endMemory - startMemory;

      await this.protection.recordPerformanceMetrics(executionTime, memoryUsed);
      await this.protection.applyThrottling();

      await this.logEnforcement(result, context);
      return result;
    } catch (error) {
      console.error('❌ [RULES-ENFORCER] Error:', error.message);
      await this.logError(error, context);
      throw error;
    }
  }

  /**
   * Ejecuta el agente de rules
   */
  runRulesAgent(payload) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.rulesAgentPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (code !== 0) {
          reject(new Error(`Rules agent failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse rules agent output: ${parseError.message}`
            )
          );
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }

  /**
   * Maneja violaciones detectadas por el agente de rules
   */
  async handleViolations(violations, context) {
    for (const violation of violations) {
      if (violation.includes('missing:')) {
        const missingFile = violation.replace('missing:', '');
        console.log(
          `📝 [RULES-ENFORCER] Archivo faltante detectado: ${missingFile}`
        );
        await this.createMissingFile(missingFile);
      } else if (violation.includes('empty:')) {
        const emptyFile = violation.replace('empty:', '');
        console.log(
          `📝 [RULES-ENFORCER] Archivo vacío detectado: ${emptyFile}`
        );
        await this.populateEmptyFile(emptyFile);
      } else if (violation === 'no_valid_policies') {
        console.log(
          '📝 [RULES-ENFORCER] No hay políticas válidas, creando políticas básicas...'
        );
        await this.createBasicPolicies();
      }
    }
  }

  /**
   * Aplica consejos del agente de rules
   */
  async applyAdvice(advice, context) {
    for (const adviceItem of advice) {
      if (adviceItem.includes('tone:')) {
        const tone = adviceItem.replace('tone:', '');
        console.log(`🎯 [RULES-ENFORCER] Aplicando tono: ${tone}`);
        context.tone = tone;
      } else if (adviceItem.includes('domain:')) {
        const domain = adviceItem.replace('domain:', '');
        console.log(`🎯 [RULES-ENFORCER] Aplicando dominio: ${domain}`);
        context.domain = domain;
      } else if (adviceItem.includes('All policies must be enforced')) {
        console.log(
          '🔒 [RULES-ENFORCER] Aplicando modo estricto de cumplimiento'
        );
        context.strictMode = true;
      }
    }
  }

  /**
   * Verifica si las tareas están registradas en el task DB
   */
  async ensureTaskDbIntegration(context) {
    try {
      if (!existsSync(this.taskDbPath)) {
        console.log('📝 [RULES-ENFORCER] Task DB no existe, creando...');
        await this.createTaskDb();
      }

      const taskDb = JSON.parse(readFileSync(this.taskDbPath, 'utf8'));

      // Verificar si el proyecto de gaps existe
      const gapsProject = taskDb.projects.find(
        p => p.id === 'gaps-repair-2025-10-01'
      );
      if (!gapsProject) {
        console.log(
          '📝 [RULES-ENFORCER] Proyecto de gaps no encontrado, creando...'
        );
        await this.createGapsProject(taskDb);
      }

      // Verificar si las tareas críticas están registradas
      const criticalTasks = taskDb.tasks.filter(
        t => t.project_id === 'gaps-repair-2025-10-01' && t.task_order <= 5
      );

      if (criticalTasks.length < 5) {
        console.log(
          '📝 [RULES-ENFORCER] Tareas críticas faltantes, registrando...'
        );
        await this.registerCriticalTasks(taskDb);
      }

      console.log('✅ [RULES-ENFORCER] Task DB integración verificada');
    } catch (error) {
      console.error(
        '❌ [RULES-ENFORCER] Error en integración Task DB:',
        error.message
      );
      throw error;
    }
  }

  /**
   * Crea el Task DB si no existe
   */
  async createTaskDb() {
    const initialTaskDb = {
      version: '1.0.0',
      projects: [],
      tasks: []
    };
    writeFileSync(this.taskDbPath, JSON.stringify(initialTaskDb, null, 2));
  }

  /**
   * Crea el proyecto de gaps en el Task DB
   */
  async createGapsProject(taskDb) {
    // Verificar si ya existe para evitar duplicados
    const existingProject = taskDb.projects.find(
      p => p.id === 'gaps-repair-2025-10-01'
    );
    if (existingProject) {
      console.log(
        '📝 [RULES-ENFORCER] Proyecto de gaps ya existe, omitiendo creación'
      );
      return;
    }

    const gapsProject = {
      id: 'gaps-repair-2025-10-01',
      title: 'Reparación de Gaps Críticos - Auditoría 2025-09',
      description:
        'Plan de reparación de 26 gaps identificados en auditoría inicial del proyecto MCP',
      docs: [
        'docs/audits/2025-09-initial-gap.md',
        'docs/PLAN-REPARACION-GAPS-2025-10-01.md'
      ],
      features: [
        'Seguridad',
        'Testing',
        'Arquitectura',
        'Documentación',
        'Performance'
      ],
      data: {
        audit_file: 'docs/audits/2025-09-initial-gap.md',
        total_gaps: 26,
        critical_gaps: 8,
        major_gaps: 8,
        minor_gaps: 10,
        phases: 4
      },
      github_repo: 'local',
      pinned: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    taskDb.projects.push(gapsProject);
    writeFileSync(this.taskDbPath, JSON.stringify(taskDb, null, 2));

    // Registrar actividad
    await this.protection.recordActivity('project_creation', {
      projectId: gapsProject.id,
      projectTitle: gapsProject.title
    });
  }

  /**
   * Registra tareas críticas en el Task DB
   */
  async registerCriticalTasks(taskDb) {
    const criticalTasks = [
      {
        id: 'gap-001-sanitization',
        project_id: 'gaps-repair-2025-10-01',
        title: 'GAP-001: Implementar sanitización de entradas en agentes',
        description:
          'Implementar validación y sanitización estricta de todas las entradas de agentes',
        status: 'todo',
        task_order: 1,
        feature: 'Seguridad',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'gap-002-rate-limiting',
        project_id: 'gaps-repair-2025-10-01',
        title: 'GAP-002: Implementar rate limiting en endpoints',
        description:
          'Implementar mecanismos de rate limiting para prevenir ataques DoS',
        status: 'todo',
        task_order: 2,
        feature: 'Seguridad',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'gap-003-log-sanitization',
        project_id: 'gaps-repair-2025-10-01',
        title: 'GAP-003: Sanitizar logs expuestos con información sensible',
        description:
          'Implementar sanitización de logs para evitar exposición de información sensible',
        status: 'todo',
        task_order: 3,
        feature: 'Seguridad',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'gap-004-agent-auth',
        project_id: 'gaps-repair-2025-10-01',
        title: 'GAP-004: Implementar autenticación entre agentes',
        description:
          'Implementar sistema de autenticación JWT para comunicación entre agentes',
        status: 'todo',
        task_order: 4,
        feature: 'Seguridad',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'gap-005-secrets-management',
        project_id: 'gaps-repair-2025-10-01',
        title: 'GAP-005: Implementar gestión segura de secretos',
        description:
          'Migrar secretos a variables de entorno y gestor de secretos seguro',
        status: 'todo',
        task_order: 5,
        feature: 'Seguridad',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    let newTasksCount = 0;

    // Agregar solo las tareas que no existen
    for (const task of criticalTasks) {
      const existingTask = taskDb.tasks.find(t => t.id === task.id);
      if (!existingTask) {
        taskDb.tasks.push(task);
        newTasksCount++;
      }
    }

    if (newTasksCount > 0) {
      writeFileSync(this.taskDbPath, JSON.stringify(taskDb, null, 2));

      // Registrar actividad para cada tarea creada
      for (let i = 0; i < newTasksCount; i++) {
        await this.protection.recordActivity('task_creation', {
          projectId: 'gaps-repair-2025-10-01',
          taskType: 'critical_gap'
        });
      }

      console.log(
        `📝 [RULES-ENFORCER] ${newTasksCount} tareas críticas registradas`
      );
    } else {
      console.log('📝 [RULES-ENFORCER] Todas las tareas críticas ya existen');
    }
  }

  /**
   * Crea archivos faltantes
   */
  async createMissingFile(filePath) {
    const fullPath = join(PROJECT_ROOT, filePath);
    const dir = dirname(fullPath);

    // Verificar si ya existe para evitar duplicados
    if (existsSync(fullPath)) {
      console.log(`📝 [RULES-ENFORCER] Archivo ya existe: ${filePath}`);
      return;
    }

    if (!existsSync(dir)) {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(
      fullPath,
      `# ${filePath}\n\nArchivo creado automáticamente por Rules Enforcer.\n`
    );

    // Registrar actividad
    await this.protection.recordActivity('file_creation', {
      filePath: filePath,
      fullPath: fullPath
    });

    console.log(`📝 [RULES-ENFORCER] Archivo creado: ${filePath}`);
  }

  /**
   * Pobla archivos vacíos
   */
  async populateEmptyFile(filePath) {
    const fullPath = join(PROJECT_ROOT, filePath);
    const content = `# ${filePath}\n\nContenido inicial creado por Rules Enforcer.\n`;
    writeFileSync(fullPath, content);
  }

  /**
   * Crea políticas básicas
   */
  async createBasicPolicies() {
    const basicPolicyPath = join(PROJECT_ROOT, 'docs/BASIC-POLICIES.md');
    const content = `# Políticas Básicas del Proyecto MCP

## Reglas Fundamentales

1. **Registro de Tareas**: Todas las tareas deben registrarse en el Task DB
2. **Cumplimiento de Gaps**: Los gaps críticos deben ser priorizados
3. **Uso de Herramientas MCP**: Utilizar agentes disponibles para tareas específicas
4. **Documentación**: Mantener documentación actualizada

## Cumplimiento Estricto

- Modo de cumplimiento: STRICT
- Tono: ASSERTIVE
- Dominio: MCP-PROJECT
`;

    writeFileSync(basicPolicyPath, content);
    this.policyRefs.push('docs/BASIC-POLICIES.md');
  }

  /**
   * Registra la ejecución del enforcement
   */
  async logEnforcement(result, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context: context,
      result: result,
      violations: result.violations || [],
      advice: result.advice || []
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    writeFileSync(this.enforcementLogPath, logLine, { flag: 'a' });
  }

  /**
   * Registra errores
   */
  async logError(error, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'error',
      context: context,
      error: {
        message: error.message,
        stack: error.stack
      }
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    writeFileSync(this.enforcementLogPath, logLine, { flag: 'a' });
  }

  /**
   * Ejecuta enforcement completo
   */
  async runFullEnforcement(context = {}) {
    console.log('🚀 [RULES-ENFORCER] Iniciando enforcement completo...');

    // 1. Ejecutar agente de rules
    const rulesResult = await this.enforceRules(context);

    // 2. Verificar integración con Task DB
    await this.ensureTaskDbIntegration(context);

    // 3. Aplicar reglas específicas
    await this.applyProjectRules(context);

    console.log('✅ [RULES-ENFORCER] Enforcement completo finalizado');
    return rulesResult;
  }

  /**
   * Aplica reglas específicas del proyecto
   */
  async applyProjectRules(context) {
    console.log(
      '📋 [RULES-ENFORCER] Aplicando reglas específicas del proyecto...'
    );

    // Regla 1: Verificar que las tareas críticas estén registradas
    await this.ensureCriticalTasksRegistered();

    // Regla 2: Verificar que los agentes MCP estén disponibles
    await this.ensureMCPAgentsAvailable();

    // Regla 3: Verificar que la documentación esté actualizada
    await this.ensureDocumentationUpdated();

    console.log('✅ [RULES-ENFORCER] Reglas específicas aplicadas');
  }

  /**
   * Verifica que las tareas críticas estén registradas
   */
  async ensureCriticalTasksRegistered() {
    try {
      const taskDb = JSON.parse(readFileSync(this.taskDbPath, 'utf8'));
      const criticalTasks = taskDb.tasks.filter(
        t => t.project_id === 'gaps-repair-2025-10-01' && t.task_order <= 5
      );

      if (criticalTasks.length < 5) {
        console.log(
          '⚠️  [RULES-ENFORCER] Tareas críticas faltantes, registrando...'
        );
        await this.registerCriticalTasks(taskDb);
      }
    } catch (error) {
      console.error(
        '❌ [RULES-ENFORCER] Error verificando tareas críticas:',
        error.message
      );
    }
  }

  /**
   * Verifica que los agentes MCP estén disponibles
   */
  async ensureMCPAgentsAvailable() {
    const requiredAgents = [
      'agents/security/agent.js',
      'agents/tests/test-agent.js',
      'agents/docsync/docsync-agent.js',
      'orchestration/orchestrator.js'
    ];

    for (const agent of requiredAgents) {
      const agentPath = join(PROJECT_ROOT, agent);
      if (!existsSync(agentPath)) {
        console.log(`⚠️  [RULES-ENFORCER] Agente faltante: ${agent}`);
      } else {
        console.log(`✅ [RULES-ENFORCER] Agente disponible: ${agent}`);
      }
    }
  }

  /**
   * Verifica que la documentación esté actualizada
   */
  async ensureDocumentationUpdated() {
    const requiredDocs = [
      'docs/AGENTS.md',
      'docs/audits/2025-09-initial-gap.md',
      'docs/PLAN-REPARACION-GAPS-2025-10-01.md'
    ];

    for (const doc of requiredDocs) {
      const docPath = join(PROJECT_ROOT, doc);
      if (!existsSync(docPath)) {
        console.log(`⚠️  [RULES-ENFORCER] Documentación faltante: ${doc}`);
      } else {
        console.log(`✅ [RULES-ENFORCER] Documentación disponible: ${doc}`);
      }
    }
  }
}

// Exportar para uso como módulo
export default RulesEnforcer;

// Si se ejecuta directamente, ejecutar enforcement
if (import.meta.url === `file://${process.argv[1]}`) {
  const enforcer = new RulesEnforcer();
  enforcer
    .runFullEnforcement()
    .then(result => {
      console.log('🎯 [RULES-ENFORCER] Enforcement completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ [RULES-ENFORCER] Error en enforcement:', error.message);
      process.exit(1);
    });
}
