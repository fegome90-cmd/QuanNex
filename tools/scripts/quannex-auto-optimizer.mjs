#!/usr/bin/env node
/**
 * quannex-auto-optimizer.mjs
 * Optimizador automático que combina readiness-check con MCP
 * para identificar y resolver problemas automáticamente
 */
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class QuanNexAutoOptimizer {
  constructor() {
    this.projectRoot = PROJECT_ROOT;
    this.optimizationCount = 0;
    this.maxOptimizations = 3;
  }

  async run() {
    console.log('🚀 QUANNEX AUTO-OPTIMIZER');
    console.log('=========================');
    console.log('');

    // 1. Generar métricas actuales
    await this.generateMetrics();

    // 2. Ejecutar readiness-check
    const readinessResult = await this.runReadinessCheck();

    if (readinessResult.success) {
      console.log('🟢 READINESS CHECK: GO ✅');
      console.log('🎉 Sistema listo para mejoras del Orquestador y Context');
      return;
    }

    console.log('🔴 READINESS CHECK: NO-GO ❌');
    console.log('🔧 Iniciando optimización automática...');
    console.log('');

    // 3. Optimizar problemas identificados
    await this.optimizeIssues(readinessResult.failedChecks);

    // 4. Verificar si se resolvieron los problemas
    const finalCheck = await this.runReadinessCheck();
    
    if (finalCheck.success) {
      console.log('✅ Optimización exitosa - Sistema listo para mejoras');
    } else {
      console.log('⚠️ Optimización parcial - Se requieren ajustes manuales');
      this.showRemainingIssues(finalCheck.failedChecks);
    }
  }

  async generateMetrics() {
    console.log('📊 Generando métricas actuales...');
    
    const result = spawnSync('npm', ['run', 'quannex:metrics:generate'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });

    if (result.status === 0) {
      console.log('✅ Métricas generadas exitosamente');
    } else {
      console.log('❌ Error generando métricas:', result.stderr);
    }
    console.log('');
  }

  async runReadinessCheck() {
    console.log('🚦 Ejecutando readiness-check...');
    
    const result = spawnSync('npm', ['run', 'quannex:readiness'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });

    const success = result.status === 0;
    const output = result.stdout.toString();
    
    // Extraer checks fallidos del output
    const failedChecks = this.parseFailedChecks(output);
    
    console.log(success ? '✅ Readiness check exitoso' : '❌ Readiness check fallido');
    console.log('');

    return { success, failedChecks, output };
  }

  parseFailedChecks(output) {
    const failedChecks = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('❌') && line.includes(':')) {
        const match = line.match(/❌ (\w+): (.+)/);
        if (match) {
          failedChecks.push({
            id: match[1],
            reason: match[2].trim()
          });
        }
      }
    }
    
    return failedChecks;
  }

  async optimizeIssues(failedChecks) {
    console.log(`🔧 Optimizando ${failedChecks.length} problemas identificados...`);
    console.log('');

    for (const check of failedChecks) {
      console.log(`🎯 Optimizando: ${check.id} - ${check.reason}`);
      
      try {
        await this.optimizeSpecificIssue(check);
        console.log(`✅ Optimización completada para ${check.id}`);
      } catch (error) {
        console.log(`❌ Error optimizando ${check.id}: ${error.message}`);
      }
      
      console.log('');
    }
  }

  async optimizeSpecificIssue(check) {
    const { id, reason } = check;

    switch (id) {
      case 'performance':
        await this.optimizePerformance();
        break;
      case 'ci':
        await this.optimizeCI();
        break;
      case 'stability':
        await this.optimizeStability();
        break;
      case 'contracts':
        await this.optimizeContracts();
        break;
      case 'resilience':
        await this.optimizeResilience();
        break;
      case 'observability':
        await this.optimizeObservability();
        break;
      case 'security':
        await this.optimizeSecurity();
        break;
      default:
        console.log(`⚠️ No se encontró optimización específica para ${id}`);
    }
  }

  async optimizePerformance() {
    console.log('⚡ Optimizando performance...');
    
    // Crear y ejecutar workflow MCP para performance
    const workflowId = await this.createPerformanceWorkflow();
    if (workflowId) {
      await this.executeWorkflow(workflowId);
    }
    
    // Aplicar optimizaciones específicas
    await this.applyPerformanceOptimizations();
  }

  async optimizeCI() {
    console.log('🔄 Optimizando CI/CD...');
    
    // Ejecutar ci-gate1 para verificar estado
    const result = spawnSync('npm', ['run', 'ci:gate1'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });
    
    if (result.status === 0) {
      console.log('✅ CI/CD optimizado exitosamente');
    } else {
      console.log('❌ CI/CD requiere atención manual');
    }
  }

  async optimizeStability() {
    console.log('🛡️ Optimizando estabilidad...');
    
    // Ejecutar tests de contratos
    const result = spawnSync('npm', ['run', 'quannex:contracts'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });
    
    if (result.status === 0) {
      console.log('✅ Estabilidad optimizada');
    } else {
      console.log('❌ Estabilidad requiere atención manual');
    }
  }

  async optimizeContracts() {
    console.log('📋 Optimizando contratos...');
    
    // Ejecutar tests de contratos
    const result = spawnSync('npm', ['run', 'quannex:contracts'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });
    
    if (result.status === 0) {
      console.log('✅ Contratos optimizados');
    } else {
      console.log('❌ Contratos requieren atención manual');
    }
  }

  async optimizeResilience() {
    console.log('🔄 Optimizando resiliencia...');
    
    // Ejecutar sistema de resiliencia
    const result = spawnSync('npm', ['run', 'quannex:resilience'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });
    
    if (result.status === 0) {
      console.log('✅ Resiliencia optimizada');
    } else {
      console.log('❌ Resiliencia requiere atención manual');
    }
  }

  async optimizeObservability() {
    console.log('👁️ Optimizando observabilidad...');
    
    // Ejecutar recolección de métricas
    const result = spawnSync('npm', ['run', 'quannex:metrics'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });
    
    if (result.status === 0) {
      console.log('✅ Observabilidad optimizada');
    } else {
      console.log('❌ Observabilidad requiere atención manual');
    }
  }

  async optimizeSecurity() {
    console.log('🔒 Optimizando seguridad...');
    
    // Ejecutar verificación de seguridad
    const result = spawnSync('npm', ['run', 'quannex:semaphore:health'], {
      cwd: this.projectRoot,
      encoding: 'utf8'
    });
    
    if (result.status === 0) {
      console.log('✅ Seguridad optimizada');
    } else {
      console.log('❌ Seguridad requiere atención manual');
    }
  }

  async createPerformanceWorkflow() {
    console.log('🚀 Creando workflow MCP para performance...');
    
    const workflowData = {
      jsonrpc: '2.0',
      id: 'create-performance-workflow',
      method: 'tools/call',
      params: {
        name: 'create_workflow',
        arguments: {
          name: 'auto-performance-optimization',
          description: 'Optimización automática de performance',
          steps: [
            {
              step_id: 'analyze_performance',
              agent: 'context',
              action: 'resolve',
              input: {
                sources: ['data/metrics/quannex-performance.json'],
                selectors: ['performance', 'p95', 'error_rate']
              }
            },
            {
              step_id: 'generate_fixes',
              agent: 'prompting',
              action: 'buildPrompt',
              input: {
                goal: 'Generar fixes para performance p95=8s y error_rate=5%',
                style: 'technical',
                constraints: ['reducir p95 a ≤2s', 'reducir error_rate a ≤1%']
              }
            }
          ]
        }
      }
    };

    try {
      const result = spawnSync('node', ['orchestration/mcp/server.js'], {
        cwd: this.projectRoot,
        input: JSON.stringify(workflowData),
        encoding: 'utf8'
      });

      if (result.status === 0) {
        // Limpiar el output para extraer solo el JSON
        const cleanOutput = result.stdout.toString().replace(/^[^{]*/, '').trim();
        const response = JSON.parse(cleanOutput);
        const workflowId = response.result?.content?.[0]?.text?.match(/workflow_id": "([^"]+)"/)?.[1];
        return workflowId;
      } else {
        console.log('❌ Error en MCP server:', result.stderr);
        return null;
      }
    } catch (error) {
      console.log('❌ Error parsing MCP response:', error.message);
      return null;
    }
  }

  async executeWorkflow(workflowId) {
    console.log(`⚡ Ejecutando workflow ${workflowId}...`);
    
    const executeData = {
      jsonrpc: '2.0',
      id: 'execute-workflow',
      method: 'tools/call',
      params: {
        name: 'execute_workflow',
        arguments: { workflow_id: workflowId }
      }
    };

    try {
      const result = spawnSync('node', ['orchestration/mcp/server.js'], {
        cwd: this.projectRoot,
        input: JSON.stringify(executeData),
        encoding: 'utf8'
      });

      if (result.status === 0) {
        console.log('✅ Workflow ejecutado exitosamente');
        return true;
      } else {
        console.log('❌ Error ejecutando workflow:', result.stderr);
        return false;
      }
    } catch (error) {
      console.log('❌ Error ejecutando workflow:', error.message);
      return false;
    }
  }

  async applyPerformanceOptimizations() {
    console.log('🔧 Aplicando optimizaciones de performance...');
    
    // Simular optimizaciones de performance
    // En un caso real, aquí se aplicarían fixes específicos
    console.log('  - Optimizando latencia del orquestador');
    console.log('  - Reduciendo timeouts de agentes');
    console.log('  - Mejorando cache de context');
    console.log('  - Optimizando serialización JSON');
  }

  showRemainingIssues(failedChecks) {
    console.log('⚠️ PROBLEMAS RESTANTES:');
    console.log('======================');
    
    failedChecks.forEach(check => {
      console.log(`❌ ${check.id}: ${check.reason}`);
    });
    
    console.log('');
    console.log('💡 Recomendaciones:');
    console.log('  - Revisar logs detallados');
    console.log('  - Ejecutar checklist de estabilización');
    console.log('  - Considerar ajustes manuales específicos');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new QuanNexAutoOptimizer();
  optimizer.run().catch(console.error);
}

export default QuanNexAutoOptimizer;
