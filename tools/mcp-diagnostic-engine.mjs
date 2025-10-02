#!/usr/bin/env node
/**
 * MCP Diagnostic Engine - Diagnóstico Avanzado
 * Detecta y diagnostica problemas complejos del sistema
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

class MCPDiagnosticEngine {
  constructor() {
    this.issues = [];
    this.solutions = [];
    this.metrics = {};
  }

  /**
   * Diagnóstico completo del sistema
   */
  async runFullDiagnostic() {
    console.log('🔍 Ejecutando diagnóstico completo del sistema MCP...');
    
    await this.checkSystemHealth();
    await this.checkAgentPerformance();
    await this.checkIntegrationIssues();
    await this.checkPerformanceMetrics();
    await this.checkSecurityPosture();
    
    return this.generateReport();
  }

  /**
   * Verificar salud del sistema
   */
  async checkSystemHealth() {
    console.log('  🏥 Verificando salud del sistema...');
    
    // Verificar procesos MCP
    try {
      const processes = execSync('ps aux | grep mcp', { encoding: 'utf8' });
      const mcpProcesses = processes.split('\n').filter(p => p.includes('mcp') && !p.includes('grep'));
      this.metrics.mcpProcesses = mcpProcesses.length;
      
      if (mcpProcesses.length === 0) {
        this.issues.push({
          type: 'critical',
          category: 'system',
          message: 'No hay procesos MCP ejecutándose',
          solution: 'Ejecutar: ./scripts/mcp-autonomous-init.sh'
        });
      }
    } catch (e) {
      this.issues.push({
        type: 'warning',
        category: 'system',
        message: 'No se pudo verificar procesos MCP',
        solution: 'Verificar permisos del sistema'
      });
    }

    // Verificar archivos críticos
    const criticalFiles = [
      '.mcp.json',
      '.cursor/mcp.json',
      'versions/v3/mcp-server-consolidated.js',
      'orchestration/orchestrator.js'
    ];

    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        this.issues.push({
          type: 'critical',
          category: 'files',
          message: `Archivo crítico faltante: ${file}`,
          solution: `Crear archivo: ${file}`
        });
      }
    }
  }

  /**
   * Verificar rendimiento de agentes
   */
  async checkAgentPerformance() {
    console.log('  🤖 Verificando rendimiento de agentes...');
    
    const agents = ['context', 'prompting', 'rules', 'security'];
    
    for (const agent of agents) {
      try {
        const startTime = Date.now();
        
        // Simular llamada al agente
        const agentPath = `agents/${agent}/agent.js`;
        if (fs.existsSync(agentPath)) {
          const responseTime = Date.now() - startTime;
          this.metrics[`${agent}ResponseTime`] = responseTime;
          
          if (responseTime > 5000) {
            this.issues.push({
              type: 'warning',
              category: 'performance',
              message: `Agente ${agent} lento: ${responseTime}ms`,
              solution: 'Optimizar agente o verificar recursos del sistema'
            });
          }
        } else {
          this.issues.push({
            type: 'critical',
            category: 'agents',
            message: `Agente ${agent} no encontrado`,
            solution: `Crear agente en: ${agentPath}`
          });
        }
      } catch (e) {
        this.issues.push({
          type: 'error',
          category: 'agents',
          message: `Error verificando agente ${agent}: ${e.message}`,
          solution: 'Revisar configuración del agente'
        });
      }
    }
  }

  /**
   * Verificar problemas de integración
   */
  async checkIntegrationIssues() {
    console.log('  🔗 Verificando problemas de integración...');
    
    // Verificar configuración de Cursor
    if (fs.existsSync('.cursor/mcp.json')) {
      try {
        const config = JSON.parse(fs.readFileSync('.cursor/mcp.json', 'utf8'));
        if (!config.mcpServers || Object.keys(config.mcpServers).length === 0) {
          this.issues.push({
            type: 'warning',
            category: 'integration',
            message: 'Configuración MCP vacía en Cursor',
            solution: 'Configurar servidores MCP en .cursor/mcp.json'
          });
        }
      } catch (e) {
        this.issues.push({
          type: 'error',
          category: 'integration',
          message: 'Error leyendo configuración de Cursor',
          solution: 'Verificar formato JSON en .cursor/mcp.json'
        });
      }
    }

    // Verificar integración con Makefile
    if (fs.existsSync('Makefile')) {
      const makefileContent = fs.readFileSync('Makefile', 'utf8');
      if (!makefileContent.includes('mcp') && !makefileContent.includes('quannex')) {
        this.issues.push({
          type: 'info',
          category: 'integration',
          message: 'Makefile no integrado con MCP',
          solution: 'Agregar comandos MCP al Makefile'
        });
      }
    }
  }

  /**
   * Verificar métricas de rendimiento
   */
  async checkPerformanceMetrics() {
    console.log('  📊 Verificando métricas de rendimiento...');
    
    // Verificar uso de memoria
    try {
      const memoryUsage = process.memoryUsage();
      this.metrics.memoryUsage = memoryUsage;
      
      if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
        this.issues.push({
          type: 'warning',
          category: 'performance',
          message: `Uso alto de memoria: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          solution: 'Optimizar código o liberar memoria no utilizada'
        });
      }
    } catch (e) {
      console.warn('No se pudo verificar uso de memoria');
    }

    // Verificar tiempo de respuesta del sistema
    const systemStartTime = Date.now();
    try {
      execSync('node --version', { stdio: 'pipe' });
      const systemResponseTime = Date.now() - systemStartTime;
      this.metrics.systemResponseTime = systemResponseTime;
      
      if (systemResponseTime > 1000) {
        this.issues.push({
          type: 'warning',
          category: 'performance',
          message: `Sistema lento: ${systemResponseTime}ms`,
          solution: 'Verificar recursos del sistema o optimizar configuración'
        });
      }
    } catch (e) {
      this.issues.push({
        type: 'critical',
        category: 'system',
        message: 'Node.js no responde correctamente',
        solution: 'Verificar instalación de Node.js'
      });
    }
  }

  /**
   * Verificar postura de seguridad
   */
  async checkSecurityPosture() {
    console.log('  🛡️ Verificando postura de seguridad...');
    
    // Verificar archivos de configuración sensibles
    const sensitiveFiles = ['.env', '.env.local', 'secrets.json'];
    
    for (const file of sensitiveFiles) {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        if (stats.mode & 0o077) { // Permisos de grupo/otros
          this.issues.push({
            type: 'critical',
            category: 'security',
            message: `Archivo sensible con permisos inseguros: ${file}`,
            solution: `Ejecutar: chmod 600 ${file}`
          });
        }
      }
    }

    // Verificar que no haya secretos hardcodeados
    const codeFiles = this.findCodeFiles();
    for (const file of codeFiles.slice(0, 10)) { // Limitar para rendimiento
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (this.containsSecrets(content)) {
          this.issues.push({
            type: 'warning',
            category: 'security',
            message: `Posible secreto hardcodeado en: ${file}`,
            solution: 'Mover secretos a variables de entorno'
          });
        }
      } catch (e) {
        // Ignorar archivos que no se pueden leer
      }
    }
  }

  /**
   * Encontrar archivos de código
   */
  findCodeFiles() {
    const codeFiles = [];
    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            walkDir(fullPath);
          } else if (stat.isFile() && /\.(js|mjs|ts|json)$/.test(file)) {
            codeFiles.push(fullPath);
          }
        }
      } catch (e) {
        // Ignorar directorios que no se pueden leer
      }
    };
    
    walkDir('.');
    return codeFiles;
  }

  /**
   * Detectar secretos en código
   */
  containsSecrets(content) {
    const secretPatterns = [
      /password\s*=\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
      /token\s*=\s*['"][^'"]+['"]/i
    ];
    
    return secretPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Generar reporte de diagnóstico
   */
  generateReport() {
    const criticalIssues = this.issues.filter(i => i.type === 'critical');
    const warnings = this.issues.filter(i => i.type === 'warning');
    const errors = this.issues.filter(i => i.type === 'error');
    const info = this.issues.filter(i => i.type === 'info');

    console.log('\n📋 Reporte de Diagnóstico MCP');
    console.log('==============================');
    
    if (criticalIssues.length > 0) {
      console.log(`\n🔴 Problemas Críticos (${criticalIssues.length}):`);
      criticalIssues.forEach(issue => {
        console.log(`  • ${issue.message}`);
        console.log(`    Solución: ${issue.solution}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n🟡 Advertencias (${warnings.length}):`);
      warnings.forEach(issue => {
        console.log(`  • ${issue.message}`);
        console.log(`    Solución: ${issue.solution}`);
      });
    }

    if (errors.length > 0) {
      console.log(`\n🟠 Errores (${errors.length}):`);
      errors.forEach(issue => {
        console.log(`  • ${issue.message}`);
        console.log(`    Solución: ${issue.solution}`);
      });
    }

    if (info.length > 0) {
      console.log(`\nℹ️ Información (${info.length}):`);
      info.forEach(issue => {
        console.log(`  • ${issue.message}`);
        console.log(`    Solución: ${issue.solution}`);
      });
    }

    console.log('\n📊 Métricas del Sistema:');
    console.log(`  Procesos MCP: ${this.metrics.mcpProcesses || 0}`);
    console.log(`  Tiempo de respuesta del sistema: ${this.metrics.systemResponseTime || 'N/A'}ms`);
    if (this.metrics.memoryUsage) {
      console.log(`  Uso de memoria: ${Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    }

    return {
      issues: this.issues,
      metrics: this.metrics,
      summary: {
        total: this.issues.length,
        critical: criticalIssues.length,
        warnings: warnings.length,
        errors: errors.length,
        info: info.length
      }
    };
  }
}

// Ejecutar diagnóstico si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostic = new MCPDiagnosticEngine();
  diagnostic.runFullDiagnostic().then(report => {
    const exitCode = report.summary.critical > 0 ? 1 : 0;
    process.exit(exitCode);
  });
}

export default MCPDiagnosticEngine;
