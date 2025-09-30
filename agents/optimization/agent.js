#!/usr/bin/env node
/**
 * @fileoverview Optimization Agent - Wrapper del agente de optimización
 * @description Wrapper que valida entrada, llama al server y valida salida
 */

import OptimizationAgent from './server.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');

// Schema de entrada
const INPUT_SCHEMA = {
  type: "object",
  properties: {
    target_path: { type: "string", description: "Ruta del directorio a optimizar" },
    optimization_types: { 
      type: "array", 
      items: { 
        type: "string",
        enum: ["performance", "maintainability", "readability", "security"]
      },
      description: "Tipos de optimizaciones a buscar"
    },
    scan_depth: { 
      type: "number", 
      minimum: 1, 
      maximum: 5,
      description: "Profundidad de escaneo recursivo"
    },
    auto_fix: {
      type: "boolean",
      description: "Aplicar correcciones automáticas cuando sea posible"
    }
  },
  required: ["target_path"]
};

// Schema de salida
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    schema_version: { type: "string" },
    agent_version: { type: "string" },
    optimization_report: {
      type: "object",
      properties: {
        summary: {
          type: "object",
          properties: {
            total_optimizations: { type: "number" },
            performance_optimizations: { type: "number" },
            maintainability_optimizations: { type: "number" },
            readability_optimizations: { type: "number" },
            security_optimizations: { type: "number" },
            files_analyzed: { type: "number" }
          }
        },
        optimizations: {
          type: "object",
          properties: {
            performance: { type: "array" },
            maintainability: { type: "array" },
            readability: { type: "array" },
            security: { type: "array" }
          }
        },
        recommendations: { type: "array" }
      }
    },
    stats: {
      type: "object",
      properties: {
        files_analyzed: { type: "number" },
        optimizations_found: { type: "number" },
        refactors_suggested: { type: "number" },
        performance_improvements: { type: "number" }
      }
    },
    trace: { type: "array", items: { type: "string" } }
  },
  required: ["schema_version", "agent_version", "optimization_report", "stats", "trace"]
};

class OptimizationAgentWrapper {
  constructor() {
    this.agent = new OptimizationAgent();
  }

  /**
   * Validar entrada contra schema
   */
  validateInput(input) {
    const errors = [];
    
    // Validar propiedades requeridas
    if (!input.target_path) {
      errors.push("target_path es requerido");
    }

    // Validar tipos
    if (input.scan_depth && (typeof input.scan_depth !== 'number' || input.scan_depth < 1 || input.scan_depth > 5)) {
      errors.push("scan_depth debe ser un número entre 1 y 5");
    }

    if (input.optimization_types && !Array.isArray(input.optimization_types)) {
      errors.push("optimization_types debe ser un array");
    } else if (input.optimization_types) {
      const validTypes = ['performance', 'maintainability', 'readability', 'security'];
      const invalidTypes = input.optimization_types.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        errors.push(`optimization_types contiene tipos inválidos: ${invalidTypes.join(', ')}`);
      }
    }

    if (input.auto_fix && typeof input.auto_fix !== 'boolean') {
      errors.push("auto_fix debe ser un booleano");
    }

    return errors;
  }

  /**
   * Validar salida contra schema
   */
  validateOutput(output) {
    const errors = [];
    
    if (!output.schema_version) {
      errors.push("schema_version es requerido en la salida");
    }
    
    if (!output.agent_version) {
      errors.push("agent_version es requerido en la salida");
    }
    
    if (!output.optimization_report) {
      errors.push("optimization_report es requerido en la salida");
    }
    
    if (!output.stats) {
      errors.push("stats es requerido en la salida");
    }
    
    if (!output.trace || !Array.isArray(output.trace)) {
      errors.push("trace debe ser un array en la salida");
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
          schema_version: "1.0.0",
          agent_version: "1.0.0",
          error: `optimization.agent:error:${inputErrors.join(', ')}`,
          trace: ["optimization.agent:error"]
        };
      }

      // Procesar con el server
      const result = await this.agent.process(input);

      // Validar salida
      const outputErrors = this.validateOutput(result);
      if (outputErrors.length > 0) {
        return {
          schema_version: "1.0.0",
          agent_version: "1.0.0",
          error: `optimization.agent:error:${outputErrors.join(', ')}`,
          trace: ["optimization.agent:error"]
        };
      }

      return result;

    } catch (error) {
      return {
        schema_version: "1.0.0",
        agent_version: "1.0.0",
        error: `optimization.agent:error:${error.message}`,
        trace: ["optimization.agent:error"]
      };
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new OptimizationAgentWrapper();
  const input = JSON.parse(process.argv[2] || '{}');
  
  agent.process(input)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error(JSON.stringify({
        schema_version: "1.0.0",
        agent_version: "1.0.0",
        error: `optimization.agent:error:${error.message}`,
        trace: ["optimization.agent:error"]
      }, null, 2));
      process.exit(1);
    });
}

export default OptimizationAgentWrapper;
