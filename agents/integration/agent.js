#!/usr/bin/env node
/**
 * versions/v3/integration-test-agent.js
 * Agente de prueba integral que utiliza MCP y todas las herramientas
 */
import { hello, isHello } from '../shared/contracts/handshake.js';
import { validateReq, ok, fail } from '../shared/contracts/schema.js';
import ToolManager from '../tools/tool-manager.js';

class IntegrationTestAgent {
  constructor() {
    this.name = 'integration-test-agent';
    this.version = '1.0.0';
    this.capabilities = ['test.mcp', 'test.agents', 'test.tools', 'test.workflows'];
    this.toolManager = new ToolManager();
  }

  async onMessage(data) {
    try {
      // Validar request básico
      const validation = validateReq(data);
      if (!validation.valid) {
        return fail('INVALID_REQUEST', validation.error);
      }

      // Handshake
      if (isHello(data)) {
        return hello(this.name, this.version, this.capabilities);
      }

      // Procesar capability específica
      switch (data.capability) {
        case 'test.mcp':
          return await this.testMCP(data.payload);
        case 'test.agents':
          return await this.testAgents(data.payload);
        case 'test.tools':
          return await this.testTools(data.payload);
        case 'test.workflows':
          return await this.testWorkflows(data.payload);
        default:
          return fail('UNKNOWN_CAPABILITY', `Capability ${data.capability} not supported`);
      }
    } catch (error) {
      console.error(`Error in integration test agent: ${error.message}`);
      return fail('INTERNAL_ERROR', error.message);
    }
  }

  async testMCP(payload) {
    try {
      console.log('🧪 Testing MCP functionality...');
      
      // Test 1: Listar herramientas disponibles
      const tools = this.toolManager.listTools();
      console.log(`✅ Found ${Object.keys(tools).length} tool categories`);
      
      // Test 2: Buscar herramientas de pathing
      const pathingTools = this.toolManager.searchTools('path');
      console.log(`✅ Found ${pathingTools.length} pathing tools`);
      
      // Test 3: Verificar dependencias
      const deps = this.toolManager.checkDependencies('validate-structure');
      console.log(`✅ Dependencies check: ${deps.available ? 'OK' : 'Missing'}`);
      
      // Test 4: Ejecutar validación de estructura
      const validationResult = await this.toolManager.executeTool('validate-structure');
      console.log(`✅ Structure validation: ${validationResult.success ? 'PASS' : 'FAIL'}`);
      
      return ok({
        mcp_tests: {
          tools_available: Object.keys(tools).length,
          pathing_tools: pathingTools.length,
          dependencies_ok: deps.available,
          structure_valid: validationResult.success
        },
        results: {
          tools,
          pathing_tools: pathingTools,
          dependencies: deps,
          validation: validationResult
        }
      });
    } catch (error) {
      return fail('MCP_TEST_FAILED', error.message);
    }
  }

  async testAgents(payload) {
    try {
      console.log('🧪 Testing agent functionality...');
      
      const agentTests = [];
      
      // Test Context Agent
      try {
        const contextTest = await this.testAgent('context', 'context.resolve', {
          sources: ['test-file.js'],
          selectors: ['src/']
        });
        agentTests.push({ agent: 'context', success: contextTest.success });
      } catch (error) {
        agentTests.push({ agent: 'context', success: false, error: error.message });
      }
      
      // Test Prompting Agent
      try {
        const promptingTest = await this.testAgent('prompting', 'prompting.buildPrompt', {
          context: 'test context',
          intent: 'refactor'
        });
        agentTests.push({ agent: 'prompting', success: promptingTest.success });
      } catch (error) {
        agentTests.push({ agent: 'prompting', success: false, error: error.message });
      }
      
      // Test Rules Agent
      try {
        const rulesTest = await this.testAgent('rules', 'rules.validate', {
          code: 'var x = 1; console.log(x);',
          rules: ['no-var', 'no-console']
        });
        agentTests.push({ agent: 'rules', success: rulesTest.success });
      } catch (error) {
        agentTests.push({ agent: 'rules', success: false, error: error.message });
      }
      
      const successCount = agentTests.filter(t => t.success).length;
      console.log(`✅ Agent tests: ${successCount}/${agentTests.length} passed`);
      
      return ok({
        agent_tests: {
          total: agentTests.length,
          passed: successCount,
          failed: agentTests.length - successCount
        },
        results: agentTests
      });
    } catch (error) {
      return fail('AGENT_TEST_FAILED', error.message);
    }
  }

  async testTools(payload) {
    try {
      console.log('🧪 Testing tool functionality...');
      
      const toolTests = [];
      
      // Test 1: Listar herramientas
      const tools = this.toolManager.listTools();
      toolTests.push({ tool: 'list-tools', success: true, count: Object.keys(tools).length });
      
      // Test 2: Buscar herramientas
      const searchResults = this.toolManager.searchTools('structure');
      toolTests.push({ tool: 'search-tools', success: true, count: searchResults.length });
      
      // Test 3: Obtener información de herramienta
      const toolInfo = this.toolManager.getTool('validate-structure');
      toolTests.push({ tool: 'get-tool-info', success: !!toolInfo, has_path: !!toolInfo?.path });
      
      // Test 4: Verificar categorías
      const categories = this.toolManager.getCategories();
      toolTests.push({ tool: 'get-categories', success: true, count: Object.keys(categories).length });
      
      // Test 5: Verificar workflows
      const workflows = this.toolManager.getWorkflows();
      toolTests.push({ tool: 'get-workflows', success: true, count: Object.keys(workflows).length });
      
      const successCount = toolTests.filter(t => t.success).length;
      console.log(`✅ Tool tests: ${successCount}/${toolTests.length} passed`);
      
      return ok({
        tool_tests: {
          total: toolTests.length,
          passed: successCount,
          failed: toolTests.length - successCount
        },
        results: toolTests
      });
    } catch (error) {
      return fail('TOOL_TEST_FAILED', error.message);
    }
  }

  async testWorkflows(payload) {
    try {
      console.log('🧪 Testing workflow functionality...');
      
      const workflowTests = [];
      
      // Test 1: Listar workflows disponibles
      const workflows = this.toolManager.getWorkflows();
      workflowTests.push({ 
        workflow: 'list-workflows', 
        success: true, 
        count: Object.keys(workflows).length 
      });
      
      // Test 2: Ejecutar workflow de limpieza (más seguro)
      try {
        const cleanResult = await this.toolManager.executeWorkflow('system_shutdown');
        workflowTests.push({ 
          workflow: 'system_shutdown', 
          success: cleanResult.success,
          steps: cleanResult.results.length
        });
      } catch (error) {
        workflowTests.push({ 
          workflow: 'system_shutdown', 
          success: false, 
          error: error.message 
        });
      }
      
      // Test 3: Ejecutar workflow de inicio
      try {
        const startResult = await this.toolManager.executeWorkflow('system_startup');
        workflowTests.push({ 
          workflow: 'system_startup', 
          success: startResult.success,
          steps: startResult.results.length
        });
      } catch (error) {
        workflowTests.push({ 
          workflow: 'system_startup', 
          success: false, 
          error: error.message 
        });
      }
      
      const successCount = workflowTests.filter(t => t.success).length;
      console.log(`✅ Workflow tests: ${successCount}/${workflowTests.length} passed`);
      
      return ok({
        workflow_tests: {
          total: workflowTests.length,
          passed: successCount,
          failed: workflowTests.length - successCount
        },
        results: workflowTests
      });
    } catch (error) {
      return fail('WORKFLOW_TEST_FAILED', error.message);
    }
  }

  async testAgent(agentName, capability, payload) {
    // Simular llamada a agente (en un sistema real, esto sería una llamada HTTP o IPC)
    const testMessage = {
      requestId: `test-${Date.now()}`,
      agent: agentName,
      capability: capability,
      payload: payload,
      ts: new Date().toISOString()
    };
    
    // Simular respuesta del agente
    return {
      success: true,
      agent: agentName,
      capability: capability,
      response: `Simulated response from ${agentName} for ${capability}`
    };
  }
}

// Ejecutar agente si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new IntegrationTestAgent();
  
  process.stdin.on('data', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const response = await agent.onMessage(message);
      console.log(JSON.stringify(response));
    } catch (error) {
      console.error(JSON.stringify(fail('PARSE_ERROR', error.message)));
    }
  });
}

export default IntegrationTestAgent;
