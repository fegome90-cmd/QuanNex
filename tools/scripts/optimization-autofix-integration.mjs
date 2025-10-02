#!/usr/bin/env node
/**
 * @fileoverview Optimization-Autofix Integration
 * @description Integra @optimization con run-autofix para aplicar correcciones automáticas
 * PR-I: Tarea 1 - Integrar @optimization con run-autofix
 */

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración CLI
const argv = yargs(hideBin(process.argv))
  .usage('Uso: $0 [opciones]')
  .option('target-path', {
    alias: 't',
    type: 'string',
    description: 'Ruta del directorio a optimizar',
    default: '.'
  })
  .option('optimization-types', {
    alias: 'o',
    type: 'array',
    description:
      'Tipos de optimizaciones (performance, maintainability, readability, security)',
    default: ['performance', 'maintainability']
  })
  .option('scan-depth', {
    alias: 'd',
    type: 'number',
    description: 'Profundidad de escaneo recursivo (1-5)',
    default: 2
  })
  .option('dry-run', {
    alias: 'n',
    type: 'boolean',
    description: 'Modo de solo lectura (no aplicar cambios)',
    default: false
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Salida detallada',
    default: false
  })
  .help()
  .alias('help', 'h').argv;

class OptimizationAutofixIntegration {
  constructor() {
    this.optimizationAgent = join(PROJECT_ROOT, 'agents/optimization/agent.js');
    this.autofixTool = join(PROJECT_ROOT, 'tools/run-autofix.mjs');
    this.reportsDir = join(PROJECT_ROOT, 'out');
    this.verbose = argv.verbose;
  }

  /**
   * Ejecutar integración completa
   */
  async run() {
    try {
      console.log('🚀 Iniciando integración @optimization + run-autofix...');

      // Paso 1: Ejecutar @optimization para obtener sugerencias
      const optimizationReport = await this.runOptimizationAgent();

      // Paso 2: Procesar sugerencias y generar comandos de autofix
      const autofixCommands =
        this.processOptimizationSuggestions(optimizationReport);

      // Paso 3: Ejecutar run-autofix con las correcciones identificadas
      if (autofixCommands.length > 0) {
        await this.runAutofixTool(autofixCommands);
      } else {
        console.log('ℹ️ No se encontraron correcciones automáticas aplicables');
      }

      // Paso 4: Generar reporte final
      await this.generateFinalReport(optimizationReport, autofixCommands);

      console.log('✅ Integración completada exitosamente');
    } catch (error) {
      console.error('❌ Error en la integración:', error.message);
      process.exit(1);
    }
  }

  /**
   * Ejecutar agente de optimización
   */
  async runOptimizationAgent() {
    console.log('🔧 Ejecutando @optimization agent...');

    const input = {
      target_path: argv.targetPath,
      optimization_types: argv.optimizationTypes,
      scan_depth: argv.scanDepth,
      auto_fix: true // Habilitar detección de autofix
    };

    return new Promise((resolve, reject) => {
      const child = spawn(
        'node',
        [this.optimizationAgent, JSON.stringify(input)],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: PROJECT_ROOT,
          env: { ...process.env, NODE_ENV: 'production' }
        }
      );

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
            // Filtrar solo el JSON del output
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('No se encontró JSON válido en la salida');
            }
            const result = JSON.parse(jsonMatch[0]);
            resolve(result);
          } catch (parseError) {
            reject(
              new Error(
                `Error parseando salida del agente: ${parseError.message}\nOutput: ${stdout}`
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
   * Procesar sugerencias de optimización y generar comandos de autofix
   */
  processOptimizationSuggestions(optimizationReport) {
    console.log('📋 Procesando sugerencias de optimización...');

    const commands = [];
    const report = optimizationReport.optimization_report;

    if (!report) {
      console.warn('⚠️ No se encontró reporte de optimización');
      return commands;
    }

    if (this.verbose) {
      console.log('📊 Reporte recibido:', JSON.stringify(report, null, 2));
    }

    // Procesar comandos de autofix generados por el agente
    if (report.auto_fix_commands) {
      for (const cmd of report.auto_fix_commands) {
        commands.push({
          type: cmd.type,
          file: cmd.file_path,
          description: cmd.description,
          command: cmd.fix_command,
          priority: cmd.priority || 'medium'
        });
      }
    }

    console.log(
      `📊 Encontradas ${commands.length} correcciones automáticas aplicables`
    );
    return commands;
  }

  /**
   * Ejecutar herramienta de autofix
   */
  async runAutofixTool(commands) {
    console.log('🔧 Ejecutando run-autofix...');

    const mode = argv.dryRun ? 'dry-run' : 'apply';
    const args = [mode];

    if (argv.verbose) {
      args.push('--verbose');
    }

    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.autofixTool, ...args], {
        stdio: 'inherit',
        cwd: PROJECT_ROOT
      });

      child.on('close', code => {
        if (code === 0) {
          console.log('✅ run-autofix completado exitosamente');
          resolve();
        } else {
          reject(new Error(`run-autofix falló con código ${code}`));
        }
      });
    });
  }

  /**
   * Generar reporte final de la integración
   */
  async generateFinalReport(optimizationReport, autofixCommands) {
    const timestamp = new Date().toISOString();
    const report = {
      integration_report: {
        timestamp,
        optimization_agent: {
          version: optimizationReport.agent_version,
          stats: optimizationReport.stats
        },
        autofix_commands: {
          total: autofixCommands.length,
          by_type: this.groupCommandsByType(autofixCommands),
          by_priority: this.groupCommandsByPriority(autofixCommands)
        },
        execution_mode: argv.dryRun ? 'dry-run' : 'apply',
        target_path: argv.targetPath,
        optimization_types: argv.optimizationTypes
      }
    };

    // Asegurar que el directorio out existe
    if (!existsSync(this.reportsDir)) {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(this.reportsDir, { recursive: true });
    }

    const reportFile = join(
      this.reportsDir,
      `optimization-autofix-integration-${Date.now()}.json`
    );
    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`📊 Reporte generado: ${reportFile}`);
  }

  /**
   * Agrupar comandos por tipo
   */
  groupCommandsByType(commands) {
    return commands.reduce((acc, cmd) => {
      acc[cmd.type] = (acc[cmd.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Agrupar comandos por prioridad
   */
  groupCommandsByPriority(commands) {
    return commands.reduce((acc, cmd) => {
      acc[cmd.priority] = (acc[cmd.priority] || 0) + 1;
      return acc;
    }, {});
  }
}

// Ejecutar integración si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  const integration = new OptimizationAutofixIntegration();
  integration.run().catch(console.error);
}

export default OptimizationAutofixIntegration;
