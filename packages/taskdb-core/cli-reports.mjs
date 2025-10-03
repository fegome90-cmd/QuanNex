#!/usr/bin/env node

/**
 * CLI de Informes Blindado - QuanNex TaskDB
 * Plan Maestro TaskDB - OLA 2: Antifrágil
 *
 * CLI para gestión de reportes con blindajes de seguridad, integridad y operatividad.
 * Comandos: qn report:validate, publish, retract
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import ProvenanceVerifierHardened from './provenance-verifier-hardened.mjs';
import TaskDBCore from './taskdb-core.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

class QuanNexReportsCLI {
  constructor() {
    this.taskdb = new TaskDBCore({
      dataDir: join(PROJECT_ROOT, 'data'),
      dbFile: 'taskdb.sqlite',
    });
    this.verifier = new ProvenanceVerifierHardened(this.taskdb);
    this.config = this.loadConfiguration();
  }

  /**
   * Cargar configuración desde taskdb-hardened.yaml
   */
  loadConfiguration() {
    try {
      const configPath = join(__dirname, 'taskdb-hardened.yaml');
      if (existsSync(configPath)) {
        const configContent = readFileSync(configPath, 'utf8');
        // Parsear YAML básico (en producción usar yaml parser)
        return this.parseYamlBasic(configContent);
      }
    } catch (error) {
      console.warn('⚠️  No se pudo cargar configuración, usando valores por defecto');
    }

    // Configuración por defecto
    return {
      provenance_verifier: {
        snapshot_validity_window_days: 7,
        resource_limits: {
          max_task_ids_per_report: 1000,
          max_run_ids_per_report: 1000,
          max_artifact_hashes_per_report: 500,
          max_claims_per_report: 100,
        },
      },
      cli: {
        max_operations_per_session: 100,
        reports: {
          require_provenance: true,
          validate_on_publish: true,
          create_correction_tasks_on_retract: true,
        },
      },
    };
  }

  /**
   * Parsear YAML básico (simplificado para demo)
   */
  parseYamlBasic(content) {
    // Implementación básica - en producción usar yaml parser
    const config = {};
    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.endsWith(':')) {
        currentSection = trimmed.slice(0, -1);
        config[currentSection] = config[currentSection] || {};
      } else if (trimmed.includes(':') && currentSection) {
        const [key, value] = trimmed.split(':', 2);
        config[currentSection][key.trim()] = value.trim();
      }
    }

    return config;
  }

  /**
   * Configurar yargs para el CLI
   */
  setupCLI() {
    return yargs(hideBin(process.argv))
      .scriptName('qn')
      .usage('$0 <command> [options]')
      .command('report:validate <file>', 'Validar procedencia de un reporte', yargs => {
        return yargs
          .positional('file', {
            describe: 'Archivo de reporte a validar',
            type: 'string',
          })
          .option('json', {
            alias: 'j',
            describe: 'Salida en formato JSON',
            type: 'boolean',
            default: false,
          })
          .option('verbose', {
            alias: 'v',
            describe: 'Salida detallada',
            type: 'boolean',
            default: false,
          })
          .option('policy', {
            alias: 'p',
            describe: 'Versión de política a usar',
            type: 'string',
            default: '1.0.0',
          })
          .option('strict', {
            alias: 's',
            describe: 'Modo estricto (falla en cualquier warning)',
            type: 'boolean',
            default: false,
          });
      })
      .command('report:publish <file>', 'Publicar un reporte validado', yargs => {
        return yargs
          .positional('file', {
            describe: 'Archivo de reporte a publicar',
            type: 'string',
          })
          .option('force', {
            alias: 'f',
            describe: 'Forzar publicación sin validación previa',
            type: 'boolean',
            default: false,
          })
          .option('dry-run', {
            alias: 'd',
            describe: 'Simular publicación sin cambios',
            type: 'boolean',
            default: false,
          })
          .option('json', {
            alias: 'j',
            describe: 'Salida en formato JSON',
            type: 'boolean',
            default: false,
          });
      })
      .command('report:retract <id>', 'Retractar un reporte publicado', yargs => {
        return yargs
          .positional('id', {
            describe: 'ID del reporte a retractar',
            type: 'string',
          })
          .option('reason', {
            alias: 'r',
            describe: 'Razón de la retractación',
            type: 'string',
            demandOption: true,
          })
          .option('create-task', {
            alias: 't',
            describe: 'Crear tarea de corrección automática',
            type: 'boolean',
            default: true,
          })
          .option('json', {
            alias: 'j',
            describe: 'Salida en formato JSON',
            type: 'boolean',
            default: false,
          });
      })
      .demandCommand(1, 'Debes especificar un comando')
      .help()
      .alias('help', 'h')
      .version('1.0.0')
      .alias('version', 'V')
      .epilogue('QuanNex TaskDB CLI - Plan Maestro OLA 2: Antifrágil');
  }

  /**
   * Ejecutar comando report:validate
   */
  async validateReport(argv) {
    const { file, json, verbose, policy, strict } = argv;

    try {
      console.log(`🔍 Validando reporte: ${file}`);

      // Verificar que el archivo existe
      if (!existsSync(file)) {
        throw new Error(`Archivo no encontrado: ${file}`);
      }

      // Leer y parsear reporte
      const reportContent = readFileSync(file, 'utf8');
      let report;

      try {
        report = JSON.parse(reportContent);
      } catch (error) {
        throw new Error(`Error parseando JSON: ${error.message}`);
      }

      // Verificar estructura básica del reporte
      if (!report.report_provenance) {
        throw new Error('El reporte no tiene report_provenance');
      }

      // Validar con ProvenanceVerifier Hardened
      const verification = await this.verifier.verifyReportProvenance(report);

      // Aplicar modo estricto si está habilitado
      if (strict && verification.warnings.length > 0) {
        verification.status = 'fail';
        verification.errors.push(
          `Modo estricto: ${verification.warnings.length} warnings tratados como errores`
        );
      }

      // Mostrar resultados
      if (json) {
        console.log(JSON.stringify(verification, null, 2));
      } else {
        this.displayValidationResults(verification, verbose);
      }

      // Exit code basado en resultado
      if (verification.status === 'pass') {
        console.log('✅ Validación exitosa');
        process.exit(0);
      } else {
        console.log('❌ Validación fallida');
        process.exit(1);
      }
    } catch (error) {
      const errorResult = {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };

      if (json) {
        console.log(JSON.stringify(errorResult, null, 2));
      } else {
        console.error(`❌ Error: ${error.message}`);
      }

      process.exit(1);
    }
  }

  /**
   * Ejecutar comando report:publish
   */
  async publishReport(argv) {
    const { file, force, dryRun, json } = argv;

    try {
      console.log(`📤 Publicando reporte: ${file}`);

      // Verificar que el archivo existe
      if (!existsSync(file)) {
        throw new Error(`Archivo no encontrado: ${file}`);
      }

      // Leer y parsear reporte
      const reportContent = readFileSync(file, 'utf8');
      let report;

      try {
        report = JSON.parse(reportContent);
      } catch (error) {
        throw new Error(`Error parseando JSON: ${error.message}`);
      }

      // Validar si no está en modo force
      if (!force) {
        console.log('🔍 Validando reporte antes de publicación...');
        const verification = await this.verifier.verifyReportProvenance(report);

        if (verification.status !== 'pass') {
          throw new Error(`Validación fallida: ${verification.errors.join(', ')}`);
        }

        console.log('✅ Validación exitosa');
      }

      // Crear artifact del reporte
      const reportHash = createHash('sha256').update(reportContent).digest('hex');
      const artifactPath = join(__dirname, '../reports', `published-${basename(file)}`);

      if (!dryRun) {
        // Crear directorio si no existe
        const reportsDir = join(__dirname, '../reports');
        if (!existsSync(reportsDir)) {
          mkdirSync(reportsDir, { recursive: true });
        }

        // Copiar archivo a directorio de publicados
        writeFileSync(artifactPath, reportContent);

        // Crear artifact en TaskDB
        const artifact = this.taskdb.createArtifact({
          name: basename(file),
          type: 'report',
          uri: artifactPath,
          hash: reportHash,
          size_bytes: reportContent.length,
          metadata: {
            published: true,
            original_file: file,
            published_at: new Date().toISOString(),
          },
        });

        // Crear reporte en TaskDB
        const publishedReport = this.taskdb.createReport({
          artifact_id: artifact.id,
          title: report.title || basename(file),
          description: report.description || 'Reporte publicado via CLI',
          report_provenance: report.report_provenance,
          status: 'published',
          metadata: {
            published_via: 'cli',
            original_file: file,
          },
        });

        const result = {
          status: 'published',
          report_id: publishedReport.id,
          artifact_id: artifact.id,
          artifact_path: artifactPath,
          hash: reportHash,
          timestamp: new Date().toISOString(),
        };

        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('✅ Reporte publicado exitosamente');
          console.log(`📄 ID del reporte: ${publishedReport.id}`);
          console.log(`📦 ID del artifact: ${artifact.id}`);
          console.log(`📁 Archivo: ${artifactPath}`);
          console.log(`🔒 Hash: ${reportHash}`);
        }
      } else {
        console.log('🔍 Modo dry-run: Simulación de publicación');
        console.log(`📄 Archivo: ${file}`);
        console.log(`📦 Hash: ${reportHash}`);
        console.log(`📁 Destino: ${artifactPath}`);
      }
    } catch (error) {
      const errorResult = {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };

      if (json) {
        console.log(JSON.stringify(errorResult, null, 2));
      } else {
        console.error(`❌ Error: ${error.message}`);
      }

      process.exit(1);
    }
  }

  /**
   * Ejecutar comando report:retract
   */
  async retractReport(argv) {
    const { id, reason, createTask, json } = argv;

    try {
      console.log(`🔄 Retractando reporte: ${id}`);

      // Buscar reporte en TaskDB
      const report = this.taskdb.getReport(id);
      if (!report) {
        throw new Error(`Reporte no encontrado: ${id}`);
      }

      if (report.status !== 'published') {
        throw new Error(`El reporte no está publicado (status: ${report.status})`);
      }

      // Actualizar reporte a retractado
      const updatedReport = this.taskdb.updateReport(id, {
        status: 'retracted',
        retracted_at: new Date().toISOString(),
        metadata: {
          ...report.metadata,
          retraction_reason: reason,
          retracted_at: new Date().toISOString(),
          retracted_via: 'cli',
        },
      });

      // Crear tarea de corrección si está habilitado
      let correctionTask = null;
      if (createTask) {
        correctionTask = this.taskdb.createTask({
          title: `Corrección por retractación de reporte: ${report.title}`,
          description: `El reporte ${id} fue retractado por la razón: ${reason}. Se requiere una tarea de corrección.`,
          priority: 'critical',
          status: 'pending',
          metadata: {
            type: 'correction',
            original_report_id: id,
            retraction_reason: reason,
            created_via: 'cli_retract',
          },
          dependencies: JSON.stringify([report.artifact_id]),
        });

        console.log(`📋 Tarea de corrección creada: ${correctionTask.id}`);
      }

      // Registrar evento de retractación
      this.taskdb.logEvent('report', id, 'retracted', {
        reason,
        retracted_via: 'cli',
        correction_task_id: correctionTask?.id,
      });

      const result = {
        status: 'retracted',
        report_id: id,
        retraction_reason: reason,
        retracted_at: new Date().toISOString(),
        correction_task: correctionTask
          ? {
              id: correctionTask.id,
              title: correctionTask.title,
            }
          : null,
      };

      if (json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('✅ Reporte retractado exitosamente');
        console.log(`📄 ID del reporte: ${id}`);
        console.log(`📝 Razón: ${reason}`);
        console.log(`⏰ Retractado en: ${new Date().toISOString()}`);
        if (correctionTask) {
          console.log(`📋 Tarea de corrección: ${correctionTask.id}`);
        }
      }
    } catch (error) {
      const errorResult = {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };

      if (json) {
        console.log(JSON.stringify(errorResult, null, 2));
      } else {
        console.error(`❌ Error: ${error.message}`);
      }

      process.exit(1);
    }
  }

  /**
   * Mostrar resultados de validación
   */
  displayValidationResults(verification, verbose) {
    console.log(`\n📊 RESULTADO DE VALIDACIÓN`);
    console.log(`Estado: ${verification.status === 'pass' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Timestamp: ${verification.timestamp}`);

    if (verification.security_checks) {
      console.log(`\n🔒 BLINDAJES DE SEGURIDAD:`);
      verification.security_checks.forEach(check => {
        const icon = check.status === 'pass' ? '✅' : '❌';
        console.log(`  ${icon} ${check.check}: ${check.message}`);
        if (verbose && check.details) {
          console.log(`      ${check.details}`);
        }
      });
    }

    if (verification.integrity_checks) {
      console.log(`\n🔍 BLINDAJES DE INTEGRIDAD:`);
      verification.integrity_checks.forEach(check => {
        const icon = check.status === 'pass' ? '✅' : '❌';
        console.log(`  ${icon} ${check.check}: ${check.message}`);
        if (verbose && check.details) {
          console.log(`      ${check.details}`);
        }
      });
    }

    if (verification.operability_checks) {
      console.log(`\n⚙️  BLINDAJES DE OPERATIVIDAD:`);
      verification.operability_checks.forEach(check => {
        const icon = check.status === 'pass' ? '✅' : '❌';
        console.log(`  ${icon} ${check.check}: ${check.message}`);
        if (verbose && check.details) {
          console.log(`      ${check.details}`);
        }
      });
    }

    if (verification.errors.length > 0) {
      console.log(`\n❌ ERRORES:`);
      verification.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }

    if (verification.warnings.length > 0) {
      console.log(`\n⚠️  ADVERTENCIAS:`);
      verification.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
    }
  }

  /**
   * Ejecutar CLI
   */
  async run() {
    const argv = this.setupCLI().argv;

    try {
      switch (argv._[0]) {
        case 'report:validate':
          await this.validateReport(argv);
          break;
        case 'report:publish':
          await this.publishReport(argv);
          break;
        case 'report:retract':
          await this.retractReport(argv);
          break;
        default:
          console.error('Comando no reconocido');
          process.exit(1);
      }
    } catch (error) {
      console.error('Error ejecutando CLI:', error.message);
      process.exit(1);
    } finally {
      this.taskdb.close();
    }
  }
}

// Ejecutar CLI si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new QuanNexReportsCLI();
  cli.run().catch(error => {
    console.error('Error fatal:', error.message);
    process.exit(1);
  });
}

export default QuanNexReportsCLI;
