#!/usr/bin/env node
/**
 * MCP SERVER QUANNEX FUNCIONAL
 * Versión que funciona correctamente con el orquestador
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';

// Paths absolutos desde la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

class QuanNexMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'quannex-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_workflow',
            description: 'Create a new workflow with the specified configuration',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the workflow' },
                description: { type: 'string', description: 'Description of what this workflow does' },
                steps: {
                  type: 'array',
                  description: 'List of workflow steps',
                  items: {
                    type: 'object',
                    properties: {
                      step_id: { type: 'string' },
                      agent: { type: 'string', enum: ['context', 'prompting', 'rules'] },
                      input: { type: 'object' },
                      depends_on: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['step_id', 'agent', 'input']
                  }
                }
              },
              required: ['name', 'steps']
            }
          },
          {
            name: 'execute_workflow',
            description: 'Execute a workflow by its ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflow_id: { type: 'string', description: 'ID of the workflow to execute' }
              },
              required: ['workflow_id']
            }
          },
          {
            name: 'get_workflow_status',
            description: 'Get the status of a workflow',
            inputSchema: {
              type: 'object',
              properties: {
                workflow_id: { type: 'string', description: 'ID of the workflow to check' }
              },
              required: ['workflow_id']
            }
          },
          {
            name: 'health_check',
            description: 'Check the health of the QuanNex system',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_workflow':
            return await this.createWorkflow(args);
          
          case 'execute_workflow':
            return await this.executeWorkflow(args);
          
          case 'get_workflow_status':
            return await this.getWorkflowStatus(args);
          
          case 'health_check':
            return await this.healthCheck();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });
  }

  async createWorkflow(args) {
    const { name, description, steps } = args;
    
    // Crear archivo temporal con el workflow
    const workflowData = {
      name,
      description,
      steps
    };
    
    const tempFile = join(PROJECT_ROOT, 'tmp', `workflow-${Date.now()}.json`);
    const fs = await import('node:fs');
    const path = await import('node:path');
    
    // Crear directorio tmp si no existe
    const tmpDir = join(PROJECT_ROOT, 'tmp');
    if (!existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    fs.writeFileSync(tempFile, JSON.stringify(workflowData, null, 2));
    
    // Ejecutar orquestador para crear workflow
    const orchestratorPath = join(PROJECT_ROOT, 'orchestration', 'orchestrator.js');
    const result = await this.runCommand('node', [orchestratorPath, 'create', tempFile]);
    
    // Limpiar archivo temporal
    fs.unlinkSync(tempFile);
    
    return {
      content: [{
        type: 'text',
        text: `Workflow created: ${result}`
      }]
    };
  }

  async executeWorkflow(args) {
    const { workflow_id } = args;
    
    const orchestratorPath = join(PROJECT_ROOT, 'orchestration', 'orchestrator.js');
    const result = await this.runCommand('node', [orchestratorPath, 'execute', workflow_id]);
    
    return {
      content: [{
        type: 'text',
        text: `Workflow executed: ${result}`
      }]
    };
  }

  async getWorkflowStatus(args) {
    const { workflow_id } = args;
    
    const orchestratorPath = join(PROJECT_ROOT, 'orchestration', 'orchestrator.js');
    const result = await this.runCommand('node', [orchestratorPath, 'status', workflow_id]);
    
    return {
      content: [{
        type: 'text',
        text: `Workflow status: ${result}`
      }]
    };
  }

  async healthCheck() {
    const orchestratorPath = join(PROJECT_ROOT, 'orchestration', 'orchestrator.js');
    const result = await this.runCommand('node', [orchestratorPath, 'health']);
    
    return {
      content: [{
        type: 'text',
        text: `Health check: ${result}`
      }]
    };
  }

  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: PROJECT_ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
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
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('QuanNex MCP Server running on stdio');
  }
}

// Ejecutar servidor si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new QuanNexMCPServer();
  server.run().catch(console.error);
}

export default QuanNexMCPServer;
