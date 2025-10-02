/**
 * Log Sanitizer - GAP-003 Implementation
 * Sanitiza logs para evitar exposición de información sensible
 */

// Patrones de información sensible
const SENSITIVE_PATTERNS = [
  // Credenciales y autenticación
  { pattern: /password\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'password=***' },
  { pattern: /token\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'token=***' },
  { pattern: /key\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'key=***' },
  { pattern: /secret\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'secret=***' },
  { pattern: /credential\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'credential=***' },
  { pattern: /auth\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'auth=***' },
  
  // Datos personales
  { pattern: /email\s*[:=]\s*["']?[^"'\s@]+@[^"'\s]+\.[^"'\s]+["']?/gi, replacement: 'email=***' },
  { pattern: /phone\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'phone=***' },
  { pattern: /ssn\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'ssn=***' },
  
  // Cookies y sesiones
  { pattern: /cookie\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'cookie=***' },
  { pattern: /session\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'session=***' },
  
  // Headers sensibles
  { pattern: /authorization\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'authorization=***' },
  { pattern: /x-api-key\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'x-api-key=***' },
  { pattern: /x-auth-token\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'x-auth-token=***' }
];

/**
 * Sanitiza un objeto para logging
 * @param {any} obj - Objeto a sanitizar
 * @param {number} maxDepth - Profundidad máxima de recursión
 * @param {number} currentDepth - Profundidad actual
 * @returns {any} Objeto sanitizado
 */
export function sanitizeLogObject(obj, maxDepth = 3, currentDepth = 0) {
  // Limitar profundidad para evitar bucles infinitos
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }
  
  // Manejar valores primitivos
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  // Manejar arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogObject(item, maxDepth, currentDepth + 1));
  }
  
  // Manejar objetos
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitizar la clave si es sensible
      const sanitizedKey = sanitizeString(key);
      
      // Sanitizar el valor
      sanitized[sanitizedKey] = sanitizeLogObject(value, maxDepth, currentDepth + 1);
    }
    return sanitized;
  }
  
  return '[Unknown Type]';
}

/**
 * Sanitiza una cadena de texto
 * @param {string} str - Cadena a sanitizar
 * @returns {string} Cadena sanitizada
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  let sanitized = str;
  
  // Aplicar patrones de sanitización
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  
  return sanitized;
}

/**
 * Sanitiza un objeto JSON para logging
 * @param {any} obj - Objeto a sanitizar
 * @param {number} spaces - Espacios para indentación
 * @returns {string} JSON sanitizado
 */
export function sanitizeJsonLog(obj, spaces = 2) {
  try {
    const sanitized = sanitizeLogObject(obj);
    return JSON.stringify(sanitized, null, spaces);
  } catch (error) {
    return `[Error sanitizing log: ${error.message}]`;
  }
}

/**
 * Función helper para logging seguro
 * @param {string} level - Nivel de log (log, error, warn, info, debug)
 * @param {string} message - Mensaje base
 * @param {any} data - Datos a sanitizar
 */
export function safeLog(level, message, data = null) {
  const sanitizedMessage = sanitizeString(message);
  
  if (data !== null) {
    const sanitizedData = sanitizeLogObject(data);
    console[level](sanitizedMessage, sanitizedData);
  } else {
    console[level](sanitizedMessage);
  }
}

/**
 * Función helper para logging de errores seguro
 * @param {string} message - Mensaje de error
 * @param {any} error - Error a sanitizar
 */
export function safeErrorLog(message, error = null) {
  const sanitizedMessage = sanitizeString(message);
  
  if (error !== null) {
    const sanitizedError = sanitizeLogObject(error);
    console.error(sanitizedMessage, sanitizedError);
  } else {
    console.error(sanitizedMessage);
  }
}

/**
 * Función helper para logging de salida segura
 * @param {any} output - Salida a sanitizar
 */
export function safeOutputLog(output) {
  const sanitized = sanitizeLogObject(output);
  console.log(JSON.stringify(sanitized, null, 2));
}

export default {
  sanitizeLogObject,
  sanitizeString,
  sanitizeJsonLog,
  safeLog,
  safeErrorLog,
  safeOutputLog
};
