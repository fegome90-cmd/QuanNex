/**
 * Agent Authentication Middleware - GAP-004 Implementation
 * Middleware para autenticación automática entre agentes
 */

import { generateAgentToken, validateAgentCommunication, logAuthentication } from './jwt-auth.js';

/**
 * Middleware para autenticar comunicación entre agentes
 */
export function withAuthentication(sourceAgent, targetAgent, action, handler) {
  return async function(request, response, next) {
    try {
      // Extraer token del header Authorization
      const authHeader = request.headers?.authorization || request.authorization;
      const token = authHeader?.replace('Bearer ', '') || request.token;
      
      if (!token) {
        logAuthentication(sourceAgent, action, false, { error: 'No token provided' });
        return {
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        };
      }
      
      // Validar comunicación entre agentes
      const validation = validateAgentCommunication(sourceAgent, targetAgent, action, token);
      
      if (!validation.valid) {
        logAuthentication(sourceAgent, action, false, { error: validation.error });
        return {
          error: validation.error,
          code: 'AUTH_INVALID'
        };
      }
      
      logAuthentication(sourceAgent, action, true, { 
        targetAgent, 
        action,
        permissions: validation.permissions 
      });
      
      // Ejecutar handler original con contexto de autenticación
      const authContext = {
        sourceAgent: validation.sourceAgent,
        targetAgent: validation.targetAgent,
        action: validation.action,
        permissions: validation.permissions
      };
      
      return await handler(request, response, authContext);
      
    } catch (error) {
      logAuthentication(sourceAgent, action, false, { error: error.message });
      return {
        error: `Authentication error: ${error.message}`,
        code: 'AUTH_ERROR'
      };
    }
  };
}

/**
 * Decorador para agentes que requieren autenticación
 */
export function requireAuth(agentId, action) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const [request] = args;
      
      // Generar token automáticamente si no existe
      if (!request.token && !request.headers?.authorization) {
        request.token = generateAgentToken(agentId, 'system', action);
        request.headers = request.headers || {};
        request.headers.authorization = `Bearer ${request.token}`;
      }
      
      return await originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Función helper para autenticar entrada de agente
 */
export function authenticateAgentInput(agentId, input) {
  try {
    // Si el input contiene un token, validarlo
    if (input.token) {
      const validation = validateAgentCommunication(agentId, 'system', 'read', input.token);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      return { authenticated: true, context: validation };
    }
    
    // Si no hay token, generar uno automáticamente
    const token = generateAgentToken(agentId, 'system', 'read');
    return { 
      authenticated: true, 
      token: token,
      context: { sourceAgent: agentId, targetAgent: 'system', action: 'read' }
    };
    
  } catch (error) {
    return { 
      authenticated: false, 
      error: error.message 
    };
  }
}

/**
 * Función helper para autenticar salida de agente
 */
export function authenticateAgentOutput(agentId, output) {
  try {
    // Generar token para la respuesta
    const token = generateAgentToken(agentId, 'system', 'write');
    
    return {
      ...output,
      _auth: {
        token: token,
        agentId: agentId,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    return {
      ...output,
      _auth: {
        error: error.message,
        agentId: agentId,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Middleware para comunicación segura entre agentes
 */
export function secureAgentCommunication(sourceAgent, targetAgent, action, data) {
  return new Promise(async (resolve, reject) => {
    try {
      // Generar token para la comunicación
      const token = generateAgentToken(sourceAgent, targetAgent, action);
      
      // Preparar datos con autenticación
      const secureData = {
        ...data,
        _auth: {
          token: token,
          sourceAgent: sourceAgent,
          targetAgent: targetAgent,
          action: action,
          timestamp: new Date().toISOString()
        }
      };
      
      // Log de comunicación
      logAuthentication(sourceAgent, action, true, { 
        targetAgent, 
        dataSize: JSON.stringify(data).length 
      });
      
      resolve(secureData);
      
    } catch (error) {
      logAuthentication(sourceAgent, action, false, { error: error.message });
      reject(error);
    }
  });
}

/**
 * Validador de entrada para agentes
 */
export function validateAuthenticatedInput(agentId, input) {
  const auth = authenticateAgentInput(agentId, input);
  
  if (!auth.authenticated) {
    throw new Error(`Authentication failed for agent ${agentId}: ${auth.error}`);
  }
  
  return auth.context;
}

/**
 * Preparador de salida para agentes
 */
export function prepareAuthenticatedOutput(agentId, output) {
  return authenticateAgentOutput(agentId, output);
}

export default {
  withAuthentication,
  requireAuth,
  authenticateAgentInput,
  authenticateAgentOutput,
  secureAgentCommunication,
  validateAuthenticatedInput,
  prepareAuthenticatedOutput
};
