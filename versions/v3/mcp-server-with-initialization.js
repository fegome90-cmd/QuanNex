#!/usr/bin/env node
/**
 * MCP SERVER QUANNEX CON INICIALIZACIÓN AUTOMÁTICA
 * Versión que ejecuta automáticamente el contrato de inicialización
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

class QuanNexMCPServerWithInitialization {
  constructor() {
    this.server = new Server(
      {
        name: 'quannex-mcp-server-with-init',
        version: '1.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.initializationCompleted = false;
    this.setupHandlers();
  }

  // Función para ejecutar inicialización automática
  async executeAutoInitialization() {
    console.error('🚀 [MCP-SERVER] Iniciando inicialización automática de Cursor...');
    
    try {
      // Verificar si ya se completó la inicialización
      const statusFile = join(PROJECT_ROOT, '.cursor-initialization-status.json');
      if (existsSync(statusFile)) {
        const status = JSON.parse(readFileSync(statusFile, 'utf8'));
        if (status.completed) {
          console.error('✅ [MCP-SERVER] Inicialización ya completada en sesión anterior');
          this.initializationCompleted = true;
          return true;
        }
      }

      // Ejecutar script de inicialización automática
      const initScript = join(PROJECT_ROOT, 'scripts', 'auto-initialize-cursor.sh');
      if (!existsSync(initScript)) {
        console.error('❌ [MCP-SERVER] Script de inicialización no encontrado');
        return false;
      }

      console.error('📋 [MCP-SERVER] Ejecutando contrato de inicialización...');
      
      // Ejecutar inicialización
      const result = spawn('bash', [initScript, 'execute'], {
        cwd: PROJECT_ROOT,
        stdio: ['inherit', 'pipe', 'pipe']
      });

      return new Promise((resolve) => {
        let output = '';
        let errorOutput = '';

        result.stdout.on('data', (data) => {
          output += data.toString();
          console.error(data.toString());
        });

        result.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.error(data.toString());
        });

        result.on('close', (code) => {
          if (code === 0) {
            console.error('✅ [MCP-SERVER] Inicialización automática completada exitosamente');
            this.initializationCompleted = true;
            resolve(true);
          } else {
            console.error('❌ [MCP-SERVER] Inicialización automática falló');
            resolve(false);
          }
        });

        // Timeout de 5 minutos para la inicialización
        setTimeout(() => {
          result.kill();
          console.error('⏰ [MCP-SERVER] Timeout en inicialización automática');
          resolve(false);
        }, 300000);
      });

    } catch (error) {
      console.error('❌ [MCP-SERVER] Error en inicialización automática:', error.message);
      return false;
    }
  }

  setupHandlers() {
    // Handler para listar herramientas
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
                      action: { type: 'string' },
                      input: { type: 'object' },
                      depends_on: { type: 'array', items: { type: 'string' } }
                    }
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
            description: 'Check system health and agent status',
            inputSchema: {
              type: 'object',
              properties: {
                agent: { 
                  type: 'string', 
                  enum: ['context', 'prompting', 'rules', 'all'],
                  description: 'Agent to check (default: all)' 
                }
              }
            }
          },
          {
            name: 'auto_initialize_cursor',
            description: 'Execute automatic Cursor initialization contract',
            inputSchema: {
              type: 'object',
              properties: {
                force: { type: 'boolean', description: 'Force re-initialization even if already completed' }
              }
            }
          }
        ]
      };
    });

    // Handler para ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'auto_initialize_cursor':
            console.error('🚀 [MCP-SERVER] Ejecutando inicialización automática de Cursor...');
            const success = await this.executeAutoInitialization();
            return {
              content: [
                {
                  type: 'text',
                  text: success 
                    ? '✅ Inicialización automática completada. Cursor está ahora en caliente y listo para trabajar.'
                    : '❌ Inicialización automática falló. Por favor, lee manualmente MANUAL-COMPLETO-CURSOR.md y CONTEXTO-INGENIERO-SENIOR.md antes de continuar.'
                }
              ]
            };

          case 'create_workflow':
            return await this.handleOrchestratorCommand('create', args);
          
          case 'execute_workflow':
            return await this.handleOrchestratorCommand('execute', args);
          
          case 'get_workflow_status':
            return await this.handleOrchestratorCommand('status', args);
          
          case 'health_check':
            return await this.handleOrchestratorCommand('health', args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`❌ [MCP-SERVER] Error executing tool ${name}:`, error.message);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  // Handler para comandos del orquestador
  handleOrchestratorCommand(command, args) {
    return new Promise((resolve, reject) => {
      const orchestratorPath = join(PROJECT_ROOT, 'orchestration', 'orchestrator.js');
      
      if (!existsSync(orchestratorPath)) {
        reject(new Error('Orchestrator not found'));
        return;
      }

      let cmdArgs = [orchestratorPath, command];
      
      // Agregar argumentos específicos según el comando
      if (command === 'create' && args.name) {
        cmdArgs.push('--name', args.name);
        if (args.description) cmdArgs.push('--description', args.description);
        if (args.steps) cmdArgs.push('--steps', JSON.stringify(args.steps));
      } else if (command === 'execute' && args.workflow_id) {
        cmdArgs.push(args.workflow_id);
      } else if (command === 'status' && args.workflow_id) {
        cmdArgs.push(args.workflow_id);
      } else if (command === 'health' && args.agent) {
        cmdArgs.push('--agent', args.agent);
      }

      const child = spawn('node', cmdArgs, {
        cwd: PROJECT_ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            content: [
              {
                type: 'text',
                text: output || 'Command executed successfully'
              }
            ]
          });
        } else {
          reject(new Error(`Orchestrator command failed: ${errorOutput || 'Unknown error'}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn orchestrator: ${error.message}`));
      });

      // Timeout de 30 segundos
      setTimeout(() => {
        child.kill();
        reject(new Error('Orchestrator command timeout'));
      }, 30000);
    });
  }

  // Iniciar servidor
  async start() {
    console.error('🚀 [MCP-SERVER] Iniciando QuanNex MCP Server con inicialización automática...');
    
    // Ejecutar inicialización automática al iniciar
    await this.executeAutoInitialization();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('✅ [MCP-SERVER] QuanNex MCP Server iniciado y listo');
  }
}

// Iniciar servidor si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new QuanNexMCPServerWithInitialization();
  server.start().catch((error) => {
    console.error('❌ [MCP-SERVER] Error starting server:', error);
    process.exit(1);
  });
}

export default QuanNexMCPServerWithInitialization;
