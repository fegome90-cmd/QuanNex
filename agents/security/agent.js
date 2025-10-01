#!/usr/bin/env node
/**
 * @fileoverview Security Agent - Wrapper del agente de seguridad
 * @description Wrapper que valida entrada, llama al server y valida salida
 */

import SecurityAgent from './server.js';
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
    target_path: {
      type: 'string',
      description: 'Ruta del directorio a escanear'
    },
    check_mode: {
      type: 'string',
      enum: ['scan', 'validate', 'audit'],
      description: 'Modo de verificación'
    },
    policy_refs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Referencias a políticas de seguridad'
    },
    scan_depth: {
      type: 'number',
      minimum: 1,
      maximum: 5,
      description: 'Profundidad de escaneo recursivo'
    }
  },
  required: ['target_path', 'check_mode']
};

// Schema de salida
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    schema_version: { type: 'string' },
    agent_version: { type: 'string' },
    security_report: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            total_findings: { type: 'number' },
            secrets_found: { type: 'number' },
            vulnerabilities_found: { type: 'number' },
            compliance_score: { type: 'number' },
            severity_breakdown: {
              type: 'object',
              properties: {
                high: { type: 'number' },
                medium: { type: 'number' },
                low: { type: 'number' }
              }
            }
          }
        },
        findings: { type: 'array' },
        recommendations: { type: 'array' }
      }
    },
    stats: {
      type: 'object',
      properties: {
        files_scanned: { type: 'number' },
        secrets_found: { type: 'number' },
        vulnerabilities_found: { type: 'number' },
        compliance_score: { type: 'number' }
      }
    },
    trace: { type: 'array', items: { type: 'string' } }
  },
  required: [
    'schema_version',
    'agent_version',
    'security_report',
    'stats',
    'trace'
  ]
};

class SecurityAgentWrapper {
  constructor() {
    this.agent = new SecurityAgent();
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

    if (!input.check_mode) {
      errors.push('check_mode es requerido');
    } else if (!['scan', 'validate', 'audit'].includes(input.check_mode)) {
      errors.push("check_mode debe ser 'scan', 'validate' o 'audit'");
    }

    // Validar tipos
    if (
      input.scan_depth &&
      (typeof input.scan_depth !== 'number' ||
        input.scan_depth < 1 ||
        input.scan_depth > 5)
    ) {
      errors.push('scan_depth debe ser un número entre 1 y 5');
    }

    if (input.policy_refs && !Array.isArray(input.policy_refs)) {
      errors.push('policy_refs debe ser un array');
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

    if (!output.security_report) {
      errors.push('security_report es requerido en la salida');
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
          error: `security.agent:error:${inputErrors.join(', ')}`,
          trace: ['security.agent:error']
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
          error: `security.agent:error:${outputErrors.join(', ')}`,
          trace: ['security.agent:error']
        };
      }

      return result;
    } catch (error) {
      return {
        schema_version: '1.0.0',
        agent_version: '1.0.0',
        error: `security.agent:error:${error.message}`,
        trace: ['security.agent:error']
      };
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new SecurityAgentWrapper();
  const input = JSON.parse(process.argv[2] || '{}');

  agent
    .process(input)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error(
        JSON.stringify(
          {
            schema_version: '1.0.0',
            agent_version: '1.0.0',
            error: `security.agent:error:${error.message}`,
            trace: ['security.agent:error']
          },
          null,
          2
        )
      );
      process.exit(1);
    });
}

export default SecurityAgentWrapper;
