#!/usr/bin/env node
/**
 * @fileoverview Base Correction Tool
 * @description Clase base común para todas las herramientas de corrección
 * Refactoring: Fase 2 - Crear arquitectura base común
 */

import { spawn, exec } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Clase base para herramientas de corrección
 */
export class BaseCorrectionTool {
  constructor(config = {}) {
    this.config = {
      targetPath: '.',
      verbose: false,
      dryRun: false,
      backup: true,
      maxConcurrent: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
    
    this.reportsDir = join(PROJECT_ROOT, 'out');
    this.backupDir = join(PROJECT_ROOT, 'backups');
    this.results = {
      applied: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    
    this.ensureDirectories();
  }

  /**
   * Asegurar que los directorios necesarios existen
   */
  ensureDirectories() {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Logging unificado
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`);
        break;
      case 'success':
        console.log(`${prefix} ✅ ${message}`);
        break;
      case 'info':
      default:
        console.log(`${prefix} ℹ️ ${message}`);
        break;
    }
  }

  /**
   * Logging verbose
   */
  verbose(message) {
    if (this.config.verbose) {
      this.log(message, 'info');
    }
  }

  /**
   * Validar entrada
   */
  validateInput(input) {
    if (!input) {
      throw new Error('Input is required');
    }
    
    if (input.targetPath && !existsSync(input.targetPath)) {
      throw new Error(`Target path does not exist: ${input.targetPath}`);
    }
    
    return true;
  }

  /**
   * Ejecutar comando con retry logic
   */
  async executeCommandWithRetry(command, maxRetries = null) {
    const retries = maxRetries || this.config.retryAttempts;
    let lastError = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.verbose(`Ejecutando comando (intento ${attempt}/${retries}): ${command}`);
        
        const result = await this.executeCommand(command);
        this.log(`Comando exitoso en intento ${attempt}`, 'success');
        return result;
        
      } catch (error) {
        lastError = error;
        this.log(`Intento ${attempt} falló: ${error.message}`, 'warn');
        
        if (attempt < retries) {
          this.verbose(`Esperando ${this.config.retryDelay}ms antes del siguiente intento...`);
          await this.delay(this.config.retryDelay);
        }
      }
    }
    
    throw new Error(`Comando falló después de ${retries} intentos: ${lastError.message}`);
  }

  /**
   * Ejecutar comando individual
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      // Validar comando seguro
      if (!this.isSafeCommand(command)) {
        reject(new Error(`Comando no seguro detectado: ${command}`));
        return;
      }

      exec(command, { 
        cwd: PROJECT_ROOT,
        timeout: 30000 // 30 segundos timeout
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Comando falló: ${error.message}`));
        } else {
          if (this.config.verbose && stdout) {
            this.verbose(`Output: ${stdout}`);
          }
          if (this.config.verbose && stderr) {
            this.verbose(`Stderr: ${stderr}`);
          }
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Validar comando seguro
   */
  isSafeCommand(command) {
    const dangerousPatterns = [
      /rm\s+-rf/,
      /sudo/,
      /chmod\s+777/,
      /dd\s+if=/,
      /mkfs/,
      /fdisk/,
      /:(){ :|:& };:/, // Fork bomb
      /eval\s+/,
      /exec\s+/
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(command));
  }

  /**
   * Delay entre reintentos
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Crear backup de archivo
   */
  async createBackup(filePath) {
    if (!this.config.backup || this.config.dryRun) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filePath.split('/').pop();
    const backupPath = join(this.backupDir, `${fileName}-${timestamp}.backup`);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      writeFileSync(backupPath, content);
      this.verbose(`Backup creado: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.log(`Error creando backup para ${filePath}: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * Restaurar desde backup
   */
  async restoreFromBackup(filePath, backupPath) {
    if (!backupPath || !existsSync(backupPath)) {
      this.log(`No hay backup disponible para ${filePath}`, 'warn');
      return false;
    }

    try {
      const backupContent = readFileSync(backupPath, 'utf8');
      writeFileSync(filePath, backupContent);
      this.log(`Archivo restaurado desde backup: ${filePath}`, 'success');
      return true;
    } catch (error) {
      this.log(`Error restaurando backup: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Procesar JSON de forma segura
   */
  parseJSON(jsonString) {
    try {
      const jsonRegex = new RegExp('\\{[\\s\\S]*\\}');
      const jsonMatch = jsonRegex.exec(jsonString);
      
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la salida');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Error parseando JSON: ${error.message}`);
    }
  }

  /**
   * Generar reporte base
   */
  generateBaseReport(type, data = {}) {
    return {
      report_type: type,
      timestamp: new Date().toISOString(),
      tool_version: '2.0.0',
      config: {
        target_path: this.config.targetPath,
        dry_run: this.config.dryRun,
        backup_enabled: this.config.backup,
        verbose: this.config.verbose
      },
      results: this.results,
      data
    };
  }

  /**
   * Guardar reporte
   */
  async saveReport(report, filename) {
    const reportFile = join(this.reportsDir, filename);
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.log(`Reporte guardado: ${reportFile}`, 'success');
    return reportFile;
  }

  /**
   * Método template para ejecutar herramienta
   */
  async run() {
    throw new Error('Método run() debe ser implementado por la clase hija');
  }
}

/**
 * Configuración CLI común
 */
export function createCommonCLI(usage, options = {}) {
  return yargs(hideBin(process.argv))
    .usage(usage)
    .option('target-path', {
      alias: 't',
      type: 'string',
      description: 'Ruta del directorio objetivo',
      default: '.'
    })
    .option('dry-run', {
      alias: 'n',
      type: 'boolean',
      description: 'Modo de solo lectura (no aplicar cambios)',
      default: false
    })
    .option('backup', {
      alias: 'b',
      type: 'boolean',
      description: 'Crear backup antes de aplicar cambios',
      default: true
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Salida detallada',
      default: false
    })
    .option('max-concurrent', {
      alias: 'm',
      type: 'number',
      description: 'Máximo número de operaciones concurrentes',
      default: 3
    })
    .option('retry-attempts', {
      alias: 'r',
      type: 'number',
      description: 'Número de intentos de reintento',
      default: 3
    })
    .option('retry-delay', {
      alias: 'd',
      type: 'number',
      description: 'Delay entre reintentos en ms',
      default: 1000
    })
    .help()
    .alias('help', 'h')
    .options(options);
}

export default BaseCorrectionTool;
