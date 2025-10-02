#!/usr/bin/env node
/**
 * Middleware MCP para agentes
 * Intercepta y traza todas las operaciones de agentes
 */
import { createTrace, updateTrace, completeTrace } from './mcp-tracer.js';
import { signOperation, verifyOperationSignature } from './mcp-signer.js';
import { logSecurity } from './structured-logger.mjs';

/**
 * Middleware para envolver operaciones de agentes con trazabilidad MCP
 * @param {string} agentId - ID del agente
 * @param {Function} operation - Función de la operación
 * @param {object} context - Contexto de la operación
 * @returns {Promise<any>} Resultado de la operación
 */
export async function withMCPTrace(agentId, operation, context) {
  const traceId = createTrace('agent_operation', {
    agentId,
    input: context.input,
    metadata: context.metadata || {}
  }, agentId);
  
  try {
    // Actualizar traza con estado "running"
    updateTrace(traceId, {
      status: 'running',
      startedAt: new Date().toISOString()
    });
    
    // Ejecutar la operación
    const result = await operation(context.input);
    
    // Completar traza con éxito
    completeTrace(traceId, result);
    
    logSecurity('mcp_operation_success', {
      agentId,
      traceId,
      operation: 'agent_operation'
    });
    
    return {
      result,
      traceId,
      success: true
    };
    
  } catch (error) {
    // Completar traza con error
    completeTrace(traceId, null, error);
    
    logSecurity('mcp_operation_error', {
      agentId,
      traceId,
      error: error.message,
      operation: 'agent_operation'
    });
    
    return {
      error: error.message,
      traceId,
      success: false
    };
  }
}

/**
 * Middleware para operaciones con firma MCP
 * @param {string} agentId - ID del agente
 * @param {Function} operation - Función de la operación
 * @param {object} context - Contexto de la operación
 * @param {string} signature - Firma de la operación
 * @returns {Promise<any>} Resultado de la operación
 */
export async function withMCPSignature(agentId, operation, context, signature) {
  // Verificar firma antes de ejecutar
  const isValidSignature = await verifyOperationSignature('agent_operation', context, signature);
  
  if (!isValidSignature) {
    logSecurity('mcp_signature_invalid', {
      agentId,
      signature: signature.substring(0, 8) + '...'
    });
    
    throw new Error('Invalid MCP signature');
  }
  
  // Ejecutar con trazabilidad
  return await withMCPTrace(agentId, operation, context);
}

/**
 * Middleware para operaciones de herramientas
 * @param {string} toolName - Nombre de la herramienta
 * @param {Function} toolFunction - Función de la herramienta
 * @param {object} args - Argumentos de la herramienta
 * @returns {Promise<any>} Resultado de la herramienta
 */
export async function withMCPTool(toolName, toolFunction, args) {
  const traceId = createTrace('tool_execution', {
    toolName,
    args: args,
    metadata: {
      timestamp: new Date().toISOString(),
      agent: 'system'
    }
  }, 'system');
  
  try {
    // Actualizar traza
    updateTrace(traceId, {
      status: 'running',
      startedAt: new Date().toISOString()
    });
    
    // Ejecutar herramienta
    const result = await toolFunction(args);
    
    // Completar traza
    completeTrace(traceId, result);
    
    logSecurity('mcp_tool_success', {
      toolName,
      traceId
    });
    
    return {
      result,
      traceId,
      success: true
    };
    
  } catch (error) {
    // Completar traza con error
    completeTrace(traceId, null, error);
    
    logSecurity('mcp_tool_error', {
      toolName,
      traceId,
      error: error.message
    });
    
    return {
      error: error.message,
      traceId,
      success: false
    };
  }
}

/**
 * Middleware para operaciones de orquestador
 * @param {string} workflowId - ID del workflow
 * @param {Function} workflowFunction - Función del workflow
 * @param {object} config - Configuración del workflow
 * @returns {Promise<any>} Resultado del workflow
 */
export async function withMCPWorkflow(workflowId, workflowFunction, config) {
  const traceId = createTrace('workflow_execution', {
    workflowId,
    config: config,
    metadata: {
      timestamp: new Date().toISOString(),
      agent: 'orchestrator'
    }
  }, 'orchestrator');
  
  try {
    // Actualizar traza
    updateTrace(traceId, {
      status: 'running',
      startedAt: new Date().toISOString()
    });
    
    // Ejecutar workflow
    const result = await workflowFunction(config);
    
    // Completar traza
    completeTrace(traceId, result);
    
    logSecurity('mcp_workflow_success', {
      workflowId,
      traceId
    });
    
    return {
      result,
      traceId,
      success: true
    };
    
  } catch (error) {
    // Completar traza con error
    completeTrace(traceId, null, error);
    
    logSecurity('mcp_workflow_error', {
      workflowId,
      traceId,
      error: error.message
    });
    
    return {
      error: error.message,
      traceId,
      success: false
    };
  }
}

/**
 * Decorador para funciones de agentes
 * @param {string} agentId - ID del agente
 * @returns {Function} Decorador de función
 */
export function mcpTraced(agentId) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      return await withMCPTrace(agentId, originalMethod.bind(this), {
        input: args,
        metadata: {
          method: propertyKey,
          timestamp: new Date().toISOString()
        }
      });
    };
    
    return descriptor;
  };
}

/**
 * Decorador para funciones de herramientas
 * @param {string} toolName - Nombre de la herramienta
 * @returns {Function} Decorador de función
 */
export function mcpTooled(toolName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      return await withMCPTool(toolName, originalMethod.bind(this), args);
    };
    
    return descriptor;
  };
}

export default {
  withMCPTrace,
  withMCPSignature,
  withMCPTool,
  withMCPWorkflow,
  mcpTraced,
  mcpTooled
};
