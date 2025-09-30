#!/usr/bin/env node
/**
 * @fileoverview Logger Estratégico - Separación de debug vs CLI output
 * @description Sistema de logging inteligente que distingue entre logs de debug
 *              y output requerido para CLI/scripts bash
 */

/**
 * Logger Estratégico
 * 
 * Principios:
 * - CLI output: SIEMPRE visible (scripts bash dependen de esto)
 * - Debug logs: Solo con DEBUG=1 o --verbose
 * - Info logs: Solo sin QUIET=1
 * - Error logs: SIEMPRE visible
 */
class StrategicLogger {
  constructor(options = {}) {
    this.verbose = options.verbose || process.env.DEBUG === '1' || process.argv.includes('--verbose');
    this.quiet = options.quiet || process.env.QUIET === '1' || process.argv.includes('--quiet');
    this.component = options.component || 'system';
  }

  /**
   * CLI Output - SIEMPRE visible
   * Para resultados de comandos que scripts bash necesitan parsear
   */
  output(data) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }

  /**
   * Debug - Solo con --verbose o DEBUG=1
   * Para logs de desarrollo y debugging
   */
  debug(message, ...args) {
    if (this.verbose) {
      const timestamp = new Date().toISOString().substring(11, 23);
      console.log(`[${timestamp}][DEBUG][${this.component}] ${message}`, ...args);
    }
  }

  /**
   * Info - Solo sin --quiet
   * Para mensajes informativos de progreso
   */
  info(message, ...args) {
    if (!this.quiet) {
      const timestamp = new Date().toISOString().substring(11, 23);
      console.log(`[${timestamp}][INFO][${this.component}] ${message}`, ...args);
    }
  }

  /**
   * Warning - SIEMPRE visible
   * Para advertencias importantes
   */
  warn(message, ...args) {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.warn(`[${timestamp}][WARN][${this.component}] ${message}`, ...args);
  }

  /**
   * Error - SIEMPRE visible
   * Para errores críticos
   */
  error(message, ...args) {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.error(`[${timestamp}][ERROR][${this.component}] ${message}`, ...args);
  }

  /**
   * Success - Solo sin --quiet
   * Para mensajes de éxito
   */
  success(message, ...args) {
    if (!this.quiet) {
      const timestamp = new Date().toISOString().substring(11, 23);
      console.log(`[${timestamp}][✅][${this.component}] ${message}`, ...args);
    }
  }

  /**
   * Metric - SIEMPRE visible cuando se solicita explícitamente
   * Para métricas y estadísticas
   */
  metric(name, value, unit = '') {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(`[${timestamp}][📊][${this.component}] ${name}: ${value}${unit}`);
  }

  /**
   * Progress - Solo sin --quiet
   * Para barras de progreso y updates
   */
  progress(current, total, message = '') {
    if (!this.quiet) {
      const percentage = Math.round((current / total) * 100);
      const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
      process.stdout.write(`\r[${bar}] ${percentage}% ${message}`.padEnd(80));
      if (current === total) {
        console.log(''); // Nueva línea al completar
      }
    }
  }
}

/**
 * Factory function para crear loggers
 */
export function createLogger(component, options = {}) {
  return new StrategicLogger({ ...options, component });
}

/**
 * Logger global por defecto
 */
export const logger = new StrategicLogger({ component: 'global' });

/**
 * Helper para decidir si un console.log debe comentarse
 */
export function shouldKeepConsoleLog(context) {
  const keepContexts = [
    'cli_output',      // Output de comandos CLI
    'command_result',  // Resultado de comandos
    'json_output',     // JSON para scripts
    'error',           // Mensajes de error
    'metric'           // Métricas
  ];
  
  return keepContexts.includes(context);
}

export default StrategicLogger;
