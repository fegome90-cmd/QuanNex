/**
 * shared/utils/security.js
 * Utilidades de seguridad compartidas
 */

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = value.replace(/[<>\"'&]/g, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export function sanitizeLogObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'password' || key === 'token' || key === 'secret') {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = value.replace(/[<>\"'&]/g, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export function enforceAgentAuth(request) {
  // Validación básica de autenticación de agente
  if (!request || typeof request !== 'object') {
    return { allowed: false, reason: 'Invalid request object' };
  }
  
  // Verificar que tenga requestId
  if (!request.requestId) {
    return { allowed: false, reason: 'Missing requestId' };
  }
  
  // Verificar que tenga agent
  if (!request.agent) {
    return { allowed: false, reason: 'Missing agent' };
  }
  
  // Verificar que tenga capability
  if (!request.capability) {
    return { allowed: false, reason: 'Missing capability' };
  }
  
  return { allowed: true };
}

export function stripAuthToken(request) {
  if (!request || typeof request !== 'object') {
    return request;
  }
  
  const cleaned = { ...request };
  
  // Remover tokens sensibles
  delete cleaned.token;
  delete cleaned.authToken;
  delete cleaned.accessToken;
  delete cleaned.password;
  delete cleaned.secret;
  
  return cleaned;
}
