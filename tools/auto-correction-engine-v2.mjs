#!/usr/bin/env node
/**
 * @fileoverview Auto Correction Engine v2
 * @description Sistema refactorizado que aplica correcciones sugeridas por agentes automáticamente
 * Refactoring: Fase 2 - Usar arquitectura base común
 */

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { BaseCorrectionTool, createCommonCLI } from './base-correction-tool.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración CLI
const argv = createCommonCLI('Uso: $0 [opciones]', {
  'correction-types': {
    alias: 'c',
    type: 'array',
    description: 'Tipos de correcciones a aplicar (console_logs, magic_numbers, etc.)',
    default: ['console_logs', 'magic_numbers']
  }
}).argv;

class AutoCorrectionEngineV2 extends BaseCorrectionTool {
  constructor() {
    super({
      targetPath: argv.targetPath,
      verbose: argv.verbose,
      dryRun: argv.dryRun,
      backup: argv.backup,
      maxConcurrent: argv.maxConcurrent,
      retryAttempts: argv.retryAttempts,
      retryDelay: argv.retryDelay
    });
    
    this.correctionTypes = argv.correctionTypes;
    this.optimizationAgent = join(PROJECT_ROOT, 'agents/optimization/agent.js');
  }

  /**
   * Ejecutar motor de corrección automática
   */
  async run() {
    try {
      this.log('Iniciando Auto Correction Engine v2...');
      
      // Paso 1: Obtener correcciones del agente de optimización
      const corrections = await this.getCorrectionsFromAgent();
      
      // Paso 2: Filtrar correcciones por tipo solicitado
      const filteredCorrections = this.filterCorrections(corrections);
      
      // Paso 3: Crear backups si es necesario
      if (this.config.backup && !this.config.dryRun) {
        await this.createBackups(filteredCorrections);
      }
      
      // Paso 4: Aplicar correcciones
      await this.applyCorrections(filteredCorrections);
      
      // Paso 5: Generar reporte final
      await this.generateReport(corrections, filteredCorrections);
      
      this.log('Auto Correction Engine v2 completado exitosamente', 'success');
      
    } catch (error) {
      this.log(`Error en Auto Correction Engine v2: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Obtener correcciones del agente de optimización
   */
  async getCorrectionsFromAgent() {
    this.log('Obteniendo correcciones del agente de optimización...');
    
    const input = {
      target_path: this.config.targetPath,
      optimization_types: ['performance', 'maintainability', 'readability', 'security'],
      scan_depth: 2,
      auto_fix: true
    };

    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.optimizationAgent, JSON.stringify(input)], {
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
        if (this.config.verbose) {
          this.verbose(data.toString());
        }
      });

      child.on('close', code => {
        if (code === 0) {
          try {
            const result = this.parseJSON(stdout);
            const corrections = result.optimization_report?.auto_fix_commands || [];
            resolve(corrections);
          } catch (parseError) {
            reject(new Error(`Error parseando salida del agente: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Agente de optimización falló con código ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Filtrar correcciones por tipo solicitado
   */
  filterCorrections(corrections) {
    this.log(`Filtrando correcciones por tipos: ${this.correctionTypes.join(', ')}`);
    
    const filtered = corrections.filter(correction => {
      const correctionType = this.getCorrectionType(correction);
      return this.correctionTypes.includes(correctionType);
    });

    this.log(`Encontradas ${filtered.length} correcciones aplicables`);
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
    this.log('Creando backups de archivos...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubDir = join(this.backupDir, `corrections-${timestamp}`);
    mkdirSync(backupSubDir, { recursive: true });

    for (const correction of corrections) {
      const filePath = correction.file_path;
      if (existsSync(filePath)) {
        const backupPath = await this.createBackup(filePath);
        if (backupPath) {
          correction.backup_path = backupPath;
        }
      }
    }

    this.log(`Backups creados en: ${backupSubDir}`, 'success');
  }

  /**
   * Aplicar correcciones
   */
  async applyCorrections(corrections) {
    this.log(`Aplicando ${corrections.length} correcciones...`);
    
    this.results.total = corrections.length;

    // Procesar correcciones en lotes para evitar sobrecarga
    const batches = this.createBatches(corrections, this.config.maxConcurrent);
    
    for (const batch of batches) {
      await Promise.all(batch.map(correction => this.applyCorrection(correction)));
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
      if (this.config.dryRun) {
        this.verbose(`[DRY-RUN] Aplicaría: ${correction.fix_command}`);
        this.results.skipped++;
        return;
      }

      const command = correction.fix_command;
      
      // Ejecutar comando de corrección con retry
      await this.executeCommandWithRetry(command);
      
      // Verificar que el archivo existe y es válido
      if (correction.file_path && existsSync(correction.file_path)) {
        this.results.applied++;
        this.verbose(`Corrección aplicada: ${correction.file_path}`);
      } else {
        this.results.failed++;
        this.log(`Archivo no encontrado después de corrección: ${correction.file_path}`, 'warn');
      }
      
    } catch (error) {
      this.results.failed++;
      this.log(`Error aplicando corrección: ${error.message}`, 'error');
      
      // Restaurar desde backup si existe
      if (correction.backup_path) {
        await this.restoreFromBackup(correction.file_path, correction.backup_path);
      }
    }
  }

  /**
   * Generar reporte final
   */
  async generateReport(originalCorrections, appliedCorrections) {
    const report = this.generateBaseReport('auto_correction_v2', {
      correction_types: this.correctionTypes,
      original_corrections_count: originalCorrections.length,
      filtered_corrections_count: appliedCorrections.length,
      corrections: appliedCorrections.map(c => ({
        id: c.id,
        file: c.file_path,
        type: this.getCorrectionType(c),
        command: c.fix_command,
        priority: c.priority
      }))
    });

    const filename = `auto-correction-v2-${Date.now()}.json`;
    await this.saveReport(report, filename);
    
    this.log(`Resumen: ${this.results.applied} aplicadas, ${this.results.failed} fallidas, ${this.results.skipped} omitidas`);
  }
}

// Ejecutar motor si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  const engine = new AutoCorrectionEngineV2();
  engine.run().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

export default AutoCorrectionEngineV2;
