#!/usr/bin/env node
/**
 * AGENT SERVER WRAPPER V3 - ULTRA SIMPLIFICADO
 * Wrapper que simula respuestas sin llamar agentes reales
 */
import { readFileSync } from 'node:fs';

class MockAgentWrapper {
  async callAgent(agentName, request) {
    // Simular respuesta exitosa para health checks
    switch (agentName) {
      case 'context':
        return {
          success: true,
          data: { sources: ['test'], result: 'context resolved' }
        };
      case 'prompting':
        return {
          success: true,
          data: { prompt: 'test prompt generated' }
        };
      case 'rules':
        return {
          success: true,
          data: { validation: 'rules validated' }
        };
      default:
        return {
          success: true,
          data: { message: 'agent response' }
        };
    }
  }

  async handleRequest(input) {
    try {
      const request = JSON.parse(input);
      const { agent, capability, payload = {} } = request;
      
      const result = await this.callAgent(agent, request);
      
      return {
        response: {
          ok: true,
          agent: agent,
          capability: capability,
          result: result
        }
      };
    } catch (error) {
      return {
        response: {
          ok: false,
          error: error.message
        }
      };
    }
  }

  async start() {
    // Leer desde stdin
    let input = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    
    process.stdin.on('end', async () => {
      try {
        const result = await this.handleRequest(input.trim());
        console.log(JSON.stringify(result));
      } catch (error) {
        console.error(JSON.stringify({
          response: {
            ok: false,
            error: error.message
          }
        }));
      }
      process.exit(0);
    });
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MockAgentWrapper();
  server.start().catch(error => {
    console.error('❌ Failed to start agent server:', error);
    process.exit(1);
  });
}

export default MockAgentWrapper;
