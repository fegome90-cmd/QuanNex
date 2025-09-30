#!/usr/bin/env node
/**
 * @fileoverview Wrapper para run-clean.sh con logging de contexto MCP
 * @description Ejecuta agentes MCP y registra automáticamente el contexto y prompts
 */

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ContextLogger from './context-logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class MCPAgentRunner {
  constructor() {
    this.logger = new ContextLogger();
  }

  async runAgent(agentName, payloadPath, options = {}) {
    const startTime = Date.now();
    
    console.log(`🚀 Running agent: ${agentName}`);
    console.log(`📄 Payload: ${payloadPath}`);
    
    // Leer payload de entrada
    let inputPayload;
    try {
      inputPayload = JSON.parse(readFileSync(payloadPath, 'utf8'));
    } catch (error) {
      console.error(`❌ Error reading payload ${payloadPath}:`, error.message);
      return null;
    }

    // Ejecutar agente usando run-clean.sh
    const result = await this.executeAgent(agentName, payloadPath, options);
    
    if (!result.success) {
      console.error(`❌ Agent ${agentName} failed:`, result.error);
      return null;
    }

    const processingTime = Date.now() - startTime;
    
    // Loggear según el tipo de agente
    this.logAgentExecution(agentName, inputPayload, result.output, {
      processing_time: processingTime,
      ...options
    });

    console.log(`✅ Agent ${agentName} completed in ${processingTime}ms`);
    return result.output;
  }

  async executeAgent(agentName, payloadPath, options = {}) {
    return new Promise((resolve) => {
      const runCleanPath = join(PROJECT_ROOT, 'core', 'scripts', 'run-clean.sh');
      const agentPath = join(PROJECT_ROOT, 'agents', agentName);
      
      const child = spawn('bash', [runCleanPath, agentName, payloadPath], {
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
            const output = JSON.parse(stdout);
            resolve({
              success: true,
              output: output,
              stdout: stdout,
              stderr: stderr
            });
          } catch (error) {
            resolve({
              success: false,
              error: `Failed to parse output: ${error.message}`,
              stdout: stdout,
              stderr: stderr
            });
          }
        } else {
          resolve({
            success: false,
            error: `Process exited with code ${code}`,
            stdout: stdout,
            stderr: stderr
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          stdout: stdout,
          stderr: stderr
        });
      });
    });
  }

  logAgentExecution(agentName, input, output, metadata) {
    switch (agentName) {
      case 'context':
        this.logger.logContext(agentName, input, output, metadata);
        break;
      case 'prompting':
        this.logger.logPrompt(agentName, input, output, metadata);
        break;
      case 'rules':
        this.logger.logRules(agentName, input, output, metadata);
        break;
      default:
        console.warn(`⚠️  Unknown agent type: ${agentName}, logging as context`);
        this.logger.logContext(agentName, input, output, metadata);
    }
  }

  async runRestructureAnalysis() {
    console.log('🔍 Running restructure analysis with MCP agents...');
    
    const analysisSteps = [
      {
        agent: 'context',
        payload: 'payloads/restructure-analysis-payload.json',
        description: 'Analyzing project structure'
      },
      {
        agent: 'prompting',
        payload: 'payloads/restructure-plan-payload.json',
        description: 'Generating restructure plan'
      },
      {
        agent: 'rules',
        payload: 'payloads/rules-test-payload.json',
        description: 'Validating policies'
      }
    ];

    const results = [];
    
    for (const step of analysisSteps) {
      console.log(`\n📋 Step: ${step.description}`);
      const result = await this.runAgent(step.agent, step.payload, {
        step: step.description,
        analysis_type: 'restructure'
      });
      
      if (result) {
        results.push({
          step: step.description,
          agent: step.agent,
          result: result
        });
      }
    }

    // Generar reporte final
    console.log('\n📊 Generating analysis report...');
    const report = this.logger.generateReport();
    
    return {
      results: results,
      report: report
    };
  }

  async runBenchmarkWithLogging() {
    console.log('🏃 Running benchmark with context logging...');
    
    const agents = ['context', 'prompting', 'rules'];
    const results = [];
    
    for (const agent of agents) {
      console.log(`\n📈 Benchmarking ${agent}...`);
      
      const payloadPath = `payloads/${agent}-test-payload.json`;
      const iterations = 3; // Reducido para logging
      
      for (let i = 0; i < iterations; i++) {
        const result = await this.runAgent(agent, payloadPath, {
          iteration: i + 1,
          total_iterations: iterations,
          benchmark: true
        });
        
        if (result) {
          results.push({
            agent: agent,
            iteration: i + 1,
            result: result
          });
        }
      }
    }
    
    // Generar reporte de benchmark
    const report = this.logger.generateReport();
    
    return {
      benchmark_results: results,
      report: report
    };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MCPAgentRunner();
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      runner.runRestructureAnalysis()
        .then(result => {
          console.log('\n✅ Analysis completed');
          console.log('📊 Report generated in .reports/restructure-logs/');
        })
        .catch(error => {
          console.error('❌ Analysis failed:', error);
          process.exit(1);
        });
      break;
      
    case 'benchmark':
      runner.runBenchmarkWithLogging()
        .then(result => {
          console.log('\n✅ Benchmark completed');
          console.log('📊 Report generated in .reports/restructure-logs/');
        })
        .catch(error => {
          console.error('❌ Benchmark failed:', error);
          process.exit(1);
        });
      break;
      
    case 'agent':
      const agentName = process.argv[3];
      const payloadPath = process.argv[4];
      
      if (!agentName || !payloadPath) {
        console.error('Usage: node tools/run-clean-with-logging.mjs agent <agent-name> <payload-path>');
        process.exit(1);
      }
      
      runner.runAgent(agentName, payloadPath)
        .then(result => {
          if (result) {
            console.log('✅ Agent execution completed and logged');
          } else {
            console.error('❌ Agent execution failed');
            process.exit(1);
          }
        })
        .catch(error => {
          console.error('❌ Agent execution error:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node tools/run-clean-with-logging.mjs analyze');
      console.log('  node tools/run-clean-with-logging.mjs benchmark');
      console.log('  node tools/run-clean-with-logging.mjs agent <agent-name> <payload-path>');
      break;
  }
}

export default MCPAgentRunner;
