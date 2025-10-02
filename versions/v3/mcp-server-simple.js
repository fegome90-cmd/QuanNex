#!/usr/bin/env node
/**
 * MCP SERVER SIMPLE V3
 * Versión simplificada que no se cuelga
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

class SimpleMCPServerV3 {
  constructor() {
    this.server = new Server(
      {
        name: 'quannex-mcp-server-simple',
        version: '3.0.0'
      },
      new StdioServerTransport()
    );

    this.setupTools();
  }

  setupTools() {
    // Tool: create_workflow
    this.server.registerTool('create_workflow', {
      description: 'Crea un nuevo workflow en el orquestador.',
      inputSchema: CallToolRequestSchema,
      handler: this.handleOrchestratorCommand('create')
    });

    // Tool: execute_workflow
    this.server.registerTool('execute_workflow', {
      description: 'Ejecuta un workflow existente en el orquestador.',
      inputSchema: CallToolRequestSchema,
      handler: this.handleOrchestratorCommand('execute')
    });

    // Tool: get_workflow_status
    this.server.registerTool('get_workflow_status', {
      description: 'Obtiene el estado de un workflow.',
      inputSchema: CallToolRequestSchema,
      handler: this.handleOrchestratorCommand('status')
    });

    // Tool: health_check
    this.server.registerTool('health_check', {
      description: 'Realiza un chequeo de salud del orquestador.',
      inputSchema: CallToolRequestSchema,
      handler: this.handleOrchestratorCommand('health')
    });

    // Tool: list_tools
    this.server.registerTool('list_tools', {
      description: 'Lista las herramientas disponibles.',
      inputSchema: ListToolsRequestSchema,
      handler: async () => {
        return {
          tools: [
            { name: 'create_workflow', description: 'Crea un nuevo workflow.' },
            { name: 'execute_workflow', description: 'Ejecuta un workflow existente.' },
            { name: 'get_workflow_status', description: 'Obtiene el estado de un workflow.' },
            { name: 'health_check', description: 'Realiza un chequeo de salud.' }
          ]
        };
      }
    });
  }

  handleOrchestratorCommand(command) {
    return async (input) => {
      return new Promise((resolve, reject) => {
        const orchestratorPath = join(PROJECT_ROOT, 'orchestration', 'orchestrator.js');
        
        const args = [orchestratorPath, command];
        if (input.input && typeof input.input === 'string') {
          args.push(input.input);
        } else if (input.input && typeof input.input === 'object') {
          args.push(JSON.stringify(input.input));
        }

        const child = spawn('node', args, {
          cwd: PROJECT_ROOT,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000 // 10 segundos timeout
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
              const jsonOutput = JSON.parse(stdout);
              resolve(jsonOutput);
            } catch (e) {
              resolve({ output: stdout.trim() });
            }
          } else {
            reject(new Error(`Command "${command}" failed with code ${code}. Stderr: ${stderr.trim()}`));
          }
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to start orchestrator process: ${err.message}`));
        });

        // Timeout de seguridad
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGTERM');
            reject(new Error(`Command "${command}" timed out after 10 seconds`));
          }
        }, 10000);
      });
    };
  }

  start() {
    this.server.start();
    console.log('🚀 Simple MCP QuanNex Server V3 started');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SimpleMCPServerV3();
  server.start();
}
