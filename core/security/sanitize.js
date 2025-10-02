#!/usr/bin/env node
/**
 * Sanitización de entradas para prevenir inyección
 */
import { redactSecrets } from '../../tools/secrets/redact.js';

/**
 * Sanitiza una entrada de usuario
 * @param {any} input - Entrada a sanitizar
 * @returns {any} Entrada sanitizada
 */
export function sanitize(input) {
  if (typeof input === 'string') {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT_REMOVED]')
      .replace(/\$\{[^}]*\}/g, '[TEMPLATE_REMOVED]')
      .replace(/process\.env\.[A-Z_]+/g, '[ENV_VAR_REMOVED]')
      .replace(/\.\.\/\.\./g, '[PATH_TRAVERSAL_REMOVED]')
      .replace(/javascript:/gi, '[JAVASCRIPT_REMOVED]')
      .replace(/data:text\/html/gi, '[DATA_HTML_REMOVED]');
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        // Sanitizar strings
        let sanitizedValue = sanitize(value);
        
        // Redactar secretos si la clave sugiere que es sensible
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'api_key', 'private_key'];
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          sanitizedValue = '[REDACTED]';
        }
        
        sanitized[key] = sanitizedValue;
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Valida que una entrada no contenga patrones peligrosos
 * @param {any} input - Entrada a validar
 * @returns {object} Resultado de la validación
 */
export function validateInput(input) {
  const errors = [];
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  
  // Patrones peligrosos
  const dangerousPatterns = [
    { pattern: /<script/i, message: 'Script tags not allowed' },
    { pattern: /\$\{/g, message: 'Template injection not allowed' },
    { pattern: /process\.env/i, message: 'Environment variable access not allowed' },
    { pattern: /\.\.\/\.\./g, message: 'Path traversal not allowed' },
    { pattern: /javascript:/i, message: 'JavaScript URLs not allowed' },
    { pattern: /data:text\/html/i, message: 'Data HTML not allowed' }
  ];
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(inputStr)) {
      errors.push(message);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    sanitized: sanitize(input)
  };
}

/**
 * Sanitiza argumentos de herramientas
 * @param {object} args - Argumentos de la herramienta
 * @returns {object} Argumentos sanitizados
 */
export function sanitizeToolArgs(args) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(args)) {
    // Sanitizar el valor
    sanitized[key] = sanitize(value);
    
    // Redactar secretos adicionales
    sanitized[key] = redactSecrets(sanitized[key]);
  }
  
  return sanitized;
}

/**
 * Sanitiza resultados de herramientas
 * @param {any} result - Resultado de la herramienta
 * @returns {any} Resultado sanitizado
 */
export function sanitizeToolResult(result) {
  // Aplicar sanitización básica
  const sanitized = sanitize(result);
  
  // Aplicar redacción de secretos
  return redactSecrets(sanitized);
}

export default {
  sanitize,
  validateInput,
  sanitizeToolArgs,
  sanitizeToolResult
};
