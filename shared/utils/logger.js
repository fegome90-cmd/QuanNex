/**
 * shared/utils/logger.js
 * Logger compartido para todas las versiones
 */
export class Logger {
  constructor(prefix = 'QuanNex') {
    this.prefix = prefix;
  }

  log(message) {
    console.log(`[${this.prefix}] ${message}`);
  }

  error(message) {
    console.error(`[${this.prefix}] ❌ ${message}`);
  }

  success(message) {
    console.log(`[${this.prefix}] ✅ ${message}`);
  }

  warning(message) {
    console.warn(`[${this.prefix}] ⚠️  ${message}`);
  }
}

export const logger = new Logger();
