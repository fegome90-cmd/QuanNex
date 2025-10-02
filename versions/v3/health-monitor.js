#!/usr/bin/env node
/**
 * versions/v3/health-monitor.js
 * Sistema de monitoreo simplificado para agentes
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

class HealthMonitor {
  constructor() {
    this.agents = {};
    this.checkInterval = 30000; // 30 segundos
    this.maxRestarts = 3;
    this.isRunning = false;
  }

  async start() {
    console.log('🏥 Iniciando Health Monitor...');
    this.isRunning = true;
    
    // Iniciar agentes
    await this.startAgents();
    
    // Iniciar monitoreo
    this.startMonitoring();
    
    console.log('✅ Health Monitor iniciado');
  }

  async startAgents() {
    const agents = ['context', 'prompting', 'rules'];
    
    for (const agentName of agents) {
      try {
        await this.startAgent(agentName);
      } catch (error) {
        console.error(`❌ Error iniciando agente ${agentName}:`, error.message);
      }
    }
  }

  async startAgent(agentName) {
    const agentPath = join(__dirname, 'agent-server.js');
    
    const agent = spawn('node', [agentPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT
    });

    agent.on('error', (error) => {
      console.error(`❌ Error en agente ${agentName}:`, error.message);
      this.handleAgentError(agentName, error);
    });

    agent.on('exit', (code) => {
      console.log(`🔄 Agente ${agentName} terminó con código ${code}`);
      this.handleAgentExit(agentName, code);
    });

    // Configurar agente
    this.agents[agentName] = {
      process: agent,
      restarts: 0,
      lastHealthCheck: Date.now(),
      status: 'starting'
    };

    console.log(`✅ Agente ${agentName} iniciado`);
  }

  startMonitoring() {
    setInterval(() => {
      this.checkAgentHealth();
    }, this.checkInterval);
  }

  async checkAgentHealth() {
    for (const [agentName, agentInfo] of Object.entries(this.agents)) {
      try {
        await this.healthCheck(agentName, agentInfo);
      } catch (error) {
        console.error(`❌ Error en health check de ${agentName}:`, error.message);
      }
    }
  }

  async healthCheck(agentName, agentInfo) {
    if (!agentInfo.process || agentInfo.process.killed) {
      console.log(`🔄 Reiniciando agente ${agentName} (proceso terminado)`);
      await this.restartAgent(agentName);
      return;
    }

    // Enviar health check
    const healthCheckMessage = {
      requestId: `health-${Date.now()}`,
      agent: agentName,
      capability: 'health.check',
      payload: {},
      ts: new Date().toISOString()
    };

    try {
      agentInfo.process.stdin.write(JSON.stringify(healthCheckMessage) + '\n');
      agentInfo.lastHealthCheck = Date.now();
      agentInfo.status = 'healthy';
    } catch (error) {
      console.error(`❌ Error enviando health check a ${agentName}:`, error.message);
      agentInfo.status = 'unhealthy';
    }
  }

  async restartAgent(agentName) {
    const agentInfo = this.agents[agentName];
    
    if (agentInfo.restarts >= this.maxRestarts) {
      console.error(`🚨 Agente ${agentName} alcanzó máximo de reinicios (${this.maxRestarts})`);
      agentInfo.status = 'failed';
      return;
    }

    // Terminar proceso actual
    if (agentInfo.process && !agentInfo.process.killed) {
      agentInfo.process.kill();
    }

    // Reiniciar
    agentInfo.restarts++;
    console.log(`🔄 Reiniciando agente ${agentName} (intento ${agentInfo.restarts}/${this.maxRestarts})`);
    
    await this.startAgent(agentName);
  }

  handleAgentError(agentName, error) {
    const agentInfo = this.agents[agentName];
    if (agentInfo) {
      agentInfo.status = 'error';
      console.error(`❌ Error en agente ${agentName}:`, error.message);
    }
  }

  handleAgentExit(agentName, code) {
    const agentInfo = this.agents[agentName];
    if (agentInfo) {
      agentInfo.status = 'exited';
      console.log(`🔄 Agente ${agentName} terminó con código ${code}`);
      
      if (code !== 0) {
        this.restartAgent(agentName);
      }
    }
  }

  getStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      agents: {},
      summary: {
        total: Object.keys(this.agents).length,
        healthy: 0,
        unhealthy: 0,
        failed: 0
      }
    };

    for (const [agentName, agentInfo] of Object.entries(this.agents)) {
      status.agents[agentName] = {
        status: agentInfo.status,
        restarts: agentInfo.restarts,
        last_health_check: new Date(agentInfo.lastHealthCheck).toISOString(),
        uptime: agentInfo.process ? 'running' : 'stopped'
      };

      if (agentInfo.status === 'healthy') {
        status.summary.healthy++;
      } else if (agentInfo.status === 'failed') {
        status.summary.failed++;
      } else {
        status.summary.unhealthy++;
      }
    }

    return status;
  }

  stop() {
    console.log('🛑 Deteniendo Health Monitor...');
    this.isRunning = false;
    
    for (const [agentName, agentInfo] of Object.entries(this.agents)) {
      if (agentInfo.process && !agentInfo.process.killed) {
        agentInfo.process.kill();
      }
    }
    
    console.log('✅ Health Monitor detenido');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new HealthMonitor();
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    monitor.stop();
    process.exit(0);
  });
  
  // Iniciar monitor
  monitor.start();
}

export default HealthMonitor;
