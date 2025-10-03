/**
 * Job de Materialización de Snapshots
 * Plan Maestro TaskDB - OLA 2: Antifrágil
 *
 * Optimiza el rendimiento del ProvenanceVerifier materializando
 * el estado final de las tareas cerradas en lugar de reconstruir
 * desde el log de eventos.
 */

import TaskDBCore from '../taskdb-core.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

class SnapshotMaterializer {
  constructor(taskDbConfig, options = {}) {
    this.taskdb = new TaskDBCore(taskDbConfig);
    this.options = {
      batchSize: options.batchSize || 100,
      maxAge: options.maxAge || 180, // días
      archiveDir: options.archiveDir || join(PROJECT_ROOT, '.reports/snapshots'),
      dryRun: options.dryRun || false,
      ...options,
    };

    this.materializedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
    this.errors = [];
  }

  /**
   * Ejecutar job de materialización de snapshots
   */
  async runMaterializeSnapshots() {
    console.log('🚀 Iniciando job de materialización de snapshots...');
    console.log(
      `📊 Configuración: batch=${this.options.batchSize}, max_age=${this.options.maxAge} días`
    );

    try {
      // Crear directorio de snapshots si no existe
      if (!existsSync(this.options.archiveDir)) {
        mkdirSync(this.options.archiveDir, { recursive: true });
        console.log(`📁 Directorio de snapshots creado: ${this.options.archiveDir}`);
      }

      // Obtener tareas cerradas que necesitan materialización
      const closedTasks = await this.getClosedTasksNeedingMaterialization();
      console.log(`📋 Tareas cerradas encontradas: ${closedTasks.length}`);

      if (closedTasks.length === 0) {
        console.log('✅ No hay tareas que requieran materialización');
        return this.generateReport();
      }

      // Procesar en lotes
      const batches = this.chunkArray(closedTasks, this.options.batchSize);
      console.log(`📦 Procesando en ${batches.length} lotes de ${this.options.batchSize}`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n🔄 Procesando lote ${i + 1}/${batches.length} (${batch.length} tareas)`);

        await this.processBatch(batch);

        // Pausa entre lotes para no sobrecargar el sistema
        if (i < batches.length - 1) {
          await this.sleep(1000); // 1 segundo
        }
      }

      console.log('\n🏆 Job de materialización completado');
      return this.generateReport();
    } catch (error) {
      console.error('❌ Error durante materialización:', error.message);
      this.errorCount++;
      this.errors.push({
        type: 'critical',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      this.taskdb.close();
    }
  }

  /**
   * Obtener tareas cerradas que necesitan materialización
   */
  async getClosedTasksNeedingMaterialization() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.maxAge);

    // Obtener tareas completadas que no tienen snapshot materializado
    const tasks = this.taskdb.data.tasks.filter(task => {
      const isCompleted = task.status === 'completed';
      const isNotMaterialized = !task.metadata?.snapshot_materialized_at;
      const isWithinAge = new Date(task.completed_at || task.updated_at) >= cutoffDate;

      return isCompleted && isNotMaterialized && isWithinAge;
    });

    return tasks.sort(
      (a, b) => new Date(a.completed_at || a.updated_at) - new Date(b.completed_at || b.updated_at)
    );
  }

  /**
   * Procesar un lote de tareas
   */
  async processBatch(tasks) {
    for (const task of tasks) {
      try {
        await this.materializeTaskSnapshot(task);
        this.materializedCount++;

        if (this.materializedCount % 10 === 0) {
          console.log(`  ✅ Materializadas: ${this.materializedCount}/${tasks.length}`);
        }
      } catch (error) {
        console.error(`  ❌ Error materializando tarea ${task.id}: ${error.message}`);
        this.errorCount++;
        this.errors.push({
          type: 'materialization_error',
          task_id: task.id,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Materializar snapshot de una tarea específica
   */
  async materializeTaskSnapshot(task) {
    const taskId = task.id;
    const completedAt = task.completed_at || task.updated_at;

    console.log(`  🔍 Materializando snapshot para tarea: ${taskId.substring(0, 8)}...`);

    // 1. Reconstruir el estado final de la tarea
    const finalState = await this.reconstructTaskFinalState(taskId, completedAt);

    // 2. Crear snapshot materializado
    const snapshot = {
      task_id: taskId,
      task_title: task.title,
      task_status: task.status,
      task_priority: task.priority,
      completed_at: completedAt,
      materialized_at: new Date().toISOString(),
      final_state: finalState,
      metadata: {
        policy_version: task.policy_version,
        feature: task.feature,
        tags: task.tags || [],
      },
    };

    // 3. Guardar snapshot en archivo
    if (!this.options.dryRun) {
      const snapshotPath = join(this.options.archiveDir, `snapshot-${taskId}.json`);
      writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

      // 4. Marcar tarea como materializada
      this.taskdb.updateTask(taskId, {
        metadata: {
          ...task.metadata,
          snapshot_materialized_at: new Date().toISOString(),
          snapshot_path: snapshotPath,
        },
      });
    }

    console.log(`  ✅ Snapshot materializado: ${taskId.substring(0, 8)}...`);
  }

  /**
   * Reconstruir el estado final de una tarea al momento de completarse
   */
  async reconstructTaskFinalState(taskId, completedAt) {
    const completedDate = new Date(completedAt);

    // Obtener runs de la tarea al momento de completarse
    const runsAtCompletion = this.taskdb.data.runs.filter(run => {
      const runStartTime = new Date(run.start_time);
      return run.task_id === taskId && runStartTime <= completedDate;
    });

    // Obtener gates de los runs al momento de completarse
    const gatesAtCompletion = this.taskdb.data.gates.filter(gate => {
      const gateCreatedAt = new Date(gate.created_at);
      const run = runsAtCompletion.find(r => r.id === gate.run_id);
      return run && gateCreatedAt <= completedDate;
    });

    // Obtener artifacts de los runs al momento de completarse
    const artifactsAtCompletion = this.taskdb.data.artifacts.filter(artifact => {
      const artifactCreatedAt = new Date(artifact.created_at);
      const run = runsAtCompletion.find(r => r.id === artifact.run_id);
      return run && artifactCreatedAt <= completedDate;
    });

    // Calcular métricas finales
    const totalRuns = runsAtCompletion.length;
    const successfulRuns = runsAtCompletion.filter(r => r.status === 'completed').length;
    const totalGates = gatesAtCompletion.length;
    const passedGates = gatesAtCompletion.filter(g => g.status === 'pass').length;
    const failedGates = gatesAtCompletion.filter(g => g.status === 'fail').length;
    const totalArtifacts = artifactsAtCompletion.length;

    const healthScore =
      totalRuns === 0
        ? 0.0
        : (successfulRuns / totalRuns) * (totalGates === 0 ? 1 : passedGates / totalGates);

    return {
      runs: {
        total: totalRuns,
        successful: successfulRuns,
        failed: totalRuns - successfulRuns,
      },
      gates: {
        total: totalGates,
        passed: passedGates,
        failed: failedGates,
      },
      artifacts: {
        total: totalArtifacts,
        types: artifactsAtCompletion.reduce((acc, artifact) => {
          acc[artifact.type] = (acc[artifact.type] || 0) + 1;
          return acc;
        }, {}),
      },
      metrics: {
        health_score: healthScore,
        success_rate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
        gate_pass_rate: totalGates > 0 ? (passedGates / totalGates) * 100 : 0,
      },
      timeline: {
        first_run: runsAtCompletion.length > 0 ? runsAtCompletion[0].start_time : null,
        last_run:
          runsAtCompletion.length > 0
            ? runsAtCompletion[runsAtCompletion.length - 1].start_time
            : null,
        completion_time: completedAt,
      },
    };
  }

  /**
   * Dividir array en chunks
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Pausa por milisegundos
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generar reporte del job
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      job_type: 'snapshot_materialization',
      configuration: {
        batch_size: this.options.batchSize,
        max_age_days: this.options.maxAge,
        archive_dir: this.options.archiveDir,
        dry_run: this.options.dryRun,
      },
      results: {
        materialized_count: this.materializedCount,
        skipped_count: this.skippedCount,
        error_count: this.errorCount,
        total_processed: this.materializedCount + this.skippedCount + this.errorCount,
      },
      errors: this.errors,
      recommendations: this.generateRecommendations(),
    };

    // Guardar reporte
    const reportPath = join(this.options.archiveDir, `materialization-report-${Date.now()}.json`);
    if (!this.options.dryRun) {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Reporte guardado: ${reportPath}`);
    }

    return report;
  }

  /**
   * Generar recomendaciones basadas en los resultados
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.errorCount > 0) {
      recommendations.push({
        type: 'error',
        message: `${this.errorCount} errores durante materialización`,
        action: 'Revisar logs de errores y corregir problemas de datos',
      });
    }

    if (this.materializedCount > 100) {
      recommendations.push({
        type: 'performance',
        message: 'Gran volumen de materialización',
        action: 'Considerar aumentar batch_size o ejecutar en horarios de menor carga',
      });
    }

    if (this.errorCount > this.materializedCount * 0.1) {
      recommendations.push({
        type: 'quality',
        message: 'Alta tasa de errores en materialización',
        action: 'Investigar y corregir problemas sistemáticos en los datos',
      });
    }

    if (this.materializedCount === 0) {
      recommendations.push({
        type: 'info',
        message: 'No se materializaron snapshots',
        action: 'Verificar que hay tareas completadas que requieren materialización',
      });
    }

    return recommendations;
  }
}

/**
 * Función principal para ejecutar el job
 */
export async function runMaterializeSnapshots(options = {}) {
  const materializer = new SnapshotMaterializer(
    {
      dataDir: join(PROJECT_ROOT, 'data'),
      dbFile: 'taskdb.sqlite',
    },
    options
  );

  return await materializer.runMaterializeSnapshots();
}

/**
 * Función para ejecutar desde CLI
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  // Parsear argumentos de línea de comandos
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--batch-size':
        options.batchSize = parseInt(value);
        break;
      case '--max-age':
        options.maxAge = parseInt(value);
        break;
      case '--archive-dir':
        options.archiveDir = value;
        break;
      case '--dry-run':
        options.dryRun = true;
        i--; // No hay valor para este flag
        break;
      default:
        console.log(`Argumento desconocido: ${key}`);
        process.exit(1);
    }
  }

  console.log('🚀 Ejecutando job de materialización de snapshots...');
  console.log('📋 Opciones:', options);

  runMaterializeSnapshots(options)
    .then(report => {
      console.log('\n📊 RESUMEN DEL JOB:');
      console.log(`✅ Materializadas: ${report.results.materialized_count}`);
      console.log(`⏭️  Omitidas: ${report.results.skipped_count}`);
      console.log(`❌ Errores: ${report.results.error_count}`);
      console.log(`📈 Total procesadas: ${report.results.total_processed}`);

      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMENDACIONES:');
        report.recommendations.forEach(rec => {
          console.log(`  - [${rec.type.toUpperCase()}] ${rec.message} -> ${rec.action}`);
        });
      }
    })
    .catch(error => {
      console.error('❌ Error ejecutando job:', error.message);
      process.exit(1);
    });
}

export default SnapshotMaterializer;
