#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import WorkflowOrchestrator from '../orchestrator.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

class OrchestrationMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'orchestration-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.orchestrator = new WorkflowOrchestrator();
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_workflow',
            description:
              'Create a new workflow with the specified configuration',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the workflow'
                },
                description: {
                  type: 'string',
                  description: 'Description of what this workflow does'
                },
                steps: {
                  type: 'array',
                  description: 'List of workflow steps',
                  items: {
                    type: 'object',
                    properties: {
                      step_id: { type: 'string' },
                      agent: {
                        type: 'string',
                        enum: ['context', 'prompting', 'rules']
                      },
                      action: { type: 'string' },
                      input: { type: 'object' },
                      depends_on: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['step_id', 'agent', 'action']
                  }
                },
                context: {
                  type: 'object',
                  description: 'Shared context for the workflow'
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
                workflow_id: {
                  type: 'string',
                  description: 'ID of the workflow to execute'
                }
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
                workflow_id: {
                  type: 'string',
                  description: 'ID of the workflow to check'
                }
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
            description:
              'Call an agent directly without workflow orchestration',
            inputSchema: {
              type: 'object',
              properties: {
                agent: {
                  type: 'string',
                  enum: ['context', 'prompting', 'rules'],
                  description: 'Agent to call'
                },
                action: {
                  type: 'string',
                  description: 'Action to perform'
                },
                input: {
                  type: 'object',
                  description: 'Input data for the agent'
                }
              },
              required: ['agent', 'action', 'input']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_workflow':
            return await this.handleCreateWorkflow(args);

          case 'execute_workflow':
            return await this.handleExecuteWorkflow(args);

          case 'get_workflow_status':
            return await this.handleGetWorkflowStatus(args);

          case 'list_workflows':
            return await this.handleListWorkflows(args);

          case 'load_workflow_template':
            return await this.handleLoadWorkflowTemplate(args);

          case 'agent_health_check':
            return await this.handleAgentHealthCheck(args);

          case 'call_agent_direct':
            return await this.handleCallAgentDirect(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async handleCreateWorkflow(args) {
    const workflow = await this.orchestrator.createWorkflow(args);
    return {
      content: [
        {
          type: 'text',
          text: `Workflow created successfully:\n\`\`\`json\n${JSON.stringify(workflow, null, 2)}\n\`\`\``
        }
      ]
    };
  }

  async handleExecuteWorkflow(args) {
    const result = await this.orchestrator.executeWorkflow(args.workflow_id);
    return {
      content: [
        {
          type: 'text',
          text: `Workflow executed successfully:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
        }
      ]
    };
  }

  async handleGetWorkflowStatus(args) {
    const workflow = this.orchestrator.getWorkflow(args.workflow_id);
    if (!workflow) {
      return {
        content: [
          {
            type: 'text',
            text: `Workflow ${args.workflow_id} not found`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Workflow Status:\n\`\`\`json\n${JSON.stringify(workflow, null, 2)}\n\`\`\``
        }
      ]
    };
  }

  async handleListWorkflows() {
    const workflows = this.orchestrator.listWorkflows();
    return {
      content: [
        {
          type: 'text',
          text: `Active Workflows:\n\`\`\`json\n${JSON.stringify(workflows, null, 2)}\n\`\`\``
        }
      ]
    };
  }

  async handleLoadWorkflowTemplate(args) {
    const templatePath = join(
      PROJECT_ROOT,
      'orchestration',
      'workflows',
      `${args.template_name}.json`
    );

    if (!existsSync(templatePath)) {
      throw new Error(`Template ${args.template_name} not found`);
    }

    const template = JSON.parse(readFileSync(templatePath, 'utf8'));
    const workflow = await this.orchestrator.createWorkflow(template);

    return {
      content: [
        {
          type: 'text',
          text: `Workflow template loaded and created:\n\`\`\`json\n${JSON.stringify(workflow, null, 2)}\n\`\`\``
        }
      ]
    };
  }

  async handleAgentHealthCheck() {
    const health = await this.orchestrator.healthCheck();
    return {
      content: [
        {
          type: 'text',
          text: `Agent Health Status:\n\`\`\`json\n${JSON.stringify(health, null, 2)}\n\`\`\``
        }
      ]
    };
  }

  async handleCallAgentDirect(args) {
    const result = await this.orchestrator.callAgent(
      args.agent,
      args.action,
      args.input
    );
    return {
      content: [
        {
          type: 'text',
          text: `Agent ${args.agent} response:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Orchestration MCP server running on stdio');
  }
}

const server = new OrchestrationMCPServer();
server.run().catch(console.error);
