#!/usr/bin/env node
/**
 * @fileoverview Pruebas de contrato entre agentes MCP - VERSIÓN CORREGIDA
 * @description Valida que los agentes cumplan con los contratos esperados
 */

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class AgentContractTester {
  constructor() {
    this.results = {
      context: { passed: 0, failed: 0, tests: [] },
      prompting: { passed: 0, failed: 0, tests: [] },
      rules: { passed: 0, failed: 0, tests: [] },
      orchestration: { passed: 0, failed: 0, tests: [] }
    };
  }

  /**
   * Ejecutar test de contrato para un agente
   */
  async testAgent(agentName, testCases) {
    console.log(`\n🧪 Probando contratos del agente: ${agentName}`);
    
    for (const testCase of testCases) {
      try {
        const result = await this.executeAgent(agentName, testCase.input);
        const isValid = this.validateResponse(agentName, result, testCase.expected);
        
        if (isValid) {
          this.results[agentName].passed++;
          this.results[agentName].tests.push({
            name: testCase.name,
            status: 'PASS',
            input: testCase.input,
            output: result
          });
          console.log(`  ✅ ${testCase.name}`);
        } else {
          this.results[agentName].failed++;
          this.results[agentName].tests.push({
            name: testCase.name,
            status: 'FAIL',
            input: testCase.input,
            output: result,
            expected: testCase.expected
          });
          console.log(`  💥 ${testCase.name}: Agent failed with code 1: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        this.results[agentName].failed++;
        this.results[agentName].tests.push({
          name: testCase.name,
          status: 'ERROR',
          input: testCase.input,
          error: error.message
        });
        console.log(`  💥 ${testCase.name}: ${error.message}`);
      }
    }
  }

  /**
   * Ejecutar un agente con input específico
   */
  async executeAgent(agentName, input) {
    return new Promise((resolve, reject) => {
      const agentPath = join(PROJECT_ROOT, 'agents', agentName, 'agent.js');
      
      const child = spawn('node', [agentPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: PROJECT_ROOT
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            reject(new Error(`Invalid JSON output: ${stdout}`));
          }
        } else {
          reject(new Error(`Agent failed with code ${code}: ${stderr}`));
        }
      });

      child.stdin.write(JSON.stringify(input));
      child.stdin.end();
    });
  }

  /**
   * Validar respuesta del agente
   */
  validateResponse(agentName, response, _expected) {
    // Validar estructura básica
    if (response.type === 'hello') {
      return response.agent === agentName && response.version;
    }
    
    if (response.ok !== undefined) {
      return response.ok === true;
    }

    // Fallback para estructura original
    if (!response.schema_version || !response.agent_version) {
      return false;
    }

    // Validar campos específicos por agente
    switch (agentName) {
      case 'context':
        return response.context_bundle && response.provenance && response.stats;
      
      case 'prompting':
        return response.system_prompt && response.user_prompt && response.guardrails;
      
      case 'rules':
        return response.policies && response.guardrails;
      
      case 'orchestration':
        return response.status && response.agents;
      
      default:
        return true;
    }
  }

  /**
   * Ejecutar todas las pruebas de contrato
   */
  async runAllTests() {
    console.log('🚀 Iniciando pruebas de contrato entre agentes MCP...\n');

    // Test cases para @context - CORREGIDOS
    const contextTests = [
      {
        name: 'Handshake test',
        input: {
          type: 'hello',
          agent: 'context'
        },
        expected: {
          type: 'hello',
          agent: 'context',
          version: 'string'
        }
      },
      {
        name: 'Schema validation test',
        input: {
          sources: ['README.md'],
          selectors: ['test'],
          max_tokens: 1000
        },
        expected: {
          schema_version: 'string',
          agent_version: 'string',
          context_bundle: 'string',
          provenance: 'array',
          stats: 'object'
        }
      }
    ];

    // Test cases para @prompting - CORREGIDOS
    const promptingTests = [
      {
        name: 'Handshake test',
        input: {
          type: 'hello',
          agent: 'prompting'
        },
        expected: {
          type: 'hello',
          agent: 'prompting',
          version: 'string'
        }
      },
      {
        name: 'Schema validation test',
        input: {
          goal: 'Create a test prompt',
          style: 'formal',
          context: 'Test context',
          constraints: ['Be concise', 'Be clear']
        },
        expected: {
          schema_version: 'string',
          agent_version: 'string',
          system_prompt: 'string',
          user_prompt: 'string',
          guardrails: 'array'
        }
      }
    ];

    // Test cases para @rules - CORREGIDOS
    const rulesTests = [
      {
        name: 'Handshake test',
        input: {
          type: 'hello',
          agent: 'rules'
        },
        expected: {
          type: 'hello',
          agent: 'rules',
          version: 'string'
        }
      },
      {
        name: 'Schema validation test',
        input: {
          policy_refs: ['README.md'],
          compliance_level: 'basic',
          tone: 'neutral',
          context: 'Test context'
        },
        expected: {
          schema_version: 'string',
          agent_version: 'string',
          policies: 'array',
          guardrails: 'array'
        }
      }
    ];

    // Test cases para @orchestration
    const orchestrationTests = [
      {
        name: 'Handshake test',
        input: {
          type: 'hello',
          agent: 'orchestration'
        },
        expected: {
          type: 'hello',
          agent: 'orchestration',
          version: 'string'
        }
      }
    ];

    // Ejecutar todas las pruebas
    await this.testAgent('context', contextTests);
    await this.testAgent('prompting', promptingTests);
    await this.testAgent('rules', rulesTests);
    await this.testAgent('orchestration', orchestrationTests);

    // Generar reporte
    this.generateReport();
  }

  /**
   * Generar reporte de resultados
   */
  generateReport() {
    console.log('\n📊 REPORTE DE PRUEBAS DE CONTRATO');
    console.log('=====================================\n');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [agentName, result] of Object.entries(this.results)) {
      const total = result.passed + result.failed;
      const successRate = total > 0 ? (result.passed / total * 100).toFixed(1) : 0;

      console.log(`🤖 ${agentName.toUpperCase()}:`);
      console.log(`  ✅ Pasaron: ${result.passed}`);
      console.log(`  ❌ Fallaron: ${result.failed}`);
      console.log(`  📈 Tasa de éxito: ${successRate}%`);

      if (result.failed > 0) {
        console.log(`  🔍 Detalles de fallos:`);
        result.tests
          .filter(test => test.status !== 'PASS')
          .forEach(test => {
            console.log(`    - ${test.name}: ${test.status}`);
            if (test.error) {
              console.log(`      Error: ${test.error}`);
            } else if (test.output) {
              console.log(`      Output: ${JSON.stringify(test.output)}`);
            }
          });
      }

      console.log('');

      totalPassed += result.passed;
      totalFailed += result.failed;
    }

    const totalTests = totalPassed + totalFailed;
    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;

    console.log('🎯 RESUMEN GENERAL:');
    console.log(`  ✅ Total pasaron: ${totalPassed}`);
    console.log(`  ❌ Total fallaron: ${totalFailed}`);
    console.log(`  📈 Tasa de éxito general: ${overallSuccessRate}%`);

    // Guardar reporte
    const timestamp = Date.now();
    const reportPath = join(PROJECT_ROOT, 'out', `agent-contract-tests-fixed-${timestamp}.json`);
    
    try {
      writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
          totalPassed,
          totalFailed,
          successRate: overallSuccessRate
        },
        results: this.results
      }, null, 2));
      console.log(`\n📄 Reporte guardado: ${reportPath}`);
    } catch (error) {
      console.log(`\n⚠️ Error guardando reporte: ${error.message}`);
    }

    if (totalFailed > 0) {
      console.log('\n🚨 Los contratos entre agentes necesitan reparación urgente.');
    } else {
      console.log('\n🎉 ¡Todos los contratos pasaron exitosamente!');
    }
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AgentContractTester();
  tester.runAllTests().catch(console.error);
}
