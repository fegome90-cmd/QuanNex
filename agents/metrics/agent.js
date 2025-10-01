#!/usr/bin/env node
/**
 * @fileoverview Metrics Agent - Wrapper del agente de métricas
 * @description Wrapper que valida entrada, llama al server y valida salida
 */

import MetricsAgent from './server-simple.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');

// Schema de entrada
const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    target_path: { type: 'string', description: 'Ruta del directorio a analizar' },
    metric_types: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['performance', 'coverage', 'quality', 'complexity']
      },
      description: 'Tipos de métricas a recopilar'
    },
    scan_depth: {
      type: 'number',
      minimum: 1,
      maximum: 5,
      description: 'Profundidad de escaneo recursivo'
    },
    include_tests: {
      type: 'boolean',
      description: 'Incluir análisis de tests y cobertura'
    }
  },
  required: ['target_path']
};

// Schema de salida
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    schema_version: { type: 'string' },
    agent_version: { type: 'string' },
    metrics_report: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            files_analyzed: { type: 'number' },
            functions_analyzed: { type: 'number' },
            lines_analyzed: { type: 'number' },
            tests_found: { type: 'number' },
            coverage_percentage: { type: 'number' }
          }
        },
        performance: { type: 'object' },
        coverage: { type: 'object' },
        quality: { type: 'object' },
        complexity: { type: 'object' },
        recommendations: { type: 'array' }
      }
    },
    stats: {
      type: 'object',
      properties: {
        files_analyzed: { type: 'number' },
        functions_analyzed: { type: 'number' },
        lines_analyzed: { type: 'number' },
        tests_found: { type: 'number' },
        coverage_percentage: { type: 'number' }
      }
    },
    trace: { type: 'array', items: { type: 'string' } }
  },
  required: ['schema_version', 'agent_version', 'metrics_report', 'stats', 'trace']
};

class MetricsAgentWrapper {
  constructor() {
    this.agent = new MetricsAgent();
  }

  /**
   * Validar entrada contra schema
   */
  validateInput(input) {
    const errors = [];

    // Validar propiedades requeridas
    if (!input.target_path) {
      errors.push('target_path es requerido');
    }

    // Validar tipos
    if (input.scan_depth && (typeof input.scan_depth !== 'number' || input.scan_depth < 1 || input.scan_depth > 5)) {
      errors.push('scan_depth debe ser un número entre 1 y 5');
    }

    if (input.metric_types && !Array.isArray(input.metric_types)) {
      errors.push('metric_types debe ser un array');
    } else if (input.metric_types) {
      const validTypes = ['performance', 'coverage', 'quality', 'complexity'];
      const invalidTypes = input.metric_types.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        errors.push(`metric_types contiene tipos inválidos: ${invalidTypes.join(', ')}`);
      }
    }

    if (input.include_tests && typeof input.include_tests !== 'boolean') {
      errors.push('include_tests debe ser un booleano');
    }

    return errors;
  }

  /**
   * Validar salida contra schema
   */
  validateOutput(output) {
    const errors = [];

    if (!output.schema_version) {
      errors.push('schema_version es requerido en la salida');
    }

    if (!output.agent_version) {
      errors.push('agent_version es requerido en la salida');
    }

    if (!output.metrics_report) {
      errors.push('metrics_report es requerido en la salida');
    }

    if (!output.stats) {
      errors.push('stats es requerido en la salida');
    }

    if (!output.trace || !Array.isArray(output.trace)) {
      errors.push('trace debe ser un array en la salida');
    }

    return errors;
  }

  /**
   * Procesar entrada del agente
   */
  async process(input) {
    try {
      // Validar entrada
      const inputErrors = this.validateInput(input);
      if (inputErrors.length > 0) {
        return {
          schema_version: '1.0.0',
          agent_version: '1.0.0',
          error: `metrics.agent:error:${inputErrors.join(', ')}`,
          trace: ['metrics.agent:error']
        };
      }

      // Procesar con el server
      const result = await this.agent.process(input);

      // Validar salida
      const outputErrors = this.validateOutput(result);
      if (outputErrors.length > 0) {
        return {
          schema_version: '1.0.0',
          agent_version: '1.0.0',
          error: `metrics.agent:error:${outputErrors.join(', ')}`,
          trace: ['metrics.agent:error']
        };
      }

      return result;
    } catch (error) {
      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        error: `metrics.agent:error:${error.message}`,
        trace: ['metrics.agent:error']
      };
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new MetricsAgentWrapper();
  const input = JSON.parse(process.argv[2] || '{}');

  agent.process(input)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error(JSON.stringify({
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        error: `metrics.agent:error:${error.message}`,
        trace: ['metrics.agent:error']
      }, null, 2));
      process.exit(1);
    });
}

export default MetricsAgentWrapper;
