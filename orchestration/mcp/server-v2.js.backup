#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

class QuanNexMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'quannex-mcp-server',
        version: '2.1.0'
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
    this.server.setRequestHandler(ListToolsRequestSchema, async() => {
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
                    },
                    required: ['step_id', 'agent', 'action']
                  }
                }
              },
              required: ['name', 'steps']
            }
          },
          {
            name: 'route_task',
            description: 'Resolve the best downstream agent using declarative router rules',
            inputSchema: {
              type: 'object',
              properties: {
                intent: { type: 'string', description: 'High level task intent (refactor, test, bugfix, lint, docstring, rag)' },
                confidence: { type: 'number', description: 'Confidence score provided by planner (0-1)' },
                artifacts: {
                  type: 'array',
                  description: 'Artifacts or file paths involved in the task, used for routing filters',
                  items: { type: 'string' }
                },
                thread_state_id: { type: 'string', description: 'Opaque identifier for observability correlation' },
                metadata: { type: 'object', description: 'Optional planner metadata or overrides' }
              },
              required: ['intent', 'confidence']
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
            name: 'list_workflows',
            description: 'List all workflows',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'load_workflow_template',
            description: 'Load a predefined workflow template',
            inputSchema: {
              type: 'object',
              properties: {
                template_name: {
                  type: 'string',
                  enum: ['prompt-generation', 'context-analysis'],
                  description: 'Name of the workflow template to load'
                }
              },
              required: ['template_name']
            }
          },
          {
            name: 'agent_health_check',
            description: 'Check the health status of all agents',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'call_agent_direct',
            description: 'Call an agent directly without workflow orchestration',
            inputSchema: {
              type: 'object',
              properties: {
                agent: { type: 'string', enum: ['context', 'prompting', 'rules'], description: 'Agent to call' },
                action: { type: 'string', description: 'Action to perform' },
                input: { type: 'object', description: 'Input data for the agent' }
              },
              required: ['agent', 'action', 'input']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async(request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_workflow':
            return await this.createWorkflow(args);
          case 'route_task':
            return await this.routeTask(args);
          case 'execute_workflow':
            return await this.executeWorkflow(args);
          case 'get_workflow_status':
            return await this.getWorkflowStatus(args);
          case 'list_workflows':
            return await this.listWorkflows();
          case 'load_workflow_template':
            return await this.loadWorkflowTemplate(args);
          case 'agent_health_check':
            return await this.agentHealthCheck();
          case 'call_agent_direct':
            return await this.callAgentDirect(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async createWorkflow(args) {
    // Simular creación de workflow
    return {
      content: [
        {
          type: 'text',
          text: `Workflow "${args.name}" created successfully with ${args.steps.length} steps`
        }
      ]
    };
  }

  async routeTask(args) {
    // Simular routing de tarea
    const agent = this.selectAgent(args.intent, args.confidence);
    return {
      content: [
        {
          type: 'text',
          text: `Task routed to agent: ${agent} (intent: ${args.intent}, confidence: ${args.confidence})`
        }
      ]
    };
  }

  async executeWorkflow(args) {
    // Simular ejecución de workflow
    return {
      content: [
        {
          type: 'text',
          text: `Workflow ${args.workflow_id} executed successfully`
        }
      ]
    };
  }

  async getWorkflowStatus(args) {
    // Simular estado de workflow
    return {
      content: [
        {
          type: 'text',
          text: `Workflow ${args.workflow_id} status: completed`
        }
      ]
    };
  }

  async listWorkflows() {
    // Simular lista de workflows
    return {
      content: [
        {
          type: 'text',
          text: 'Available workflows: workflow-1, workflow-2, workflow-3'
        }
      ]
    };
  }

  async loadWorkflowTemplate(args) {
    // Simular carga de template
    return {
      content: [
        {
          type: 'text',
          text: `Template ${args.template_name} loaded successfully`
        }
      ]
    };
  }

  async agentHealthCheck() {
    // Simular health check
    return {
      content: [
        {
          type: 'text',
          text: 'Agent health check: All agents healthy'
        }
      ]
    };
  }

  async callAgentDirect(args) {
    // Simular llamada directa a agente
    return {
      content: [
        {
          type: 'text',
          text: `Agent ${args.agent} executed action ${args.action} successfully`
        }
      ]
    };
  }

  selectAgent(intent, confidence) {
    // Lógica simple de selección de agente
    if (intent === 'refactor' || intent === 'bugfix') return 'context';
    if (intent === 'test' || intent === 'docstring') return 'rules';
    if (intent === 'lint' || intent === 'rag') return 'prompting';
    return 'context'; // default
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('QuanNex MCP Server v2.1.0 started');
  }
}

// Iniciar servidor
const server = new QuanNexMCPServer();
server.start().catch(console.error);
