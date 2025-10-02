/**
 * Tool Base Class - Anatomía estándar para herramientas Quannex
 * Implementa guardrails de I/O, try/catch estructurado y logging
 */

export class ToolBase {
  constructor(name, description, parameters = {}) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.logger = null; // Se inicializará con el logger centralizado
  }

  /**
   * Estructura estándar de respuesta de herramienta
   * @param {boolean} success - Si la operación fue exitosa
   * @param {any} data - Datos de respuesta (solo lo necesario)
   * @param {string} error - Mensaje de error si aplica
   * @param {Object} metadata - Metadata adicional (opcional)
   * @returns {Object} Respuesta estructurada
   */
  createResponse(success, data = null, error = null, metadata = {}) {
    const response = {
      success,
      timestamp: new Date().toISOString(),
      tool: this.name,
      ...metadata,
    };

    if (success) {
      response.data = data;
    } else {
      response.error = error;
    }

    return response;
  }

  /**
   * Wrapper estándar para ejecutar herramientas con try/catch
   * @param {Function} operation - Operación a ejecutar
   * @param {Object} input - Input de la herramienta
   * @param {Object} context - Contexto adicional
   * @returns {Object} Respuesta estructurada
   */
  async executeWithGuardrails(operation, input, context = {}) {
    const startTime = Date.now();

    try {
      // Validar input básico
      const validationError = this.validateInput(input);
      if (validationError) {
        return this.createResponse(false, null, `Input validation failed: ${validationError}`);
      }

      // Ejecutar operación
      const result = await operation(input, context);

      // Validar output básico
      const outputValidationError = this.validateOutput(result);
      if (outputValidationError) {
        return this.createResponse(
          false,
          null,
          `Output validation failed: ${outputValidationError}`
        );
      }

      // Log exitoso
      this.logToolCall({
        input,
        output: result,
        duration: Date.now() - startTime,
        success: true,
      });

      return this.createResponse(true, result, null, {
        duration_ms: Date.now() - startTime,
      });
    } catch (error) {
      // Log de error
      this.logToolCall({
        input,
        error: error.message,
        duration: Date.now() - startTime,
        success: false,
      });

      return this.createResponse(false, null, `${this.name} failed: ${error.message}`, {
        duration_ms: Date.now() - startTime,
        error_type: error.constructor.name,
      });
    }
  }

  /**
   * Validación básica de input (sobrescribir en subclases)
   * @param {Object} input - Input a validar
   * @returns {string|null} Error message o null si es válido
   */
  validateInput(input) {
    if (!input || typeof input !== 'object') {
      return 'Input must be an object';
    }
    return null;
  }

  /**
   * Validación básica de output (sobrescribir en subclases)
   * @param {any} output - Output a validar
   * @returns {string|null} Error message o null si es válido
   */
  validateOutput(output) {
    // Validación básica - no debe ser undefined
    if (output === undefined) {
      return 'Output cannot be undefined';
    }
    return null;
  }

  /**
   * Log de llamada a herramienta
   * @param {Object} logData - Datos del log
   */
  logToolCall(logData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: logData.agent || 'unknown',
      tool: this.name,
      input: this.sanitizeForLog(logData.input),
      output: logData.success ? this.sanitizeForLog(logData.output) : null,
      error: logData.success ? null : logData.error,
      duration_ms: logData.duration,
      success: logData.success,
    };

    // Si hay logger centralizado, usarlo
    if (this.logger) {
      this.logger.info('tool_call', logEntry);
    } else {
      // Fallback a console
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Sanitiza datos para logging (remueve información sensible)
   * @param {any} data - Datos a sanitizar
   * @returns {any} Datos sanitizados
   */
  sanitizeForLog(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Remover campos sensibles
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Limitar tamaño de strings largos
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...[TRUNCATED]';
      }
    });

    return sanitized;
  }

  /**
   * Obtiene documentación de la herramienta
   * @returns {Object} Documentación estructurada
   */
  getDocumentation() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      examples: this.getExamples(),
      error_handling: this.getErrorHandlingInfo(),
    };
  }

  /**
   * Ejemplos de uso (sobrescribir en subclases)
   * @returns {Array} Array de ejemplos
   */
  getExamples() {
    return [];
  }

  /**
   * Información de manejo de errores (sobrescribir en subclases)
   * @returns {Object} Información de errores
   */
  getErrorHandlingInfo() {
    return {
      common_errors: [],
      retry_strategy: 'none',
      fallback_behavior: 'return error',
    };
  }
}

/**
 * Herramienta específica para operaciones de archivo
 */
export class FileTool extends ToolBase {
  constructor(name, description, parameters = {}) {
    super(name, description, parameters);
  }

  validateInput(input) {
    const baseError = super.validateInput(input);
    if (baseError) return baseError;

    // Validaciones específicas para archivos
    if (input.path && typeof input.path !== 'string') {
      return 'path must be a string';
    }

    if (input.path && input.path.includes('..')) {
      return 'path must not contain parent directory traversal (..)';
    }

    return null;
  }
}

/**
 * Herramienta específica para operaciones de red
 */
export class NetworkTool extends ToolBase {
  constructor(name, description, parameters = {}) {
    super(name, description, parameters);
  }

  validateInput(input) {
    const baseError = super.validateInput(input);
    if (baseError) return baseError;

    // Validaciones específicas para red
    if (input.url && typeof input.url !== 'string') {
      return 'url must be a string';
    }

    if (input.url && !this.isValidUrl(input.url)) {
      return 'url must be a valid URL';
    }

    return null;
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

/**
 * Herramienta específica para operaciones de base de datos
 */
export class DatabaseTool extends ToolBase {
  constructor(name, description, parameters = {}) {
    super(name, description, parameters);
  }

  validateInput(input) {
    const baseError = super.validateInput(input);
    if (baseError) return baseError;

    // Validaciones específicas para DB
    if (input.query && typeof input.query !== 'string') {
      return 'query must be a string';
    }

    return null;
  }
}

export default {
  ToolBase,
  FileTool,
  NetworkTool,
  DatabaseTool,
};
