#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import tools
import { toolDetectRoute } from './tools/detect-route.mjs';
import { toolAdaptiveRun } from './tools/adaptive-run.mjs';
import { toolAutoFix } from './tools/autofix.mjs';

const server = new Server(
  {
    name: 'quannex-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
const tools = new Map();
tools.set('quannex.detect_route', toolDetectRoute);
tools.set('quannex.adaptive_run', toolAdaptiveRun);
tools.set('quannex.autofix', toolAutoFix);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Array.from(tools.keys()).map(name => ({
      name,
      description: `QuanNex ${name.split('.')[1]} tool`,
      inputSchema: {
        type: 'object',
        properties: {
          actions: {
            type: 'array',
            description: 'Array of actions to perform (for autofix)',
          },
          dryRun: {
            type: 'boolean',
            description: 'Whether to perform dry run (for autofix)',
            default: true,
          },
          branch: {
            type: 'string',
            description: 'Branch name for autofix',
            default: 'autofix/quannex',
          },
        },
      },
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;
  const tool = tools.get(name);

  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }

  try {
    const result = await tool(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
