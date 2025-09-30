#!/usr/bin/env node

/**
 * Agent TaskDB Contracts - Contratos de I/O para integración
 * PR-L: Integración agentes ↔ TaskDB (TaskKernel)
 * 
 * Define y valida contratos de entrada y salida para la integración
 * entre agentes y la base de datos de tareas
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Contratos de I/O por agente
const AGENT_CONTRACTS = {
  context: {
    input: {
      required: ['action', 'data'],
      optional: ['task_id', 'project_id', 'metadata'],
      schema: {
        action: { type: 'string', enum: ['process', 'analyze', 'extract'] },
        data: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1 },
            maxTokens: { type: 'number', minimum: 1, maximum: 4000 },
            context: { type: 'string' },
            options: { type: 'object' }
          }
        },
        task_id: { type: 'string', format: 'uuid' },
        project_id: { type: 'string', format: 'uuid' },
        metadata: { type: 'object' }
      }
    },
    output: {
      required: ['success', 'timestamp', 'result'],
      optional: ['task_id', 'metadata', 'performance'],
      schema: {
        success: { type: 'boolean' },
        timestamp: { type: 'string', format: 'date-time' },
        result: {
          type: 'object',
          required: ['processed_text', 'tokens_used'],
          properties: {
            processed_text: { type: 'string' },
            tokens_used: { type: 'number', minimum: 0 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            entities: { type: 'array' },
            sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] }
          }
        },
        task_id: { type: 'string', format: 'uuid' },
        metadata: { type: 'object' },
        performance: {
          type: 'object',
          properties: {
            duration: { type: 'number', minimum: 0 },
            cpu_usage: { type: 'number', minimum: 0 },
            memory_usage: { type: 'number', minimum: 0 }
          }
        }
      }
    }
  },
  
  prompting: {
    input: {
      required: ['action', 'data'],
      optional: ['task_id', 'project_id', 'metadata'],
      schema: {
        action: { type: 'string', enum: ['generate', 'optimize', 'validate'] },
        data: {
          type: 'object',
          required: ['prompt', 'context'],
          properties: {
            prompt: { type: 'string', minLength: 1 },
            context: { type: 'string' },
            style: { type: 'string', enum: ['formal', 'casual', 'technical'] },
            length: { type: 'string', enum: ['short', 'medium', 'long'] },
            options: { type: 'object' }
          }
        },
        task_id: { type: 'string', format: 'uuid' },
        project_id: { type: 'string', format: 'uuid' },
        metadata: { type: 'object' }
      }
    },
    output: {
      required: ['success', 'timestamp', 'result'],
      optional: ['task_id', 'metadata', 'performance'],
      schema: {
        success: { type: 'boolean' },
        timestamp: { type: 'string', format: 'date-time' },
        result: {
          type: 'object',
          required: ['generated_prompt', 'quality_score'],
          properties: {
            generated_prompt: { type: 'string' },
            quality_score: { type: 'number', minimum: 0, maximum: 1 },
            suggestions: { type: 'array' },
            alternatives: { type: 'array' },
            metadata: { type: 'object' }
          }
        },
        task_id: { type: 'string', format: 'uuid' },
        metadata: { type: 'object' },
        performance: {
          type: 'object',
          properties: {
            duration: { type: 'number', minimum: 0 },
            cpu_usage: { type: 'number', minimum: 0 },
            memory_usage: { type: 'number', minimum: 0 }
          }
        }
      }
    }
  },
  
  rules: {
    input: {
      required: ['action', 'data'],
      optional: ['task_id', 'project_id', 'metadata'],
      schema: {
        action: { type: 'string', enum: ['apply', 'validate', 'generate'] },
        data: {
          type: 'object',
          required: ['rules', 'input'],
          properties: {
            rules: { type: 'array', items: { type: 'string' } },
            input: { type: 'string', minLength: 1 },
            context: { type: 'string' },
            strict_mode: { type: 'boolean' },
            options: { type: 'object' }
          }
        },
        task_id: { type: 'string', format: 'uuid' },
        project_id: { type: 'string', format: 'uuid' },
        metadata: { type: 'object' }
      }
    },
    output: {
      required: ['success', 'timestamp', 'result'],
      optional: ['task_id', 'metadata', 'performance'],
      schema: {
        success: { type: 'boolean' },
        timestamp: { type: 'string', format: 'date-time' },
        result: {
          type: 'object',
          required: ['processed_input', 'applied_rules'],
          properties: {
            processed_input: { type: 'string' },
            applied_rules: { type: 'array' },
            violations: { type: 'array' },
            suggestions: { type: 'array' },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          }
        },
        task_id: { type: 'string', format: 'uuid' },
        metadata: { type: 'object' },
        performance: {
          type: 'object',
          properties: {
            duration: { type: 'number', minimum: 0 },
            cpu_usage: { type: 'number', minimum: 0 },
            memory_usage: { type: 'number', minimum: 0 }
          }
        }
      }
    }
  }
};

class AgentTaskDBContracts {
  constructor() {
    this.contracts = AGENT_CONTRACTS;
  }

  /**
   * Validar input de agente según contrato
   */
  validateInput(agentName, input) {
    const contract = this.contracts[agentName];
    if (!contract) {
      throw new Error(`Contrato no encontrado para agente: ${agentName}`);
    }

    const validation = this.validateAgainstSchema(input, contract.input.schema);
    if (!validation.valid) {
      throw new Error(`Input inválido para agente ${agentName}: ${validation.errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Validar output de agente según contrato
   */
  validateOutput(agentName, output) {
    const contract = this.contracts[agentName];
    if (!contract) {
      throw new Error(`Contrato no encontrado para agente: ${agentName}`);
    }

    const validation = this.validateAgainstSchema(output, contract.output.schema);
    if (!validation.valid) {
      throw new Error(`Output inválido para agente ${agentName}: ${validation.errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Validar contra esquema JSON
   */
  validateAgainstSchema(data, schema) {
    const errors = [];
    
    // Validar campos requeridos
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Campo requerido faltante: ${field}`);
        }
      }
    }

    // Validar propiedades
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          const fieldValidation = this.validateField(data[field], fieldSchema, field);
          if (!fieldValidation.valid) {
            errors.push(...fieldValidation.errors);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validar campo individual
   */
  validateField(value, schema, fieldName) {
    const errors = [];

    // Validar tipo
    if (schema.type) {
      const expectedType = schema.type;
      const actualType = this.getType(value);
      
      if (actualType !== expectedType) {
        errors.push(`${fieldName}: tipo esperado ${expectedType}, obtenido ${actualType}`);
      }
    }

    // Validar enum
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${fieldName}: valor debe ser uno de ${schema.enum.join(', ')}`);
    }

    // Validar string
    if (schema.type === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        errors.push(`${fieldName}: longitud mínima ${schema.minLength}`);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`${fieldName}: longitud máxima ${schema.maxLength}`);
      }
    }

    // Validar number
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${fieldName}: valor mínimo ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${fieldName}: valor máximo ${schema.maximum}`);
      }
    }

    // Validar array
    if (schema.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${fieldName}: debe ser array`);
      } else if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          const itemValidation = this.validateField(value[i], schema.items, `${fieldName}[${i}]`);
          if (!itemValidation.valid) {
            errors.push(...itemValidation.errors);
          }
        }
      }
    }

    // Validar object
    if (schema.type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`${fieldName}: debe ser objeto`);
      } else if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if (prop in value) {
            const propValidation = this.validateField(value[prop], propSchema, `${fieldName}.${prop}`);
            if (!propValidation.valid) {
              errors.push(...propValidation.errors);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Obtener tipo de valor
   */
  getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Generar ejemplo de input para agente
   */
  generateInputExample(agentName) {
    const contract = this.contracts[agentName];
    if (!contract) {
      throw new Error(`Contrato no encontrado para agente: ${agentName}`);
    }

    const example = {
      action: contract.input.schema.action.enum[0],
      data: {}
    };

    // Generar ejemplo de data basado en schema
    if (contract.input.schema.data.properties) {
      for (const [field, fieldSchema] of Object.entries(contract.input.schema.data.properties)) {
        if (fieldSchema.type === 'string') {
          example.data[field] = `ejemplo_${field}`;
        } else if (fieldSchema.type === 'number') {
          example.data[field] = fieldSchema.minimum || 1;
        } else if (fieldSchema.type === 'boolean') {
          example.data[field] = true;
        } else if (fieldSchema.type === 'array') {
          example.data[field] = ['ejemplo1', 'ejemplo2'];
        } else if (fieldSchema.type === 'object') {
          example.data[field] = {};
        }
      }
    }

    return example;
  }

  /**
   * Generar ejemplo de output para agente
   */
  generateOutputExample(agentName) {
    const contract = this.contracts[agentName];
    if (!contract) {
      throw new Error(`Contrato no encontrado para agente: ${agentName}`);
    }

    const example = {
      success: true,
      timestamp: new Date().toISOString(),
      result: {}
    };

    // Generar ejemplo de result basado en schema
    if (contract.output.schema.result.properties) {
      for (const [field, fieldSchema] of Object.entries(contract.output.schema.result.properties)) {
        if (fieldSchema.type === 'string') {
          example.result[field] = `resultado_${field}`;
        } else if (fieldSchema.type === 'number') {
          example.result[field] = fieldSchema.minimum || 0;
        } else if (fieldSchema.type === 'boolean') {
          example.result[field] = true;
        } else if (fieldSchema.type === 'array') {
          example.result[field] = ['item1', 'item2'];
        } else if (fieldSchema.type === 'object') {
          example.result[field] = {};
        }
      }
    }

    return example;
  }

  /**
   * Obtener contrato completo para agente
   */
  getContract(agentName) {
    const contract = this.contracts[agentName];
    if (!contract) {
      throw new Error(`Contrato no encontrado para agente: ${agentName}`);
    }

    return contract;
  }

  /**
   * Listar todos los agentes con contratos
   */
  listAgents() {
    return Object.keys(this.contracts);
  }

  /**
   * Generar documentación de contratos
   */
  generateDocumentation() {
    const docs = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      agents: {}
    };

    for (const [agentName, contract] of Object.entries(this.contracts)) {
      docs.agents[agentName] = {
        input: {
          required: contract.input.required,
          optional: contract.input.optional,
          example: this.generateInputExample(agentName)
        },
        output: {
          required: contract.output.required,
          optional: contract.output.optional,
          example: this.generateOutputExample(agentName)
        }
      };
    }

    return docs;
  }

  /**
   * Exportar contratos a archivo
   */
  exportContracts(outputFile) {
    const docs = this.generateDocumentation();
    writeFileSync(outputFile, JSON.stringify(docs, null, 2));
    console.log(`📄 Contratos exportados a: ${outputFile}`);
    return outputFile;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const contracts = new AgentTaskDBContracts();

  try {
    switch (command) {
      case 'list':
        const agents = contracts.listAgents();
        console.log('🤖 Agentes con contratos:');
        agents.forEach(agent => console.log(`  - ${agent}`));
        break;

      case 'validate':
        const agentName = process.argv[3];
        const data = JSON.parse(process.argv[4] || '{}');
        const type = process.argv[5] || 'input';
        
        if (type === 'input') {
          contracts.validateInput(agentName, data);
        } else {
          contracts.validateOutput(agentName, data);
        }
        console.log(`✅ ${type} válido para agente ${agentName}`);
        break;

      case 'example':
        const exampleAgent = process.argv[3];
        const exampleType = process.argv[4] || 'input';
        
        if (exampleType === 'input') {
          const example = contracts.generateInputExample(exampleAgent);
          console.log(JSON.stringify(example, null, 2));
        } else {
          const example = contracts.generateOutputExample(exampleAgent);
          console.log(JSON.stringify(example, null, 2));
        }
        break;

      case 'export':
        const outputFile = process.argv[3] || 'contracts.json';
        contracts.exportContracts(outputFile);
        break;

      default:
        console.log(`
Agent TaskDB Contracts - Contratos de I/O para integración

Comandos disponibles:
  list                    - Listar agentes con contratos
  validate <agent> <data> <type> - Validar input/output
  example <agent> <type>  - Generar ejemplo de input/output
  export [file]           - Exportar contratos a archivo

Uso: node tools/agent-taskdb-contracts.mjs <comando> [argumentos]
        `);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

export default AgentTaskDBContracts;
