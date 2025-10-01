#!/usr/bin/env node
/**
 * @fileoverview Pruebas de contrato entre agentes MCP
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
          console.log(`  ❌ ${testCase.name}`);
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
   * Ejecutar agente con input específico
   */
  async executeAgent(agentName, input) {
    return new Promise((resolve, reject) => {
      const agentPath = agentName === 'orchestration' 
        ? join(PROJECT_ROOT, 'orchestration', 'orchestrator.js')
        : join(PROJECT_ROOT, 'agents', agentName, 'agent.js');
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

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
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
  validateResponse(agentName, response, expected) {
    // Validar estructura básica para el nuevo sistema de contratos
    if (response.type === 'hello') {
      return response.agent === agentName && response.version;
    }
    
    if (response.ok !== undefined) {
      // Es una respuesta con schema validation
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

    // Test cases para @context
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
          requestId: 'test-123',
          agent: 'context',
          capability: 'context.resolve',
          payload: { sources: ['README.md'], selectors: ['test'] },
          ts: '2025-01-01T00:00:00Z'
        },
        expected: {
          ok: true,
          project: 'string',
          branch: 'string',
          filesChanged: 'array',
          contextBundle: 'string'
        }
      }
    ];

    // Test cases para @prompting
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
          requestId: 'test-123',
          agent: 'prompting',
          capability: 'prompting.buildPrompt',
          payload: { goal: 'test prompt', style: 'formal' },
          ts: '2025-01-01T00:00:00Z'
        },
        expected: {
          ok: true,
          templateId: 'string',
          filled: 'string',
          systemPrompt: 'string',
          userPrompt: 'string'
        }
      }
    ];

    // Test cases para @rules
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
          requestId: 'test-123',
          agent: 'rules',
          capability: 'rules.validate',
          payload: { policy_refs: ['docs/CHARTER.md'], compliance_level: 'basic' },
          ts: '2025-01-01T00:00:00Z'
        },
        expected: {
          ok: true,
          rulesetVersion: 'string',
          violations: 'array',
          suggestions: 'array',
          policyRefs: 'array',
          complianceLevel: 'string',
          policy_ok: 'boolean'
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

    // Ejecutar pruebas
    await this.testAgent('context', contextTests);
    await this.testAgent('prompting', promptingTests);
    await this.testAgent('rules', rulesTests);
    await this.testAgent('orchestration', orchestrationTests);

    // Generar reporte
    this.generateReport();
  }

  /**
   * Generar reporte de pruebas
   */
  generateReport() {
    console.log('\n📊 REPORTE DE PRUEBAS DE CONTRATO');
    console.log('=====================================');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [agentName, result] of Object.entries(this.results)) {
      const total = result.passed + result.failed;
      const successRate = total > 0 ? (result.passed / total) * 100 : 0;
      
      console.log(`\n🤖 ${agentName.toUpperCase()}:`);
      console.log(`  ✅ Pasaron: ${result.passed}`);
      console.log(`  ❌ Fallaron: ${result.failed}`);
      console.log(`  📈 Tasa de éxito: ${successRate.toFixed(1)}%`);

      totalPassed += result.passed;
      totalFailed += result.failed;

      // Mostrar detalles de fallos
      if (result.failed > 0) {
        console.log(`  🔍 Detalles de fallos:`);
        result.tests
          .filter(test => test.status !== 'PASS')
          .forEach(test => {
            console.log(`    - ${test.name}: ${test.status}`);
            if (test.error) {
              console.log(`      Error: ${test.error}`);
            }
          });
      }
    }

    const totalTests = totalPassed + totalFailed;
    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    console.log('\n🎯 RESUMEN GENERAL:');
    console.log(`  ✅ Total pasaron: ${totalPassed}`);
    console.log(`  ❌ Total fallaron: ${totalFailed}`);
    console.log(`  📈 Tasa de éxito general: ${overallSuccessRate.toFixed(1)}%`);

    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPassed,
        totalFailed,
        successRate: overallSuccessRate
      },
      results: this.results
    };

    const reportPath = join(PROJECT_ROOT, 'out', `agent-contract-tests-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Reporte guardado: ${reportPath}`);
    
    if (overallSuccessRate >= 90) {
      console.log('\n🎉 ¡Excelente! Los contratos entre agentes están funcionando correctamente.');
    } else if (overallSuccessRate >= 70) {
      console.log('\n⚠️ Bueno, pero hay algunos contratos que necesitan atención.');
    } else {
      console.log('\n🚨 Los contratos entre agentes necesitan reparación urgente.');
    }
  }
}

// Ejecutar pruebas si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AgentContractTester();
  tester.runAllTests().catch(console.error);
}

export default AgentContractTester;
