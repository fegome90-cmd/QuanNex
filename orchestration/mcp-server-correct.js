#!/usr/bin/env node
/**
 * MCP SERVER CORRECTO - Integración con Orquestador Correcto
 *
 * Este servidor MCP usa el orquestador correcto y no versiones problemáticas.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// RUTA ABSOLUTA al orquestador correcto
const CORRECT_ORCHESTRATOR = resolve(__dirname, 'orchestrator.js');

// Verificar que el orquestador correcto existe
if (!existsSync(CORRECT_ORCHESTRATOR)) {
  console.error('❌ ERROR: Orquestador correcto no encontrado');
  console.error(`   Esperado: ${CORRECT_ORCHESTRATOR}`);
  process.exit(1);
}

console.error(`🔒 MCP SERVER: Usando orquestador correcto`);
console.error(`   Archivo: ${CORRECT_ORCHESTRATOR}`);

// Clase principal del servidor MCP
class QuanNexMCPServer {
  constructor() {
    this.orchestratorPath = CORRECT_ORCHESTRATOR;
  }

  // Ejecutar comando del orquestador
  async executeOrchestratorCommand(args) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.orchestratorPath, ...args], {
        cwd: resolve(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
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
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            resolve({ success: true, output: stdout });
          }
        } else {
          reject(new Error(`Orquestador falló (${code}): ${stderr}`));
        }
      });

      child.on('error', error => {
        reject(error);
      });
    });
  }

  // Health check de agentes
  async healthCheck() {
    try {
      const result = await this.executeOrchestratorCommand(['health']);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Crear workflow
  async createWorkflow(workflowData) {
    try {
      // Crear archivo temporal con el workflow
      const fs = await import('node:fs');
      const path = await import('node:path');
      const os = await import('node:os');

      const tempFile = path.join(os.tmpdir(), `workflow-${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(workflowData, null, 2));

      const result = await this.executeOrchestratorCommand(['create', tempFile]);

      // Limpiar archivo temporal
      fs.unlinkSync(tempFile);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Ejecutar workflow
  async executeWorkflow(workflowId) {
    try {
      const result = await this.executeOrchestratorCommand(['execute', workflowId]);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener estado de workflow
  async getWorkflowStatus(workflowId) {
    try {
      const result = await this.executeOrchestratorCommand(['status', workflowId]);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Listar workflows
  async listWorkflows() {
    try {
      const result = await this.executeOrchestratorCommand(['status']);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Crear instancia del servidor
const server = new QuanNexMCPServer();

// Exportar herramientas MCP
export const tools = {
  health_check: {
    description: 'Verificar salud de todos los agentes',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      return await server.healthCheck();
    },
  },

  create_workflow: {
    description: 'Crear un nuevo workflow',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del workflow' },
        description: { type: 'string', description: 'Descripción del workflow' },
        steps: {
          type: 'array',
          description: 'Pasos del workflow',
          items: {
            type: 'object',
            properties: {
              step_id: { type: 'string' },
              agent: { type: 'string' },
              input: { type: 'object' },
            },
            required: ['step_id', 'agent', 'input'],
          },
        },
      },
      required: ['name', 'steps'],
    },
    handler: async params => {
      return await server.createWorkflow(params);
    },
  },

  execute_workflow: {
    description: 'Ejecutar un workflow por su ID',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'ID del workflow a ejecutar' },
      },
      required: ['workflow_id'],
    },
    handler: async params => {
      return await server.executeWorkflow(params.workflow_id);
    },
  },

  get_workflow_status: {
    description: 'Obtener estado de un workflow',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'ID del workflow' },
      },
      required: ['workflow_id'],
    },
    handler: async params => {
      return await server.getWorkflowStatus(params.workflow_id);
    },
  },

  list_workflows: {
    description: 'Listar todos los workflows',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      return await server.listWorkflows();
    },
  },
};

// Información del servidor MCP
export const serverInfo = {
  name: 'quannex-orchestrator',
  version: '1.0.0',
  description: 'Servidor MCP para QuanNex Orchestrator (versión correcta)',
};

console.error('✅ MCP Server iniciado con orquestador correcto');
