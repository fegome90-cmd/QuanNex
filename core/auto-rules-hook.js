#!/usr/bin/env node
/**
 * Auto Rules Hook - Hook de Integración Automática
 *
 * Este hook se ejecuta automáticamente para asegurar que el agente de rules
 * esté siempre activo y obligue a la IA de Cursor a seguir las reglas del proyecto.
 */

import RulesEnforcer from './rules-enforcer.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class AutoRulesHook {
  constructor() {
    this.enforcer = new RulesEnforcer();
    this.hookConfigPath = join(PROJECT_ROOT, '.reports/rules-hook-config.json');
    this.lastExecutionPath = join(
      PROJECT_ROOT,
      '.reports/last-rules-execution.json'
    );
  }

  /**
   * Ejecuta el hook automáticamente
   */
  async executeHook(context = {}) {
    try {
      console.log('🪝 [AUTO-RULES-HOOK] Ejecutando hook automático...');

      // Verificar si debe ejecutarse
      if (!(await this.shouldExecute())) {
        console.log(
          '⏭️  [AUTO-RULES-HOOK] Hook omitido (no es necesario ejecutar)'
        );
        return;
      }

      // Ejecutar enforcement completo
      const result = await this.enforcer.runFullEnforcement(context);

      // Registrar ejecución
      await this.recordExecution(result, context);

      // Aplicar acciones post-ejecución
      await this.applyPostExecutionActions(result, context);

      console.log('✅ [AUTO-RULES-HOOK] Hook ejecutado exitosamente');
      return result;
    } catch (error) {
      console.error('❌ [AUTO-RULES-HOOK] Error en hook:', error.message);
      await this.recordError(error, context);
      throw error;
    }
  }

  /**
   * Verifica si el hook debe ejecutarse
   */
  async shouldExecute() {
    try {
      // Verificar configuración del hook
      const config = await this.loadHookConfig();

      // Verificar última ejecución
      const lastExecution = await this.loadLastExecution();

      if (!lastExecution) {
        console.log('🆕 [AUTO-RULES-HOOK] Primera ejecución');
        return true;
      }

      const now = new Date();
      const lastExec = new Date(lastExecution.timestamp);
      const timeDiff = now - lastExec;

      // Ejecutar si han pasado más de 5 minutos
      if (timeDiff > 5 * 60 * 1000) {
        console.log('⏰ [AUTO-RULES-HOOK] Tiempo suficiente transcurrido');
        return true;
      }

      // Ejecutar si hay cambios en archivos críticos
      if (await this.hasCriticalFileChanges(lastExecution.timestamp)) {
        console.log(
          '📝 [AUTO-RULES-HOOK] Cambios en archivos críticos detectados'
        );
        return true;
      }

      // Ejecutar si hay violaciones pendientes
      if (lastExecution.violations && lastExecution.violations.length > 0) {
        console.log('⚠️  [AUTO-RULES-HOOK] Violaciones pendientes');
        return true;
      }

      return false;
    } catch (error) {
      console.log(
        '🔄 [AUTO-RULES-HOOK] Error verificando ejecución, ejecutando por seguridad'
      );
      return true;
    }
  }

  /**
   * Carga la configuración del hook
   */
  async loadHookConfig() {
    if (!existsSync(this.hookConfigPath)) {
      const defaultConfig = {
        enabled: true,
        executionInterval: 300000, // 5 minutos
        criticalFiles: [
          'docs/AGENTS.md',
          'docs/audits/2025-09-initial-gap.md',
          'data/taskdb.json',
          'orchestration/orchestrator.js'
        ],
        autoFix: true,
        strictMode: true
      };
      writeFileSync(
        this.hookConfigPath,
        JSON.stringify(defaultConfig, null, 2)
      );
      return defaultConfig;
    }

    return JSON.parse(readFileSync(this.hookConfigPath, 'utf8'));
  }

  /**
   * Carga la última ejecución
   */
  async loadLastExecution() {
    if (!existsSync(this.lastExecutionPath)) {
      return null;
    }

    return JSON.parse(readFileSync(this.lastExecutionPath, 'utf8'));
  }

  /**
   * Verifica si hay cambios en archivos críticos
   */
  async hasCriticalFileChanges(sinceTimestamp) {
    try {
      const config = await this.loadHookConfig();
      const since = new Date(sinceTimestamp);

      for (const file of config.criticalFiles) {
        const filePath = join(PROJECT_ROOT, file);
        if (existsSync(filePath)) {
          const { statSync } = await import('node:fs');
          const stats = statSync(filePath);
          if (stats.mtime > since) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.log(
        '⚠️  [AUTO-RULES-HOOK] Error verificando cambios:',
        error.message
      );
      return true; // Por seguridad, asumir que hay cambios
    }
  }

  /**
   * Registra la ejecución del hook
   */
  async recordExecution(result, context) {
    const execution = {
      timestamp: new Date().toISOString(),
      context: context,
      result: result,
      violations: result.violations || [],
      advice: result.advice || [],
      success: true
    };

    writeFileSync(this.lastExecutionPath, JSON.stringify(execution, null, 2));
  }

  /**
   * Registra errores
   */
  async recordError(error, context) {
    const execution = {
      timestamp: new Date().toISOString(),
      context: context,
      error: {
        message: error.message,
        stack: error.stack
      },
      success: false
    };

    writeFileSync(this.lastExecutionPath, JSON.stringify(execution, null, 2));
  }

  /**
   * Aplica acciones post-ejecución
   */
  async applyPostExecutionActions(result, context) {
    console.log('🔄 [AUTO-RULES-HOOK] Aplicando acciones post-ejecución...');

    // Verificar si hay violaciones críticas
    if (result.violations && result.violations.length > 0) {
      console.log(
        '⚠️  [AUTO-RULES-HOOK] Violaciones detectadas, aplicando correcciones...'
      );
      await this.applyViolationFixes(result.violations);
    }

    // Verificar si hay consejos importantes
    if (result.advice && result.advice.length > 0) {
      console.log('💡 [AUTO-RULES-HOOK] Aplicando consejos...');
      await this.applyAdvice(result.advice);
    }

    // Verificar integridad del Task DB
    await this.ensureTaskDbIntegrity();

    console.log('✅ [AUTO-RULES-HOOK] Acciones post-ejecución completadas');
  }

  /**
   * Aplica correcciones para violaciones
   */
  async applyViolationFixes(violations) {
    for (const violation of violations) {
      if (violation.includes('missing:')) {
        const missingFile = violation.replace('missing:', '');
        console.log(
          `📝 [AUTO-RULES-HOOK] Creando archivo faltante: ${missingFile}`
        );
        await this.enforcer.createMissingFile(missingFile);
      } else if (violation.includes('empty:')) {
        const emptyFile = violation.replace('empty:', '');
        console.log(
          `📝 [AUTO-RULES-HOOK] Poblando archivo vacío: ${emptyFile}`
        );
        await this.enforcer.populateEmptyFile(emptyFile);
      }
    }
  }

  /**
   * Aplica consejos
   */
  async applyAdvice(advice) {
    for (const adviceItem of advice) {
      if (adviceItem.includes('All policies must be enforced')) {
        console.log('🔒 [AUTO-RULES-HOOK] Activando modo estricto');
        await this.activateStrictMode();
      }
    }
  }

  /**
   * Activa modo estricto
   */
  async activateStrictMode() {
    const config = await this.loadHookConfig();
    config.strictMode = true;
    config.autoFix = true;
    writeFileSync(this.hookConfigPath, JSON.stringify(config, null, 2));
  }

  /**
   * Asegura la integridad del Task DB
   */
  async ensureTaskDbIntegrity() {
    try {
      const taskDbPath = join(PROJECT_ROOT, 'data/taskdb.json');
      if (!existsSync(taskDbPath)) {
        console.log('📝 [AUTO-RULES-HOOK] Task DB no existe, creando...');
        await this.enforcer.createTaskDb();
      }

      const taskDb = JSON.parse(readFileSync(taskDbPath, 'utf8'));

      // Verificar que el proyecto de gaps existe
      const gapsProject = taskDb.projects.find(
        p => p.id === 'gaps-repair-2025-10-01'
      );
      if (!gapsProject) {
        console.log(
          '📝 [AUTO-RULES-HOOK] Proyecto de gaps faltante, creando...'
        );
        await this.enforcer.createGapsProject(taskDb);
      }

      console.log('✅ [AUTO-RULES-HOOK] Integridad del Task DB verificada');
    } catch (error) {
      console.error(
        '❌ [AUTO-RULES-HOOK] Error verificando integridad Task DB:',
        error.message
      );
    }
  }

  /**
   * Ejecuta el hook en modo continuo (para desarrollo)
   */
  async runContinuous() {
    console.log('🔄 [AUTO-RULES-HOOK] Iniciando modo continuo...');

    while (true) {
      try {
        await this.executeHook();
        await new Promise(resolve => setTimeout(resolve, 60000)); // Esperar 1 minuto
      } catch (error) {
        console.error(
          '❌ [AUTO-RULES-HOOK] Error en modo continuo:',
          error.message
        );
        await new Promise(resolve => setTimeout(resolve, 30000)); // Esperar 30 segundos en caso de error
      }
    }
  }
}

// Exportar para uso como módulo
export default AutoRulesHook;

// Si se ejecuta directamente, ejecutar hook
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new AutoRulesHook();

  const args = process.argv.slice(2);
  if (args.includes('--continuous')) {
    hook.runContinuous();
  } else {
    hook
      .executeHook()
      .then(result => {
        console.log('🎯 [AUTO-RULES-HOOK] Hook completado exitosamente');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ [AUTO-RULES-HOOK] Error en hook:', error.message);
        process.exit(1);
      });
  }
}
