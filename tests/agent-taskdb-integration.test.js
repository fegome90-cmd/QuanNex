/**
 * Agent TaskDB Integration Tests
 * PR-L: Integración agentes ↔ TaskDB (TaskKernel)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import AgentTaskDBIntegration from '../tools/agent-taskdb-integration.mjs';
import AgentTaskDBContracts from '../tools/agent-taskdb-contracts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const TEST_DATA_DIR = join(PROJECT_ROOT, 'test-data-integration');

describe('Agent TaskDB Integration', () => {
  let integration;

  beforeEach(() => {
    // Crear directorio de test
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
    
    // Inicializar integración con directorio de test
    integration = new AgentTaskDBIntegration({
      taskdb: {
        dataDir: TEST_DATA_DIR,
        dbFile: 'test-taskdb.json'
      }
    });
  });

  afterEach(() => {
    // Limpiar datos de test
    try {
      if (existsSync(TEST_DATA_DIR)) {
        const files = require('fs').readdirSync(TEST_DATA_DIR);
        files.forEach(file => {
          unlinkSync(join(TEST_DATA_DIR, file));
        });
      }
    } catch (error) {
      // Ignorar errores de limpieza
    }
  });

  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      assert.ok(integration);
      assert.ok(integration.config);
      assert.ok(integration.taskdb);
      assert.ok(integration.projects);
      assert.ok(integration.tasks);
    });

    test('debe crear proyectos para agentes', () => {
      assert.strictEqual(integration.projects.size, 3);
      assert.ok(integration.projects.has('context'));
      assert.ok(integration.projects.has('prompting'));
      assert.ok(integration.projects.has('rules'));
    });
  });

  describe('Validación de Contratos', () => {
    let contracts;

    beforeEach(() => {
      contracts = new AgentTaskDBContracts();
    });

    test('debe validar input de agente context', () => {
      const validInput = {
        action: 'process',
        data: {
          text: 'Texto de prueba',
          maxTokens: 100
        }
      };

      assert.doesNotThrow(() => {
        contracts.validateInput('context', validInput);
      });
    });

    test('debe rechazar input inválido de agente context', () => {
      const invalidInput = {
        action: 'invalid_action',
        data: {
          text: ''
        }
      };

      assert.throws(() => {
        contracts.validateInput('context', invalidInput);
      }, /Input inválido para agente context/);
    });

    test('debe validar output de agente context', () => {
      const validOutput = {
        success: true,
        timestamp: new Date().toISOString(),
        result: {
          processed_text: 'Texto procesado',
          tokens_used: 50,
          confidence: 0.9
        }
      };

      assert.doesNotThrow(() => {
        contracts.validateOutput('context', validOutput);
      });
    });

    test('debe rechazar output inválido de agente context', () => {
      const invalidOutput = {
        success: 'true', // Debe ser boolean
        timestamp: 'invalid_date',
        result: {
          processed_text: 'Texto procesado'
          // Faltan campos requeridos
        }
      };

      assert.throws(() => {
        contracts.validateOutput('context', invalidOutput);
      }, /Output inválido para agente context/);
    });

    test('debe generar ejemplos de input/output', () => {
      const inputExample = contracts.generateInputExample('context');
      const outputExample = contracts.generateOutputExample('context');

      assert.ok(inputExample.action);
      assert.ok(inputExample.data);
      assert.ok(outputExample.success);
      assert.ok(outputExample.timestamp);
      assert.ok(outputExample.result);
    });
  });

  describe('Gestión de Tareas', () => {
    test('debe crear tarea para agente', async () => {
      const input = {
        action: 'process',
        data: { text: 'Texto de prueba' }
      };

      const task = await integration.createAgentTask('context', input);
      
      assert.ok(task.id);
      assert.strictEqual(task.title, 'Tarea context - process');
      assert.strictEqual(task.status, 'doing');
      assert.strictEqual(task.assignee, 'context');
      assert.ok(task.data);
      assert.strictEqual(task.data.agent, 'context');
    });

    test('debe actualizar tarea de agente', async () => {
      const input = {
        action: 'process',
        data: { text: 'Texto de prueba' }
      };

      const task = await integration.createAgentTask('context', input);
      const updated = await integration.updateAgentTask(task.id, {
        status: 'done',
        data: {
          ...task.data,
          result: { success: true }
        }
      });

      assert.strictEqual(updated.status, 'done');
      assert.ok(updated.data.result);
    });

    test('debe obtener tareas por agente', async () => {
      const input1 = { action: 'process', data: { text: 'Texto 1' } };
      const input2 = { action: 'process', data: { text: 'Texto 2' } };

      await integration.createAgentTask('context', input1);
      await integration.createAgentTask('prompting', input2);

      const contextTasks = integration.getTasksByAgent('context');
      const promptingTasks = integration.getTasksByAgent('prompting');

      assert.strictEqual(contextTasks.length, 1);
      assert.strictEqual(promptingTasks.length, 1);
      assert.strictEqual(contextTasks[0].agent, 'context');
      assert.strictEqual(promptingTasks[0].agent, 'prompting');
    });

    test('debe obtener tareas por estado', async () => {
      const input = { action: 'process', data: { text: 'Texto de prueba' } };
      const task = await integration.createAgentTask('context', input);

      const doingTasks = integration.getTasksByStatus('doing');
      const doneTasks = integration.getTasksByStatus('done');

      assert.strictEqual(doingTasks.length, 1);
      assert.strictEqual(doneTasks.length, 0);
      assert.strictEqual(doingTasks[0].id, task.id);
    });
  });

  describe('Estadísticas de Integración', () => {
    test('debe generar estadísticas correctas', async () => {
      const input = { action: 'process', data: { text: 'Texto de prueba' } };
      await integration.createAgentTask('context', input);
      await integration.createAgentTask('prompting', input);

      const stats = integration.getIntegrationStats();

      assert.strictEqual(stats.total_projects, 3);
      assert.strictEqual(stats.total_tasks, 2);
      assert.strictEqual(stats.tasks_by_agent.context, 1);
      assert.strictEqual(stats.tasks_by_agent.prompting, 1);
      assert.strictEqual(stats.tasks_by_agent.rules, 0);
      assert.strictEqual(stats.tasks_by_status.doing, 2);
    });

    test('debe incluir métricas de rendimiento', async () => {
      const input = { action: 'process', data: { text: 'Texto de prueba' } };
      const task = await integration.createAgentTask('context', input);
      
      await integration.updateAgentTask(task.id, {
        status: 'done',
        data: {
          ...task.data,
          result: {
            success: true,
            performance: {
              duration: 100,
              cpu_usage: 50,
              memory_usage: 1024
            }
          }
        }
      });

      const stats = integration.getIntegrationStats();
      
      assert.ok(stats.performance_metrics);
      assert.strictEqual(stats.performance_metrics.avg_duration, 100);
      assert.strictEqual(stats.performance_metrics.min_duration, 100);
      assert.strictEqual(stats.performance_metrics.max_duration, 100);
    });
  });

  describe('Limpieza de Tareas', () => {
    test('debe limpiar tareas completadas', async () => {
      const input = { action: 'process', data: { text: 'Texto de prueba' } };
      const task1 = await integration.createAgentTask('context', input);
      const task2 = await integration.createAgentTask('prompting', input);

      // Marcar una tarea como completada
      await integration.updateAgentTask(task1.id, { status: 'done' });

      const cleaned = await integration.cleanupCompletedTasks();
      
      assert.strictEqual(cleaned, 1);
      assert.strictEqual(integration.tasks.size, 1);
    });
  });

  describe('Exportación de Datos', () => {
    test('debe exportar datos de integración', async () => {
      const input = { action: 'process', data: { text: 'Texto de prueba' } };
      await integration.createAgentTask('context', input);

      const exportFile = integration.exportIntegrationData();
      
      assert.ok(existsSync(exportFile));
      
      const data = JSON.parse(readFileSync(exportFile, 'utf8'));
      assert.ok(data.timestamp);
      assert.ok(data.version);
      assert.ok(data.projects);
      assert.ok(data.tasks);
      assert.ok(data.stats);
    });
  });

  describe('Validación de Input/Output', () => {
    test('debe validar input según contrato', () => {
      const validInput = {
        action: 'process',
        data: { text: 'Texto de prueba' }
      };

      assert.doesNotThrow(() => {
        integration.validateInput(validInput);
      });
    });

    test('debe rechazar input inválido', () => {
      const invalidInput = {
        action: 'invalid_action',
        data: 'invalid_data'
      };

      assert.throws(() => {
        integration.validateInput(invalidInput);
      }, /Campo requerido faltante/);
    });

    test('debe validar output según contrato', () => {
      const validOutput = {
        success: true,
        timestamp: new Date().toISOString(),
        result: { processed_text: 'Texto procesado' }
      };

      assert.doesNotThrow(() => {
        integration.validateOutput(validOutput);
      });
    });

    test('debe rechazar output inválido', () => {
      const invalidOutput = {
        success: 'true', // Debe ser boolean
        timestamp: 'invalid_date'
        // Faltan campos requeridos
      };

      assert.throws(() => {
        integration.validateOutput(invalidOutput);
      }, /Campo requerido faltante en output/);
    });
  });

  describe('Manejo de Errores', () => {
    test('debe manejar errores de agente inexistente', async () => {
      const input = { action: 'process', data: { text: 'Texto de prueba' } };

      await assert.rejects(async () => {
        await integration.processAgentInput('nonexistent', input);
      }, /Proyecto no encontrado para agente/);
    });

    test('debe manejar errores de validación', async () => {
      const invalidInput = {
        action: 'invalid_action',
        data: 'invalid_data'
      };

      await assert.rejects(async () => {
        await integration.processAgentInput('context', invalidInput);
      }, /Input inválido/);
    });
  });
});

describe('Agent TaskDB Contracts', () => {
  let contracts;

  beforeEach(() => {
    contracts = new AgentTaskDBContracts();
  });

  describe('Validación de Esquemas', () => {
    test('debe validar esquema de string', () => {
      const validation = contracts.validateField('test', {
        type: 'string',
        minLength: 1,
        maxLength: 10
      }, 'test_field');

      assert.strictEqual(validation.valid, true);
    });

    test('debe rechazar string inválido', () => {
      const validation = contracts.validateField('', {
        type: 'string',
        minLength: 1
      }, 'test_field');

      assert.strictEqual(validation.valid, false);
      assert.ok(validation.errors.length > 0);
    });

    test('debe validar esquema de number', () => {
      const validation = contracts.validateField(5, {
        type: 'number',
        minimum: 1,
        maximum: 10
      }, 'test_field');

      assert.strictEqual(validation.valid, true);
    });

    test('debe rechazar number inválido', () => {
      const validation = contracts.validateField(15, {
        type: 'number',
        maximum: 10
      }, 'test_field');

      assert.strictEqual(validation.valid, false);
      assert.ok(validation.errors.length > 0);
    });

    test('debe validar esquema de array', () => {
      const validation = contracts.validateField(['item1', 'item2'], {
        type: 'array',
        items: { type: 'string' }
      }, 'test_field');

      assert.strictEqual(validation.valid, true);
    });

    test('debe rechazar array inválido', () => {
      const validation = contracts.validateField('not_array', {
        type: 'array'
      }, 'test_field');

      assert.strictEqual(validation.valid, false);
      assert.ok(validation.errors.length > 0);
    });
  });

  describe('Generación de Ejemplos', () => {
    test('debe generar ejemplo de input para context', () => {
      const example = contracts.generateInputExample('context');
      
      assert.ok(example.action);
      assert.ok(example.data);
      assert.ok(example.data.text);
      assert.ok(example.data.maxTokens);
    });

    test('debe generar ejemplo de output para context', () => {
      const example = contracts.generateOutputExample('context');
      
      assert.strictEqual(example.success, true);
      assert.ok(example.timestamp);
      assert.ok(example.result);
      assert.ok(example.result.processed_text);
      assert.ok(example.result.tokens_used);
    });

    test('debe generar ejemplo de input para prompting', () => {
      const example = contracts.generateInputExample('prompting');
      
      assert.ok(example.action);
      assert.ok(example.data);
      assert.ok(example.data.prompt);
      assert.ok(example.data.context);
    });

    test('debe generar ejemplo de output para prompting', () => {
      const example = contracts.generateOutputExample('prompting');
      
      assert.strictEqual(example.success, true);
      assert.ok(example.timestamp);
      assert.ok(example.result);
      assert.ok(example.result.generated_prompt);
      assert.ok(example.result.quality_score);
    });
  });

  describe('Listado de Agentes', () => {
    test('debe listar todos los agentes', () => {
      const agents = contracts.listAgents();
      
      assert.ok(agents.includes('context'));
      assert.ok(agents.includes('prompting'));
      assert.ok(agents.includes('rules'));
      assert.strictEqual(agents.length, 3);
    });
  });

  describe('Generación de Documentación', () => {
    test('debe generar documentación completa', () => {
      const docs = contracts.generateDocumentation();
      
      assert.ok(docs.timestamp);
      assert.ok(docs.version);
      assert.ok(docs.agents);
      assert.ok(docs.agents.context);
      assert.ok(docs.agents.prompting);
      assert.ok(docs.agents.rules);
    });

    test('debe incluir ejemplos en documentación', () => {
      const docs = contracts.generateDocumentation();
      
      assert.ok(docs.agents.context.input.example);
      assert.ok(docs.agents.context.output.example);
      assert.ok(docs.agents.prompting.input.example);
      assert.ok(docs.agents.prompting.output.example);
    });
  });
});
