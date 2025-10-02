#!/usr/bin/env node
/**
 * @fileoverview Auto Correction Engine
 * @description Sistema que aplica correcciones sugeridas por agentes automáticamente
 * PR-I: Tarea 2 - Implementar aplicación automática de correcciones
 */

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// QNX-SEC-001: Allowlist de comandos permitidos (reemplaza denylist frágil)
const ALLOWLIST = new Map([
  // comando -> args permitidos (regex)
  ['npm', [/^(install|run|test|audit|ci|lint|fix)$/]],
  ['node', [/^[\w\-/.]+$/]],
  ['git', [/^(add|commit|push|pull|status|diff|log)$/]],
  ['eslint', [/^[\w\-/.]+$/]],
  ['prettier', [/^(--write|--check)$/]],
  ['mkdir', [/^[\w\-/.]+$/]],
  ['cp', [/^[\w\-/.]+$/]],
  ['mv', [/^[\w\-/.]+$/]],
  ['rm', [/^[\w\-/.]+$/]],
]);

/**
 * Validar comando contra allowlist
 * @param {string} cmd - Comando a validar
 * @param {string[]} args - Argumentos del comando
 * @throws {Error} Si el comando no está permitido
 */
function validateCommand(cmd, args) {
  if (!ALLOWLIST.has(cmd)) {
    throw new Error(`Command not allowed: ${cmd}`);
  }
  
  const rules = ALLOWLIST.get(cmd);
  if (!Array.isArray(args)) {
    throw new Error('Args must be an array');
  }
  
  for (const [i, arg] of args.entries()) {
    const isValid = rules.some((rule) => {
      if (rule instanceof RegExp) {
        return rule.test(arg);
      }
      return rule === arg;
    });
    
    if (!isValid) {
      throw new Error(`Arg not allowed at position ${i}: ${arg}`);
    }
  }
}

// Configuración CLI
const argv = yargs(hideBin(process.argv))
  .usage('Uso: $0 [opciones]')
  .option('target-path', {
    alias: 't',
    type: 'string',
    description: 'Ruta del directorio a corregir',
    default: '.'
  })
  .option('correction-types', {
    alias: 'c',
    type: 'array',
    description:
      'Tipos de correcciones a aplicar (console_logs, magic_numbers, etc.)',
    default: ['console_logs', 'magic_numbers']
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
    description: 'Crear backup antes de aplicar correcciones',
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
    description: 'Máximo número de correcciones concurrentes',
    default: 3
  })
  .help()
  .alias('help', 'h').argv;

class AutoCorrectionEngine {
  constructor() {
    this.targetPath = argv.targetPath;
    this.correctionTypes = argv.correctionTypes;
    this.dryRun = argv.dryRun;
    this.backup = argv.backup;
    this.verbose = argv.verbose;
    this.maxConcurrent = argv.maxConcurrent;
    this.reportsDir = join(PROJECT_ROOT, 'out');
    this.backupDir = join(PROJECT_ROOT, 'backups');
    this.corrections = [];
    this.results = {
      applied: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
  }

  /**
   * Ejecutar motor de corrección automática
   */
  async run() {
    try {
      console.log('🚀 Iniciando Auto Correction Engine...');

      // Paso 1: Obtener correcciones del agente de optimización
      const corrections = await this.getCorrectionsFromAgent();

      // Paso 2: Filtrar correcciones por tipo solicitado
      const filteredCorrections = this.filterCorrections(corrections);

      // Paso 3: Crear backups si es necesario
      if (this.backup && !this.dryRun) {
        await this.createBackups(filteredCorrections);
      }

      // Paso 4: Aplicar correcciones
      await this.applyCorrections(filteredCorrections);

      // Paso 5: Generar reporte final
      await this.generateReport();

      console.log('✅ Auto Correction Engine completado exitosamente');
    } catch (error) {
      console.error('❌ Error en Auto Correction Engine:', error.message);
      process.exit(1);
    }
  }

  /**
   * Obtener correcciones del agente de optimización
   */
  async getCorrectionsFromAgent() {
    console.log('🔧 Obteniendo correcciones del agente de optimización...');

    const optimizationAgent = join(
      PROJECT_ROOT,
      'agents/optimization/agent.js'
    );
    const input = {
      target_path: this.targetPath,
      optimization_types: [
        'performance',
        'maintainability',
        'readability',
        'security'
      ],
      scan_depth: 2,
      auto_fix: true
    };

    return new Promise((resolve, reject) => {
      const child = spawn('node', [optimizationAgent, JSON.stringify(input)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: PROJECT_ROOT,
        env: { ...process.env, NODE_ENV: 'production' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
        if (this.verbose) {
          console.error(data.toString());
        }
      });

      child.on('close', code => {
        if (code === 0) {
          try {
            const jsonRegex = /\{[\s\S]*\}/;
            const jsonMatch = jsonRegex.exec(stdout);
            if (!jsonMatch) {
              throw new Error('No se encontró JSON válido en la salida');
            }
            const result = JSON.parse(jsonMatch[0]);
            const corrections =
              result.optimization_report?.auto_fix_commands || [];
            resolve(corrections);
          } catch (parseError) {
            reject(
              new Error(
                `Error parseando salida del agente: ${parseError.message}`
              )
            );
          }
        } else {
          reject(
            new Error(
              `Agente de optimización falló con código ${code}: ${stderr}`
            )
          );
        }
      });
    });
  }

  /**
   * Filtrar correcciones por tipo solicitado
   */
  filterCorrections(corrections) {
    console.log(
      `📋 Filtrando correcciones por tipos: ${this.correctionTypes.join(', ')}`
    );

    const filtered = corrections.filter(correction => {
      const correctionType = this.getCorrectionType(correction);
      return this.correctionTypes.includes(correctionType);
    });

    console.log(`📊 Encontradas ${filtered.length} correcciones aplicables`);
    return filtered;
  }

  /**
   * Determinar tipo de corrección basado en el comando
   */
  getCorrectionType(correction) {
    const command = correction.fix_command;

    if (command.includes('console')) return 'console_logs';
    if (command.includes('magic_numbers')) return 'magic_numbers';
    if (command.includes('eslint')) return 'eslint_fixes';
    if (command.includes('sed')) return 'text_replacements';

    return 'other';
  }

  /**
   * Crear backups de archivos a modificar
   */
  async createBackups(corrections) {
    console.log('💾 Creando backups de archivos...');

    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubDir = join(this.backupDir, `corrections-${timestamp}`);
    mkdirSync(backupSubDir, { recursive: true });

    for (const correction of corrections) {
      const filePath = correction.file_path;
      if (existsSync(filePath)) {
        const fileName = filePath.split('/').pop();
        const backupPath = join(backupSubDir, fileName);

        try {
          const content = readFileSync(filePath, 'utf8');
          writeFileSync(backupPath, content);
          correction.backup_path = backupPath;

          if (this.verbose) {
            console.log(`📁 Backup creado: ${backupPath}`);
          }
        } catch (error) {
          console.warn(
            `⚠️ Error creando backup para ${filePath}: ${error.message}`
          );
        }
      }
    }

    console.log(`✅ Backups creados en: ${backupSubDir}`);
  }

  /**
   * Aplicar correcciones
   */
  async applyCorrections(corrections) {
    console.log(`🔧 Aplicando ${corrections.length} correcciones...`);

    this.results.total = corrections.length;

    // Procesar correcciones en lotes para evitar sobrecarga
    const batches = this.createBatches(corrections, this.maxConcurrent);

    for (const batch of batches) {
      await Promise.all(
        batch.map(correction => this.applyCorrection(correction))
      );
    }
  }

  /**
   * Crear lotes de correcciones
   */
  createBatches(corrections, batchSize) {
    const batches = [];
    for (let i = 0; i < corrections.length; i += batchSize) {
      batches.push(corrections.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Aplicar corrección individual
   */
  async applyCorrection(correction) {
    try {
      if (this.dryRun) {
        console.log(`🔍 [DRY-RUN] Aplicaría: ${correction.fix_command}`);
        this.results.skipped++;
        return;
      }

      const command = correction.fix_command;

      // Ejecutar comando de corrección
      await this.executeCommand(command);

      // Verificar que el archivo existe y es válido
      if (correction.file_path && existsSync(correction.file_path)) {
        this.results.applied++;
        if (this.verbose) {
          console.log(`✅ Corrección aplicada: ${correction.file_path}`);
        }
      } else {
        this.results.failed++;
        console.warn(
          `⚠️ Archivo no encontrado después de corrección: ${correction.file_path}`
        );
      }
    } catch (error) {
      this.results.failed++;
      console.error(`❌ Error aplicando corrección: ${error.message}`);

      // Restaurar desde backup si existe
      if (correction.backup_path && existsSync(correction.backup_path)) {
        try {
          const backupContent = readFileSync(correction.backup_path, 'utf8');
          writeFileSync(correction.file_path, backupContent);
          console.log(
            `🔄 Archivo restaurado desde backup: ${correction.file_path}`
          );
        } catch (restoreError) {
          console.error(`❌ Error restaurando backup: ${restoreError.message}`);
        }
      }
    }
  }

  /**
   * Ejecutar comando de corrección con validación estricta
   * QNX-SEC-001: Migrado de exec a spawn con allowlist
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      // Determinar si es un comando shell o un comentario
      if (command.startsWith('#')) {
        // Comentario - no ejecutar
        resolve();
        return;
      }

      try {
        // QNX-SEC-001: Validación estricta previa a ejecución
        const [cmd, ...rawArgs] = command.trim().split(/\s+/);
        validateCommand(cmd, rawArgs);

        // Usar spawn en lugar de exec para mayor seguridad
        const child = spawn(cmd, rawArgs, {
          cwd: PROJECT_ROOT,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            if (this.verbose && stdout) {
              console.log(`📝 Output: ${stdout}`);
            }
            if (this.verbose && stderr) {
              console.log(`⚠️ Stderr: ${stderr}`);
            }
            resolve();
          } else {
            reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
          }
        });

        child.on('error', (error) => {
          reject(new Error(`Command execution failed: ${error.message}`));
        });

      } catch (validationError) {
        reject(new Error(`Command validation failed: ${validationError.message}`));
      }
    });
  }

  /**
   * Generar reporte final
   */
  async generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      auto_correction_report: {
        timestamp,
        target_path: this.targetPath,
        correction_types: this.correctionTypes,
        execution_mode: this.dryRun ? 'dry-run' : 'apply',
        backup_enabled: this.backup,
        results: this.results,
        success_rate:
          this.results.total > 0
            ? ((this.results.applied / this.results.total) * 100).toFixed(2) +
              '%'
            : '0%'
      }
    };

    // Asegurar que el directorio out existe
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }

    const reportFile = join(
      this.reportsDir,
      `auto-correction-${Date.now()}.json`
    );
    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`📊 Reporte generado: ${reportFile}`);
    console.log(
      `📈 Resumen: ${this.results.applied} aplicadas, ${this.results.failed} fallidas, ${this.results.skipped} omitidas`
    );
  }
}

// Ejecutar motor si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  const engine = new AutoCorrectionEngine();
  engine.run().catch(console.error);
}

export default AutoCorrectionEngine;
