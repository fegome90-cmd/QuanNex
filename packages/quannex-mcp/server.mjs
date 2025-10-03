#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import tools
import { toolDetectRoute } from './tools/detect-route.mjs';
import { toolAdaptiveRun } from './tools/adaptive-run.mjs';
import { toolAutoFix } from './tools/autofix.mjs';

// Import telemetry
import {
  qnxRunStart,
  qnxRunEnd,
  qnxUse,
  qnxInstrument,
  qnxFlag,
  COMPONENTS,
  SOURCES,
  ACTIONS,
  EVENT_TYPES,
} from './telemetry.mjs';
import { checkQuanNexGate, checkMCPToolGate, runAllGates } from './gates.mjs';

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

  // Iniciar telemetría para este tool call
  const intent = name.replace('quannex.', '');
  const runId = qnxRunStart(SOURCES.CURSOR, intent);

  try {
    // Registrar uso del componente MCP
    const t0 = Date.now();
    qnxUse(runId, COMPONENTS.MCP_TOOL(name), ACTIONS.INVOKE, t0, true, {
      tool_name: name,
      args_hash: JSON.stringify(args).substring(0, 100),
    });

    // Ejecutar herramienta con instrumentación
    const result = await qnxInstrument(
      runId,
      COMPONENTS.MCP_TOOL(name),
      async () => {
        return await tool(args);
      },
      {
        tool_name: name,
        args_count: Object.keys(args || {}).length,
      }
    );

    // Verificar gate de herramienta MCP
    const gateResult = checkMCPToolGate(runId, name, args, true);

    // Finalizar run exitosamente
    qnxRunEnd(runId, true, {
      tool_name: name,
      gate_passed: gateResult.gate_passed,
      result_type: typeof result,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Registrar error
    qnxUse(runId, COMPONENTS.MCP_TOOL(name), ACTIONS.ERROR, Date.now(), false, {
      tool_name: name,
      error: error.message,
      error_type: error.constructor.name,
    });

    // Verificar gate de herramienta MCP con error
    const gateResult = checkMCPToolGate(runId, name, args, false, error.message);

    // Finalizar run con error
    qnxRunEnd(runId, false, {
      tool_name: name,
      error: error.message,
      gate_passed: gateResult.gate_passed,
      violations: gateResult.violations,
    });

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
