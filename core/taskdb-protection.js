#!/usr/bin/env node
/**
 * TaskDB Protection System - Sistema de Protección Anti-Corrupción
 *
 * Este módulo implementa múltiples capas de protección para evitar
 * la corrupción del Task DB y garantizar su integridad.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import CentralizedLogger from './centralized-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class TaskDBProtection {
  constructor() {
    this.taskDbPath = join(PROJECT_ROOT, 'data/taskdb.json');
    this.backupDir = join(PROJECT_ROOT, '.reports/taskdb-backups');
    this.lockFile = join(PROJECT_ROOT, '.reports/taskdb.lock');
    this.schemaFile = join(PROJECT_ROOT, 'schemas/taskdb.schema.json');

    this.logger = new CentralizedLogger('taskdb-protection');

    this.initializeProtection();
  }

  /**
   * Inicializa el sistema de protección
   */
  initializeProtection() {
    // Crear directorio de backups si no existe
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }

    // Crear schema de validación si no existe
    this.createValidationSchema();

    this.logger.info('TaskDB Protection System initialized');
  }

  /**
   * Crea el schema de validación para TaskDB
   */
  createValidationSchema() {
    if (existsSync(this.schemaFile)) return;

    const schema = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      'type': 'object',
      'required': ['version', 'projects', 'tasks'],
      'properties': {
        'version': {
          'type': 'string',
          'pattern': '^\\d+\\.\\d+\\.\\d+$'
        },
        'projects': {
          'type': 'array',
          'items': {
            'type': 'object',
            'required': ['id', 'title', 'description', 'created_at', 'updated_at'],
            'properties': {
              'id': { 'type': 'string', 'minLength': 1 },
              'title': { 'type': 'string', 'minLength': 1 },
              'description': { 'type': 'string' },
              'docs': { 'type': 'array', 'items': { 'type': 'string' } },
              'features': { 'type': 'array', 'items': { 'type': 'string' } },
              'data': { 'type': 'object' },
              'github_repo': { 'type': 'string' },
              'pinned': { 'type': 'boolean' },
              'created_at': { 'type': 'string', 'format': 'date-time' },
              'updated_at': { 'type': 'string', 'format': 'date-time' }
            }
          }
        },
        'tasks': {
          'type': 'array',
          'items': {
            'type': 'object',
            'required': ['id', 'project_id', 'title', 'description', 'status', 'task_order', 'created_at', 'updated_at'],
            'properties': {
              'id': { 'type': 'string', 'minLength': 1 },
              'project_id': { 'type': 'string', 'minLength': 1 },
              'parent_task_id': { 'type': ['string', 'null'] },
              'title': { 'type': 'string', 'minLength': 1 },
              'description': { 'type': 'string' },
              'status': { 'type': 'string', 'enum': ['todo', 'doing', 'review', 'done', 'cancelled'] },
              'assignee': { 'type': 'string' },
              'task_order': { 'type': 'number', 'minimum': 1 },
              'feature': { 'type': ['string', 'null'] },
              'sources': { 'type': 'array', 'items': { 'type': 'string' } },
              'code_examples': { 'type': 'array', 'items': { 'type': 'string' } },
              'archived': { 'type': 'boolean' },
              'archived_at': { 'type': ['string', 'null'], 'format': 'date-time' },
              'archived_by': { 'type': ['string', 'null'] },
              'created_at': { 'type': 'string', 'format': 'date-time' },
              'updated_at': { 'type': ['string', 'number'] }
            }
          }
        }
      },
      'additionalProperties': false
    };

    writeFileSync(this.schemaFile, JSON.stringify(schema, null, 2));
    this.logger.info('TaskDB validation schema created');
  }

  /**
   * Valida la integridad del TaskDB
   */
  validateTaskDB() {
    this.logger.info('Starting TaskDB validation');

    const issues = [];
    const warnings = [];

    try {
      // 1. Verificar que el archivo existe
      if (!existsSync(this.taskDbPath)) {
        issues.push('TaskDB file does not exist');
        return { valid: false, issues, warnings };
      }

      // 2. Verificar que se puede leer
      let content;
      try {
        content = readFileSync(this.taskDbPath, 'utf8');
      } catch (error) {
        issues.push(`Cannot read TaskDB file: ${error.message}`);
        return { valid: false, issues, warnings };
      }

      // 3. Verificar que es JSON válido
      let taskDb;
      try {
        taskDb = JSON.parse(content);
      } catch (error) {
        issues.push(`Invalid JSON in TaskDB: ${error.message}`);
        return { valid: false, issues, warnings };
      }

      // 4. Verificar estructura básica
      if (!taskDb.version) {
        issues.push('Missing version field');
      }
      if (!Array.isArray(taskDb.projects)) {
        issues.push('Projects field is not an array');
      }
      if (!Array.isArray(taskDb.tasks)) {
        issues.push('Tasks field is not an array');
      }

      // 5. Verificar propiedades no permitidas en el nivel raíz
      const allowedRootProperties = ['version', 'projects', 'tasks'];
      const invalidProperties = Object.keys(taskDb).filter(key => !allowedRootProperties.includes(key));
      if (invalidProperties.length > 0) {
        issues.push(`Invalid root properties: ${invalidProperties.join(', ')}`);
      }

      // 6. Verificar IDs únicos
      const projectIds = new Set();
      const taskIds = new Set();

      for (const project of taskDb.projects || []) {
        if (projectIds.has(project.id)) {
          issues.push(`Duplicate project ID: ${project.id}`);
        }
        projectIds.add(project.id);
      }

      for (const task of taskDb.tasks || []) {
        if (taskIds.has(task.id)) {
          issues.push(`Duplicate task ID: ${task.id}`);
        }
        taskIds.add(task.id);
      }

      // 7. Verificar referencias de tareas a proyectos
      for (const task of taskDb.tasks || []) {
        if (task.project_id && !projectIds.has(task.project_id)) {
          warnings.push(`Task ${task.id} references non-existent project ${task.project_id}`);
        }
      }

      // 8. Verificar timestamps
      for (const project of taskDb.projects || []) {
        if (project.created_at && !this.isValidTimestamp(project.created_at)) {
          warnings.push(`Invalid created_at timestamp in project ${project.id}: ${project.created_at}`);
        }
        if (project.updated_at && !this.isValidTimestamp(project.updated_at)) {
          warnings.push(`Invalid updated_at timestamp in project ${project.id}: ${project.updated_at}`);
        }
      }

      for (const task of taskDb.tasks || []) {
        if (task.created_at && !this.isValidTimestamp(task.created_at)) {
          warnings.push(`Invalid created_at timestamp in task ${task.id}: ${task.created_at}`);
        }
        if (task.updated_at && !this.isValidTimestamp(task.updated_at)) {
          warnings.push(`Invalid updated_at timestamp in task ${task.id}: ${task.updated_at}`);
        }
      }

      const valid = issues.length === 0;

      if (valid) {
        this.logger.success('TaskDB validation passed', {
          projects: taskDb.projects?.length || 0,
          tasks: taskDb.tasks?.length || 0,
          warnings: warnings.length
        });
      } else {
        this.logger.error('TaskDB validation failed', { issues, warnings });
      }

      return { valid, issues, warnings, data: taskDb };
    } catch (error) {
      this.logger.error('TaskDB validation error', { error: error.message });
      issues.push(`Validation error: ${error.message}`);
      return { valid: false, issues, warnings };
    }
  }

  /**
   * Verifica si un timestamp es válido
   */
  isValidTimestamp(timestamp) {
    if (typeof timestamp === 'number') {
      return !isNaN(timestamp) && timestamp > 0;
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return !isNaN(date.getTime());
    }
    return false;
  }

  /**
   * Crea un backup del TaskDB
   */
  createBackup(reason = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = join(this.backupDir, `taskdb-backup-${timestamp}-${reason}.json`);

      copyFileSync(this.taskDbPath, backupPath);

      this.logger.info('TaskDB backup created', {
        backupPath,
        reason,
        timestamp
      });

      return backupPath;
    } catch (error) {
      this.logger.error('Failed to create TaskDB backup', { error: error.message });
      throw error;
    }
  }

  /**
   * Restaura TaskDB desde un backup
   */
  restoreFromBackup(backupPath) {
    try {
      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Crear backup del estado actual antes de restaurar
      this.createBackup('pre-restore');

      // Restaurar desde backup
      copyFileSync(backupPath, this.taskDbPath);

      this.logger.info('TaskDB restored from backup', { backupPath });

      // Validar después de restaurar
      const validation = this.validateTaskDB();
      if (!validation.valid) {
        this.logger.error('TaskDB is invalid after restore', { issues: validation.issues });
        throw new Error('Restored TaskDB is invalid');
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to restore TaskDB from backup', { error: error.message });
      throw error;
    }
  }

  /**
   * Escribe TaskDB con protección contra corrupción
   */
  async writeTaskDB(data, reason = 'update') {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new Error('Could not acquire lock for TaskDB write');
    }

    try {
      // 1. Validar datos antes de escribir
      const validation = this.validateTaskDBData(data);
      if (!validation.valid) {
        throw new Error(`Invalid TaskDB data: ${validation.issues.join(', ')}`);
      }

      // 2. Crear backup antes de escribir
      this.createBackup(`pre-${reason}`);

      // 3. Escribir a archivo temporal primero
      const tempPath = `${this.taskDbPath}.tmp`;
      const jsonData = JSON.stringify(data, null, 2);
      writeFileSync(tempPath, jsonData);

      // 4. Validar que el archivo temporal es válido
      const tempValidation = this.validateTaskDBFile(tempPath);
      if (!tempValidation.valid) {
        throw new Error(`Temporary file is invalid: ${tempValidation.issues.join(', ')}`);
      }

      // 5. Reemplazar archivo original
      copyFileSync(tempPath, this.taskDbPath);

      // 6. Limpiar archivo temporal
      const { unlinkSync } = await import('node:fs');
      unlinkSync(tempPath);

      this.logger.info('TaskDB written successfully', {
        reason,
        projects: data.projects?.length || 0,
        tasks: data.tasks?.length || 0
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to write TaskDB', { error: error.message, reason });
      throw error;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Valida datos de TaskDB antes de escribir
   */
  validateTaskDBData(data) {
    const issues = [];

    if (!data || typeof data !== 'object') {
      issues.push('Data must be an object');
      return { valid: false, issues };
    }

    if (!data.version || typeof data.version !== 'string') {
      issues.push('Version must be a string');
    }

    if (!Array.isArray(data.projects)) {
      issues.push('Projects must be an array');
    }

    if (!Array.isArray(data.tasks)) {
      issues.push('Tasks must be an array');
    }

    // Verificar propiedades no permitidas
    const allowedProperties = ['version', 'projects', 'tasks'];
    const invalidProperties = Object.keys(data).filter(key => !allowedProperties.includes(key));
    if (invalidProperties.length > 0) {
      issues.push(`Invalid properties: ${invalidProperties.join(', ')}`);
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Valida un archivo TaskDB
   */
  validateTaskDBFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      return this.validateTaskDBData(data);
    } catch (error) {
      return { valid: false, issues: [error.message] };
    }
  }

  /**
   * Adquiere un lock para escritura
   */
  async acquireLock() {
    try {
      if (existsSync(this.lockFile)) {
        const lockContent = readFileSync(this.lockFile, 'utf8');
        const lockData = JSON.parse(lockContent);
        const lockTime = new Date(lockData.timestamp);
        const now = new Date();

        // Si el lock es más viejo que 5 minutos, considerarlo expirado
        if (now.getTime() - lockTime.getTime() > 5 * 60 * 1000) {
          this.logger.warn('Removing expired lock');
          const { unlinkSync } = require('node:fs');
          unlinkSync(this.lockFile);
        } else {
          return false; // Lock activo
        }
      }

      const lockData = {
        timestamp: new Date().toISOString(),
        pid: process.pid
      };

      writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));
      return true;
    } catch (error) {
      this.logger.error('Failed to acquire lock', { error: error.message });
      return false;
    }
  }

  /**
   * Libera el lock
   */
  async releaseLock() {
    try {
      if (existsSync(this.lockFile)) {
        const { unlinkSync } = await import('node:fs');
        unlinkSync(this.lockFile);
      }
    } catch (error) {
      this.logger.error('Failed to release lock', { error: error.message });
    }
  }

  /**
   * Auto-repara TaskDB si está corrupto
   */
  async autoRepair() {
    this.logger.info('Starting TaskDB auto-repair');

    const validation = this.validateTaskDB();
    if (validation.valid) {
      this.logger.info('TaskDB is valid, no repair needed');
      return { repaired: false, issues: [] };
    }

    this.logger.warn('TaskDB corruption detected, attempting repair', {
      issues: validation.issues
    });

    try {
      // 1. Crear backup del estado corrupto
      this.createBackup('pre-repair');

      // 2. Intentar reparar
      const repairedData = this.repairTaskDB(validation.data);

      // 3. Escribir datos reparados
      await this.writeTaskDB(repairedData, 'auto-repair');

      // 4. Validar reparación
      const postRepairValidation = this.validateTaskDB();
      if (postRepairValidation.valid) {
        this.logger.success('TaskDB auto-repair completed successfully');
        return { repaired: true, issues: validation.issues };
      } else {
        this.logger.error('TaskDB auto-repair failed', {
          issues: postRepairValidation.issues
        });
        return { repaired: false, issues: postRepairValidation.issues };
      }
    } catch (error) {
      this.logger.error('TaskDB auto-repair error', { error: error.message });
      return { repaired: false, issues: [error.message] };
    }
  }

  /**
   * Repara datos corruptos de TaskDB
   */
  repairTaskDB(data) {
    const repaired = {
      version: data.version || '1.0.0',
      projects: Array.isArray(data.projects) ? data.projects : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : []
    };

    // Remover propiedades inválidas del nivel raíz
    const allowedProperties = ['version', 'projects', 'tasks'];
    Object.keys(data).forEach(key => {
      if (!allowedProperties.includes(key)) {
        this.logger.warn(`Removing invalid property: ${key}`);
      }
    });

    // Limpiar proyectos
    repaired.projects = repaired.projects.filter(project => {
      return project && typeof project === 'object' && project.id && project.title;
    });

    // Limpiar tareas
    repaired.tasks = repaired.tasks.filter(task => {
      return task && typeof task === 'object' && task.id && task.project_id && task.title;
    });

    this.logger.info('TaskDB data repaired', {
      projects: repaired.projects.length,
      tasks: repaired.tasks.length
    });

    return repaired;
  }

  /**
   * Lista backups disponibles
   */
  async listBackups() {
    try {
      const { readdirSync, statSync } = await import('node:fs');
      const files = readdirSync(this.backupDir)
        .filter(file => file.startsWith('taskdb-backup-') && file.endsWith('.json'))
        .map(file => {
          const filePath = join(this.backupDir, file);
          const stats = statSync(filePath);
          return {
            file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      this.logger.error('Failed to list backups', { error: error.message });
      return [];
    }
  }

  /**
   * Limpia backups antiguos
   */
  async cleanOldBackups(keepDays = 7) {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date(Date.now() - (keepDays * 24 * 60 * 60 * 1000));

      const oldBackups = backups.filter(backup => backup.created < cutoffDate);

      for (const backup of oldBackups) {
        const { unlinkSync } = await import('node:fs');
        unlinkSync(backup.path);
        this.logger.info('Removed old backup', { file: backup.file });
      }

      this.logger.info('Backup cleanup completed', {
        removed: oldBackups.length,
        kept: backups.length - oldBackups.length
      });

      return { removed: oldBackups.length, kept: backups.length - oldBackups.length };
    } catch (error) {
      this.logger.error('Failed to clean old backups', { error: error.message });
      return { removed: 0, kept: 0 };
    }
  }
}

// Exportar para uso como módulo
export default TaskDBProtection;

// Si se ejecuta directamente, ejecutar validación
if (import.meta.url === `file://${process.argv[1]}`) {
  const protection = new TaskDBProtection();

  if (process.argv.includes('--repair')) {
    protection.autoRepair().then(result => {
      if (result.repaired) {
        console.log('✅ TaskDB repaired successfully');
      } else {
        console.log('❌ TaskDB repair failed:', result.issues);
        process.exit(1);
      }
    });
  } else if (process.argv.includes('--backup')) {
    const backupPath = protection.createBackup('manual');
    console.log(`✅ Backup created: ${backupPath}`);
  } else if (process.argv.includes('--list-backups')) {
    protection.listBackups().then(backups => {
      console.log('📋 Available backups:');
      backups.forEach(backup => {
        console.log(`  ${backup.file} (${backup.size} bytes, ${backup.created.toISOString()})`);
      });
    });
  } else {
    const validation = protection.validateTaskDB();
    if (validation.valid) {
      console.log('✅ TaskDB is valid');
    } else {
      console.log('❌ TaskDB validation failed:');
      validation.issues.forEach(issue => console.log(`  - ${issue}`));
      process.exit(1);
    }
  }
}
