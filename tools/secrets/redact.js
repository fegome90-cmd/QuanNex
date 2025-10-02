#!/usr/bin/env node
/**
 * Redacción y sanitización de secretos
 * Redacta patrones comunes de secretos en cualquier string/objeto
 */

const SECRET_PATTERNS = [
  /sk_live_[A-Za-z0-9]{8,}/g,             // Stripe-like
  /ghp_[A-Za-z0-9]{20,}/g,                // GitHub tokens
  /AIza[0-9A-Za-z-_]{35}/g,               // Google API
  /(?<=aws_secret_access_key=)[A-Za-z0-9/+]{40}/gi,
  /bearer\s+[A-Za-z0-9\._\-]{10,}/gi,
  /password[^\\s]*/gi,
  /token[^\\s]*/gi,
  /secret[^\\s]*/gi,
  /key[^\\s]*/gi,
  /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
  /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g
];

/**
 * Redacta secretos en cualquier input
 * @param {any} input - String u objeto a redactar
 * @returns {any} Input con secretos redactados
 */
export function redactSecrets(input) {
  if (input == null) return input;
  
  if (typeof input === 'string') {
    return SECRET_PATTERNS.reduce((acc, rx) => acc.replace(rx, '[REDACTED]'), input);
  }
  
  if (typeof input === 'object') {
    const s = JSON.stringify(input);
    const redacted = SECRET_PATTERNS.reduce((acc, rx) => acc.replace(rx, '[REDACTED]'), s);
    try {
      return JSON.parse(redacted);
    } catch (e) {
      // Si no se puede parsear, devolver string redactado
      return redacted;
    }
  }
  
  return input;
}

/**
 * Redacta secretos en objetos de forma recursiva
 * @param {object} obj - Objeto a redactar
 * @returns {object} Objeto con secretos redactados
 */
export function redactObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return redactSecrets(obj);
  }
  
  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Redactar valores de claves sensibles
    if (lowerKey.includes('password') || 
        lowerKey.includes('token') || 
        lowerKey.includes('secret') || 
        lowerKey.includes('key') ||
        lowerKey.includes('auth')) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = redactSecrets(value);
    }
  }
  
  return redacted;
}

/**
 * Verifica si un string contiene secretos
 * @param {string} str - String a verificar
 * @returns {boolean} True si contiene secretos
 */
export function containsSecrets(str) {
  if (typeof str !== 'string') return false;
  return SECRET_PATTERNS.some(pattern => pattern.test(str));
}

export default {
  redactSecrets,
  redactObject,
  containsSecrets,
  SECRET_PATTERNS
};
