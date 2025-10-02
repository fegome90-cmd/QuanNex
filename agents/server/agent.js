#!/usr/bin/env node
/**
 * versions/v3/agent-server.js
 * Servidor de agentes para la nueva estructura
 */
import ContextAgentV3 from './context-agent.js';
import PromptingAgentV3 from './prompting-agent.js';
import RulesAgentV3 from './rules-agent.js';
import IntegrationTestAgent from './integration-test-agent.js';
import { sanitizeObject, sanitizeLogObject } from '../shared/utils/security.js';

class AgentServer {
  constructor() {
    this.agents = {
      'context': new ContextAgentV3(),
      'prompting': new PromptingAgentV3(),
      'rules': new RulesAgentV3(),
      'integration-test': new IntegrationTestAgent()
    };
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
  }

  async handleRequest(rawData) {
    this.requestCount++;
    
    try {
      const data = sanitizeObject(rawData);
      const agentName = data.agent || 'context';
      const agent = this.agents[agentName];
      
      if (!agent) {
        this.errorCount++;
        return {
          success: false,
          error: `Agent ${agentName} not found`,
          available_agents: Object.keys(this.agents)
        };
      }

      const response = await agent.onMessage(data);
      return {
        success: true,
        response: response,
        agent: agentName,
        request_id: data.requestId
      };
    } catch (error) {
      this.errorCount++;
      return {
        success: false,
        error: error.message,
        request_id: rawData?.requestId
      };
    }
  }

  getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    return {
      status: 'healthy',
      uptime_ms: uptime,
      requests_total: this.requestCount,
      errors_total: this.errorCount,
      error_rate_percent: errorRate.toFixed(2),
      agents: Object.keys(this.agents),
      timestamp: new Date().toISOString()
    };
  }
}

// Crear servidor global
const server = new AgentServer();

// Manejar mensajes desde stdin
process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    const response = await server.handleRequest(message);
    console.log(JSON.stringify(sanitizeLogObject(response)));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: 'Parse error: ' + error.message
    }));
  }
});

// Manejar health check
process.on('SIGUSR1', () => {
  const health = server.getHealthStatus();
  console.error(JSON.stringify(health));
});

export default AgentServer;
