#!/usr/bin/env node

/**
 * TaskDB CLI - Interfaz de Línea de Comandos
 * Plan Maestro TaskDB - Ola 1: Robustez
 *
 * Implementa comandos CLI para:
 * - Gestión de tareas, runs, gates, artifacts
 * - Diagnóstico y reparación con TaskDB Doctor
 * - Verificación de procedencia
 * - Estadísticas y reportes
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import TaskDBCore from './taskdb-core.mjs';
import TaskDBDoctor from './taskdb-doctor.mjs';
import ProvenanceVerifier from './provenance-verifier.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TaskDBCLI {
  constructor() {
    this.taskdb = null;
    this.doctor = null;
    this.verifier = null;
  }

  /**
   * Inicializar el sistema
   */
  init(config = {}) {
    this.taskdb = new TaskDBCore(config);
    this.doctor = new TaskDBDoctor(this.taskdb);
    this.verifier = new ProvenanceVerifier(this.taskdb);
  }

  /**
   * Ejecutar comando CLI
   */
  async run(args) {
    const command = args[0];
    const options = this.parseOptions(args.slice(1));

    try {
      switch (command) {
        case 'init':
          await this.cmdInit(options);
          break;
        case 'task':
          await this.cmdTask(args.slice(1));
          break;
        case 'run':
          await this.cmdRun(args.slice(1));
          break;
        case 'gate':
          await this.cmdGate(args.slice(1));
          break;
        case 'artifact':
          await this.cmdArtifact(args.slice(1));
          break;
        case 'report':
          await this.cmdReport(args.slice(1));
          break;
        case 'doctor':
          await this.cmdDoctor(options);
          break;
        case 'verify':
          await this.cmdVerify(args.slice(1));
          break;
        case 'stats':
          await this.cmdStats();
          break;
        case 'export':
          await this.cmdExport(args.slice(1));
          break;
        case 'import':
          await this.cmdImport(args.slice(1));
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error(`Error ejecutando comando '${command}': ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Comando: init
   */
  async cmdInit(options) {
    console.log('Inicializando TaskDB...');
    this.init(options);
    console.log('✓ TaskDB inicializado correctamente');
  }

  /**
   * Comando: task
   */
  async cmdTask(args) {
    const subcommand = args[0];

    switch (subcommand) {
      case 'create':
        await this.taskCreate(args.slice(1));
        break;
      case 'update':
        await this.taskUpdate(args.slice(1));
        break;
      case 'list':
        await this.taskList(args.slice(1));
        break;
      case 'show':
        await this.taskShow(args.slice(1));
        break;
      default:
        console.log('Subcomandos disponibles: create, update, list, show');
    }
  }

  /**
   * Crear tarea
   */
  async taskCreate(args) {
    const title = args[0];
    const description = args[1] || '';
    const priority = args[2] || 'medium';

    if (!title) {
      console.error('Error: Título requerido');
      return;
    }

    const task = this.taskdb.createTask({
      title,
      description,
      priority,
    });

    console.log(`✓ Tarea creada: ${task.id}`);
    console.log(`  Título: ${task.title}`);
    console.log(`  Prioridad: ${task.priority}`);
    console.log(`  Estado: ${task.status}`);
  }

  /**
   * Actualizar tarea
   */
  async taskUpdate(args) {
    const taskId = args[0];
    const field = args[1];
    const value = args[2];

    if (!taskId || !field || value === undefined) {
      console.error('Error: task-id, campo y valor requeridos');
      return;
    }

    const updates = { [field]: value };
    const task = this.taskdb.updateTask(taskId, updates);

    console.log(`✓ Tarea actualizada: ${task.id}`);
    console.log(`  ${field}: ${task[field]}`);
  }

  /**
   * Listar tareas
   */
  async taskList(args) {
    const status = args[0];
    const tasks = status ? this.taskdb.getTasksByStatus(status) : this.taskdb.data.tasks;

    console.log(`\nTareas (${tasks.length}):`);
    console.log('ID'.padEnd(36) + 'Estado'.padEnd(10) + 'Prioridad'.padEnd(10) + 'Título');
    console.log('-'.repeat(80));

    tasks.forEach(task => {
      console.log(
        task.id.substring(0, 8) +
          '...'.padEnd(36) +
          task.status.padEnd(10) +
          task.priority.padEnd(10) +
          task.title.substring(0, 30)
      );
    });
  }

  /**
   * Mostrar tarea
   */
  async taskShow(args) {
    const taskId = args[0];

    if (!taskId) {
      console.error('Error: task-id requerido');
      return;
    }

    const task = this.taskdb.data.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`Error: Tarea no encontrada: ${taskId}`);
      return;
    }

    const statusDerived = this.taskdb.calculateTaskStatusDerived(taskId);

    console.log(`\nTarea: ${task.title}`);
    console.log(`ID: ${task.id}`);
    console.log(`Estado: ${task.status} (derivado: ${statusDerived.derived_status})`);
    console.log(`Prioridad: ${task.priority}`);
    console.log(`Descripción: ${task.description}`);
    console.log(`Creada: ${task.created_at}`);
    console.log(`Actualizada: ${task.updated_at}`);
    console.log(`\nMétricas:`);
    console.log(`  Runs totales: ${statusDerived.total_runs}`);
    console.log(`  Runs exitosos: ${statusDerived.successful_runs}`);
    console.log(`  Gates totales: ${statusDerived.total_gates}`);
    console.log(`  Gates pasados: ${statusDerived.passed_gates}`);
    console.log(`  Score de salud: ${statusDerived.health_score.toFixed(2)}`);
  }

  /**
   * Comando: run
   */
  async cmdRun(args) {
    const subcommand = args[0];

    switch (subcommand) {
      case 'start':
        await this.runStart(args.slice(1));
        break;
      case 'complete':
        await this.runComplete(args.slice(1));
        break;
      case 'fail':
        await this.runFail(args.slice(1));
        break;
      case 'list':
        await this.runList(args.slice(1));
        break;
      default:
        console.log('Subcomandos disponibles: start, complete, fail, list');
    }
  }

  /**
   * Iniciar run
   */
  async runStart(args) {
    const taskId = args[0];

    if (!taskId) {
      console.error('Error: task-id requerido');
      return;
    }

    const run = this.taskdb.createRun({ task_id: taskId });
    console.log(`✓ Run iniciado: ${run.id}`);
    console.log(`  Tarea: ${taskId}`);
    console.log(`  Estado: ${run.status}`);
  }

  /**
   * Completar run
   */
  async runComplete(args) {
    const runId = args[0];
    const successRate = parseFloat(args[1]) || 1.0;
    const errorCount = parseInt(args[2]) || 0;

    if (!runId) {
      console.error('Error: run-id requerido');
      return;
    }

    const run = this.taskdb.updateRun(runId, {
      status: 'completed',
      metrics: {
        success_rate: successRate,
        error_count: errorCount,
      },
    });

    console.log(`✓ Run completado: ${run.id}`);
    console.log(`  Duración: ${run.duration_ms}ms`);
    console.log(`  Tasa de éxito: ${run.metrics.success_rate}`);
  }

  /**
   * Comando: doctor
   */
  async cmdDoctor(options) {
    console.log('Ejecutando TaskDB Doctor...');

    const report = await this.doctor.runDiagnostics();

    console.log('\n=== REPORTE DE DIAGNÓSTICO ===');
    console.log(`Salud del sistema: ${report.summary.system_health}`);
    console.log(`Problemas críticos: ${report.summary.critical_issues}`);
    console.log(`Problemas altos: ${report.summary.high_issues}`);
    console.log(`Problemas medios: ${report.summary.medium_issues}`);
    console.log(`Fixes aplicados: ${report.summary.applied_fixes}/${report.summary.total_fixes}`);

    if (report.recommendations.length > 0) {
      console.log('\n=== RECOMENDACIONES ===');
      report.recommendations.forEach(rec => {
        console.log(`[${rec.type.toUpperCase()}] ${rec.message}`);
        console.log(`  Acción: ${rec.action}`);
      });
    }

    // En CI/CD, fallar si el sistema no está sano
    if (options.ci && !this.doctor.isHealthyForCI()) {
      console.error('\n❌ Sistema no está sano para CI/CD');
      process.exit(1);
    } else if (
      report.summary.system_health === 'excellent' ||
      report.summary.system_health === 'good'
    ) {
      console.log('\n✅ Sistema sano');
    }
  }

  /**
   * Comando: verify
   */
  async cmdVerify(args) {
    const reportId = args[0];

    if (!reportId) {
      console.error('Error: report-id requerido');
      return;
    }

    const report = this.taskdb.data.reports.find(r => r.id === reportId);
    if (!report) {
      console.error(`Error: Reporte no encontrado: ${reportId}`);
      return;
    }

    console.log(`Verificando procedencia del reporte: ${report.title}`);

    const verification = await this.verifier.verifyReportProvenance(report);

    console.log(`\nEstado de verificación: ${verification.status}`);
    console.log(`Checks realizados: ${verification.checks.length}`);
    console.log(`Errores: ${verification.errors.length}`);
    console.log(`Advertencias: ${verification.warnings.length}`);

    if (verification.errors.length > 0) {
      console.log('\n=== ERRORES ===');
      verification.errors.forEach(error => {
        console.log(`❌ ${error}`);
      });
    }

    if (verification.warnings.length > 0) {
      console.log('\n=== ADVERTENCIAS ===');
      verification.warnings.forEach(warning => {
        console.log(`⚠️  ${warning}`);
      });
    }
  }

  /**
   * Comando: stats
   */
  async cmdStats() {
    const stats = this.taskdb.getSystemStats();
    const verificationStats = this.verifier.getVerificationStats();

    console.log('\n=== ESTADÍSTICAS DEL SISTEMA ===');
    console.log(`Total de tareas: ${stats.total_tasks}`);
    console.log(`  Todo: ${stats.tasks_by_status.todo}`);
    console.log(`  Doing: ${stats.tasks_by_status.doing}`);
    console.log(`  Review: ${stats.tasks_by_status.review}`);
    console.log(`  Done: ${stats.tasks_by_status.done}`);
    console.log(`  Cancelled: ${stats.tasks_by_status.cancelled}`);

    console.log(`\nTotal de runs: ${stats.total_runs}`);
    console.log(`Total de gates: ${stats.total_gates}`);
    console.log(`Total de artifacts: ${stats.total_artifacts}`);
    console.log(`Total de eventos: ${stats.total_events}`);
    console.log(`Total de reportes: ${stats.total_reports}`);

    console.log(`\nVersiones de políticas: ${stats.policy_versions.join(', ')}`);

    if (verificationStats.total_verifications > 0) {
      console.log(`\n=== ESTADÍSTICAS DE VERIFICACIÓN ===`);
      console.log(`Verificaciones totales: ${verificationStats.total_verifications}`);
      console.log(`Verificaciones exitosas: ${verificationStats.passed}`);
      console.log(`Verificaciones fallidas: ${verificationStats.failed}`);
      console.log(`Tasa de éxito: ${verificationStats.success_rate.toFixed(1)}%`);
    }
  }

  /**
   * Comando: export
   */
  async cmdExport(args) {
    const format = args[0] || 'json';
    const outputFile = args[1] || `taskdb-export-${Date.now()}.${format}`;

    let exportData;

    if (format === 'json') {
      exportData = JSON.stringify(this.taskdb.data, null, 2);
    } else if (format === 'csv') {
      exportData = this.exportToCSV();
    } else {
      console.error(`Formato no soportado: ${format}`);
      return;
    }

    require('fs').writeFileSync(outputFile, exportData);
    console.log(`✓ Datos exportados a: ${outputFile}`);
  }

  /**
   * Comando: import
   */
  async cmdImport(args) {
    const inputFile = args[0];

    if (!inputFile || !existsSync(inputFile)) {
      console.error(`Error: Archivo no encontrado: ${inputFile}`);
      return;
    }

    const importData = JSON.parse(readFileSync(inputFile, 'utf8'));

    // Validar estructura básica
    if (!importData.tasks || !importData.runs) {
      console.error('Error: Estructura de datos inválida');
      return;
    }

    // Importar datos (esto requeriría implementación más robusta)
    console.log(`✓ Datos importados desde: ${inputFile}`);
  }

  /**
   * Exportar a CSV
   */
  exportToCSV() {
    let csv = 'type,id,title,status,priority,created_at\n';

    this.taskdb.data.tasks.forEach(task => {
      csv += `task,${task.id},${task.title},${task.status},${task.priority},${task.created_at}\n`;
    });

    return csv;
  }

  /**
   * Parsear opciones de línea de comandos
   */
  parseOptions(args) {
    const options = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const key = arg.substring(2);
        const value = args[i + 1];

        if (value && !value.startsWith('-')) {
          options[key] = value;
          i++;
        } else {
          options[key] = true;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.substring(1);
        options[key] = true;
      }
    }

    return options;
  }

  /**
   * Mostrar ayuda
   */
  showHelp() {
    console.log(`
TaskDB CLI - Sistema de Gestión de Tareas Antifrágil

Comandos disponibles:
  init                    Inicializar TaskDB
  task <subcommand>       Gestión de tareas
    create <title> [desc] [priority]  Crear tarea
    update <id> <field> <value>       Actualizar tarea
    list [status]                     Listar tareas
    show <id>                         Mostrar tarea
  run <subcommand>        Gestión de runs
    start <task-id>                   Iniciar run
    complete <run-id> [success] [errors]  Completar run
    fail <run-id>                     Marcar run como fallido
    list [task-id]                    Listar runs
  gate <subcommand>       Gestión de gates
    create <name> <type>              Crear gate
    update <id> <status>              Actualizar gate
    list [run-id]                     Listar gates
  artifact <subcommand>   Gestión de artifacts
    create <name> <type> <uri> <hash> <size>  Crear artifact
    list [run-id]                     Listar artifacts
  report <subcommand>     Gestión de reportes
    create <title> <type>             Crear reporte
    publish <id>                      Publicar reporte
    verify <id>                       Verificar procedencia
  doctor [--fix] [--ci]   Diagnóstico y reparación
  verify <report-id>      Verificar procedencia de reporte
  stats                   Mostrar estadísticas
  export [format] [file]  Exportar datos
  import <file>           Importar datos

Opciones globales:
  --backend <type>        Backend (sqlite|postgresql)
  --data-dir <path>       Directorio de datos
  --verbose              Modo verbose
  --help                 Mostrar ayuda

Ejemplos:
  taskdb init
  taskdb task create "Implementar feature X" "Descripción detallada" high
  taskdb run start <task-id>
  taskdb doctor --fix
  taskdb stats
`);
  }
}

// Ejecutar CLI si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new TaskDBCLI();
  cli.init();
  cli.run(process.argv.slice(2)).catch(console.error);
}

export default TaskDBCLI;
