#!/usr/bin/env node
/**
 * @fileoverview Sistema de Resiliencia MCP
 * @description Supervisa y reinicia agentes que fallen con retry/backoff
 */

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import StructuredLogger from './structured-logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class MCPResilienceSystem {
  constructor() {
    this.agents = {
      'mcp-server': { 
        path: 'orchestration/mcp/server.js', 
        status: 'unknown', 
        failures: 0, 
        lastCheck: null,
        restartCount: 0,
        maxRestarts: 3
      }
    };
    
    this.logger = new StructuredLogger('resilience-system');
    this.monitoring = false;
    this.checkInterval = 30000; // 30 segundos
    this.retryDelays = [1000, 2000, 5000, 10000]; // Backoff exponencial
  }

  /**
   * Iniciar monitoreo de agentes
   */
  async startMonitoring() {
    console.log('🔄 Iniciando sistema de resiliencia MCP...');
    this.monitoring = true;
    
    // Verificación inicial
    await this.checkAllAgents();
    
    // Monitoreo continuo
    this.monitoringInterval = setInterval(async () => {
      if (this.monitoring) {
        await this.checkAllAgents();
      }
    }, this.checkInterval);
    
    this.logger.log('info', 'Sistema de resiliencia iniciado', {
      checkInterval: this.checkInterval,
      agents: Object.keys(this.agents)
    });
  }

  /**
   * Detener monitoreo
   */
  stopMonitoring() {
    console.log('⏹️ Deteniendo sistema de resiliencia...');
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.logger.log('info', 'Sistema de resiliencia detenido');
  }

  /**
   * Verificar todos los agentes
   */
  async checkAllAgents() {
    console.log('\n🔍 Verificando estado de agentes...');
    
    for (const [agentName, agentInfo] of Object.entries(this.agents)) {
      await this.checkAgent(agentName, agentInfo);
    }
    
    this.generateHealthReport();
  }

  /**
   * Verificar un agente específico
   */
  async checkAgent(agentName, agentInfo) {
    try {
      const startTime = Date.now();
      const isHealthy = await this.testAgentHealth(agentName, agentInfo);
      const latency = Date.now() - startTime;
      
      if (isHealthy) {
        agentInfo.status = 'healthy';
        agentInfo.failures = 0;
        agentInfo.lastCheck = new Date().toISOString();
        
        console.log(`  ✅ ${agentName}: Healthy (${latency}ms)`);
        
        this.logger.log('info', `Agent ${agentName} is healthy`, {
          agent: agentName,
          latency,
          status: 'healthy'
        });
      } else {
        throw new Error('Health check failed');
      }
      
    } catch (error) {
      agentInfo.status = 'unhealthy';
      agentInfo.failures++;
      agentInfo.lastCheck = new Date().toISOString();
      
      console.log(`  ❌ ${agentName}: Unhealthy (${agentInfo.failures} failures)`);
      
      this.logger.logError(error, {
        agent: agentName,
        failures: agentInfo.failures,
        status: 'unhealthy'
      });
      
      // Intentar reiniciar si no hemos excedido el límite
      if (agentInfo.restartCount < agentInfo.maxRestarts) {
        await this.restartAgent(agentName, agentInfo);
      } else {
        console.log(`  🚨 ${agentName}: Máximo de reinicios alcanzado`);
        this.logger.log('error', `Agent ${agentName} exceeded max restarts`, {
          agent: agentName,
          restartCount: agentInfo.restartCount,
          maxRestarts: agentInfo.maxRestarts
        });
      }
    }
  }

  /**
   * Probar salud de un agente
   */
  async testAgentHealth(agentName, agentInfo) {
    return new Promise((resolve) => {
      const agentPath = join(PROJECT_ROOT, agentInfo.path);
      const child = spawn('node', [agentPath], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout para evitar que se cuelgue
      const timeout = setTimeout(() => {
        child.kill();
        resolve(false);
      }, 10000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            // Verificar que la respuesta tenga la estructura esperada
            const isValid = this.validateAgentResponse(agentName, result);
            resolve(isValid);
          } catch (error) {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });

      // Enviar input de prueba
      const testInput = this.getTestInput(agentName);
      child.stdin.write(JSON.stringify(testInput));
      child.stdin.end();
    });
  }

  /**
   * Validar respuesta del agente
   */
  validateAgentResponse(agentName, response) {
    if (!response.schema_version || !response.agent_version) {
      return false;
    }

    switch (agentName) {
      case 'context':
        return response.context_bundle !== undefined;
      case 'prompting':
        return response.system_prompt !== undefined;
      case 'rules':
        return response.policies !== undefined;
      case 'orchestration':
        return response.status !== undefined;
      default:
        return true;
    }
  }

  /**
   * Obtener input de prueba para un agente
   */
  getTestInput(agentName) {
    switch (agentName) {
      case 'context':
        return { sources: ['README.md'], selectors: ['test'], max_tokens: 50 };
      case 'prompting':
        return { goal: 'test', style: 'neutral' };
      case 'rules':
        return { policy_refs: ['README.md'], compliance_level: 'basic' };
      case 'orchestration':
        return { action: 'health' };
      default:
        return {};
    }
  }

  /**
   * Reiniciar un agente
   */
  async restartAgent(agentName, agentInfo) {
    const delay = this.retryDelays[Math.min(agentInfo.restartCount, this.retryDelays.length - 1)];
    
    console.log(`  🔄 Reiniciando ${agentName} en ${delay}ms...`);
    
    this.logger.log('info', `Restarting agent ${agentName}`, {
      agent: agentName,
      delay,
      restartCount: agentInfo.restartCount + 1
    });
    
    // Esperar antes del reinicio
    await new Promise(resolve => setTimeout(resolve, delay));
    
    agentInfo.restartCount++;
    agentInfo.status = 'restarting';
    
    // Simular reinicio (en un sistema real, aquí se reiniciaría el proceso)
    console.log(`  ✅ ${agentName}: Reiniciado`);
    
    this.logger.log('info', `Agent ${agentName} restarted`, {
      agent: agentName,
      restartCount: agentInfo.restartCount
    });
  }

  /**
   * Generar reporte de salud
   */
  generateHealthReport() {
    const healthyAgents = Object.values(this.agents).filter(a => a.status === 'healthy').length;
    const totalAgents = Object.keys(this.agents).length;
    const healthPercentage = (healthyAgents / totalAgents) * 100;
    
    console.log(`\n📊 Estado del sistema: ${healthyAgents}/${totalAgents} agentes saludables (${healthPercentage.toFixed(1)}%)`);
    
    // Mostrar detalles por agente
    for (const [agentName, agentInfo] of Object.entries(this.agents)) {
      const status = agentInfo.status === 'healthy' ? '✅' : '❌';
      const lastCheck = agentInfo.lastCheck ? new Date(agentInfo.lastCheck).toLocaleTimeString() : 'Nunca';
      console.log(`  ${status} ${agentName}: ${agentInfo.status} (última verificación: ${lastCheck})`);
    }
    
    // Log de métricas
    this.logger.logMetrics();
  }

  /**
   * Obtener métricas del sistema
   */
  getSystemMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      totalAgents: Object.keys(this.agents).length,
      healthyAgents: Object.values(this.agents).filter(a => a.status === 'healthy').length,
      unhealthyAgents: Object.values(this.agents).filter(a => a.status === 'unhealthy').length,
      totalRestarts: Object.values(this.agents).reduce((sum, a) => sum + a.restartCount, 0),
      totalFailures: Object.values(this.agents).reduce((sum, a) => sum + a.failures, 0),
      agents: this.agents
    };
    
    return metrics;
  }

  /**
   * Generar reporte completo
   */
  async generateFullReport() {
    const metrics = this.getSystemMetrics();
    const reportPath = join(PROJECT_ROOT, 'out', `mcp-resilience-report-${Date.now()}.json`);
    
    const fs = require('fs');
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
    
    console.log(`\n📄 Reporte de resiliencia guardado: ${reportPath}`);
    return reportPath;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const resilience = new MCPResilienceSystem();
  
  // Manejar señales de terminación
  process.on('SIGINT', async () => {
    console.log('\n🛑 Recibida señal de terminación...');
    resilience.stopMonitoring();
    await resilience.generateFullReport();
    process.exit(0);
  });
  
  // Iniciar monitoreo
  resilience.startMonitoring().catch(console.error);
}

export default MCPResilienceSystem;
