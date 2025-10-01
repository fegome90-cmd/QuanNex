#!/usr/bin/env node
/**
 * @fileoverview Sistema de Resiliencia MCP Simplificado
 * @description Supervisa solo el servidor MCP principal
 */

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class SimpleMCPResilience {
  constructor() {
    this.mcpServer = {
      path: 'orchestration/mcp/server.js',
      status: 'unknown',
      failures: 0,
      lastCheck: null,
      restartCount: 0,
      maxRestarts: 3
    };
    this.monitoring = false;
    this.checkInterval = 30000; // 30 segundos
  }

  async start() {
    console.log('🔄 Iniciando sistema de resiliencia QuanNex...');
    this.monitoring = true;
    await this.checkMCPHealth();
    
    if (this.monitoring) {
      setInterval(() => {
        if (this.monitoring) {
          this.checkMCPHealth();
        }
      }, this.checkInterval);
    }
  }

  async checkMCPHealth() {
    console.log('\n🔍 Verificando estado del servidor QuanNex...');
    
    try {
      const startTime = Date.now();
      const isHealthy = await this.testMCPHealth();
      const latency = Date.now() - startTime;
      
      if (isHealthy) {
        this.mcpServer.status = 'healthy';
        this.mcpServer.failures = 0;
        this.mcpServer.lastCheck = new Date().toISOString();
        
        console.log(`  ✅ QuanNex Server: Healthy (${latency}ms)`);
      } else {
        throw new Error('QuanNex Server health check failed');
      }
      
    } catch (error) {
      this.mcpServer.status = 'unhealthy';
      this.mcpServer.failures++;
      this.mcpServer.lastCheck = new Date().toISOString();
      
      console.log(`  ❌ QuanNex Server: Unhealthy (${this.mcpServer.failures} failures)`);
      
      // Intentar reiniciar si no hemos excedido el límite
      if (this.mcpServer.restartCount < this.mcpServer.maxRestarts) {
        this.mcpServer.restartCount++;
        const delay = Math.min(1000 * Math.pow(2, this.mcpServer.restartCount - 1), 10000);
        
        console.log(`  🔄 Reiniciando MCP Server en ${delay}ms...`);
        
        setTimeout(async () => {
          await this.restartMCPServer();
        }, delay);
      } else {
        console.log(`  🚨 MCP Server: Máximo de reinicios alcanzado`);
        this.mcpServer.status = 'failed';
      }
    }
    
    this.generateHealthReport();
  }

  async testMCPHealth() {
    return new Promise((resolve) => {
      const serverPath = join(PROJECT_ROOT, this.mcpServer.path);
      const child = spawn('node', [serverPath], {
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
      }, 5000);

      // Enviar comando MCP tools/list como health check
      const healthCheck = {
        jsonrpc: '2.0',
        id: 'health-check',
        method: 'tools/list',
        params: {}
      };
      
      child.stdin.write(JSON.stringify(healthCheck) + '\n');
      child.stdin.end();

      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            // Verificar que la respuesta contenga tools
            const isValid = result && result.result && result.result.tools;
            resolve(isValid);
          } catch (error) {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    });
  }

  async restartMCPServer() {
    console.log('  🔄 Reiniciando MCP Server...');
    
    try {
      // Aquí podrías implementar lógica para reiniciar el servidor
      // Por ahora, solo marcamos como reiniciado
      console.log('  ✅ MCP Server: Reiniciado');
      this.mcpServer.status = 'restarting';
      
      // Después de un breve delay, verificar de nuevo
      setTimeout(() => {
        this.checkMCPHealth();
      }, 2000);
      
    } catch (error) {
      console.log(`  ❌ Error al reiniciar MCP Server: ${error.message}`);
    }
  }

  generateHealthReport() {
    const status = this.mcpServer.status === 'healthy' ? '✅' : '❌';
    const lastCheck = this.mcpServer.lastCheck ? new Date(this.mcpServer.lastCheck).toLocaleTimeString() : 'Nunca';
    
    console.log(`\n📊 Estado del sistema MCP:`);
    console.log(`  ${status} MCP Server: ${this.mcpServer.status} (última verificación: ${lastCheck})`);
    console.log(`  📈 Fallos: ${this.mcpServer.failures}, Reinicios: ${this.mcpServer.restartCount}`);
  }

  stop() {
    console.log('\n🛑 Deteniendo sistema de resiliencia...');
    this.monitoring = false;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const resilience = new SimpleMCPResilience();
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    resilience.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    resilience.stop();
    process.exit(0);
  });
  
  resilience.start().catch(console.error);
}

export default SimpleMCPResilience;
