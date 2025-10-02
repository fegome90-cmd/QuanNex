#!/usr/bin/env node
/**
 * Logger estructurado con redacción automática de secretos
 */
import { redactSecrets } from './secrets/redact.js';

/**
 * Log JSON con redacción automática de secretos
 * @param {object} event - Evento a loggear
 */
export function logJSON(event) {
  const safe = JSON.parse(JSON.stringify(event));           // copia defensiva
  safe.args && (safe.args = redactSecrets(safe.args));      // tool args
  safe.res && (safe.res = redactSecrets(safe.res));         // tool results
  safe.err && (safe.err = redactSecrets(String(safe.err))); // errores
  
  // Redactar cualquier campo que pueda contener secretos
  if (safe.payload) {
    safe.payload = redactSecrets(safe.payload);
  }
  
  if (safe.data) {
    safe.data = redactSecrets(safe.data);
  }
  
  if (safe.context) {
    safe.context = redactSecrets(safe.context);
  }
  
  process.stdout.write(JSON.stringify(safe) + '\n');
}

/**
 * Log de error con redacción
 * @param {string} message - Mensaje de error
 * @param {any} data - Datos adicionales
 */
export function logError(message, data = null) {
  const event = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: redactSecrets(message),
    data: data ? redactSecrets(data) : null
  };
  
  logJSON(event);
}

/**
 * Log de información con redacción
 * @param {string} message - Mensaje informativo
 * @param {any} data - Datos adicionales
 */
export function logInfo(message, data = null) {
  const event = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: redactSecrets(message),
    data: data ? redactSecrets(data) : null
  };
  
  logJSON(event);
}

/**
 * Log de debug con redacción
 * @param {string} message - Mensaje de debug
 * @param {any} data - Datos adicionales
 */
export function logDebug(message, data = null) {
  const event = {
    timestamp: new Date().toISOString(),
    level: 'debug',
    message: redactSecrets(message),
    data: data ? redactSecrets(data) : null
  };
  
  logJSON(event);
}

/**
 * Log de seguridad con redacción especial
 * @param {string} action - Acción de seguridad
 * @param {any} context - Contexto de la acción
 */
export function logSecurity(action, context = null) {
  const event = {
    timestamp: new Date().toISOString(),
    level: 'security',
    action: redactSecrets(action),
    context: context ? redactSecrets(context) : null
  };
  
  logJSON(event);
}

export default {
  logJSON,
  logError,
  logInfo,
  logDebug,
  logSecurity
};
