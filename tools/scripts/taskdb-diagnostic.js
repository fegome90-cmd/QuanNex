#!/usr/bin/env node

/**
 * Script de diagnóstico para detectar corrupción en TaskDB
 * Analiza data/taskdb.json en busca de inconsistencias y problemas
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaskDBDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.taskdbPath = path.join(__dirname, '..', 'data', 'taskdb.json');
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);

    if (type === 'ERROR') {
      this.issues.push(message);
    } else if (type === 'WARN') {
      this.warnings.push(message);
    }
  }

  loadTaskDB() {
    try {
      const content = fs.readFileSync(this.taskdbPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.log(`Error loading TaskDB: ${error.message}`, 'ERROR');
      return null;
    }
  }

  validateJSONStructure(data) {
    this.log('=== VALIDACIÓN DE ESTRUCTURA JSON ===');

    if (!data) {
      this.log('TaskDB data is null or undefined', 'ERROR');
      return false;
    }

    // Verificar campos raíz requeridos
    const requiredFields = ['version', 'projects', 'tasks'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        this.log(`Campo raíz requerido faltante: ${field}`, 'ERROR');
      }
    }

    // Verificar que projects y tasks sean arrays
    if (!Array.isArray(data.projects)) {
      this.log('Campo "projects" debe ser un array', 'ERROR');
    }

    if (!Array.isArray(data.tasks)) {
      this.log('Campo "tasks" debe ser un array', 'ERROR');
    }

    return true;
  }

  validateProjects(data) {
    this.log('=== VALIDACIÓN DE PROYECTOS ===');

    if (!Array.isArray(data.projects)) return;

    const projectIds = new Set();

    data.projects.forEach((project, index) => {
      const projectNum = index + 1;

      // Verificar campos requeridos
      const requiredFields = ['id', 'title', 'created_at', 'updated_at'];
      for (const field of requiredFields) {
        if (!(field in project)) {
          this.log(
            `Proyecto ${projectNum}: Campo requerido faltante: ${field}`,
            'ERROR'
          );
        }
      }

      // Verificar ID único
      if (project.id) {
        if (projectIds.has(project.id)) {
          this.log(
            `Proyecto ${projectNum}: ID duplicado: ${project.id}`,
            'ERROR'
          );
        }
        projectIds.add(project.id);
      }

      // Verificar timestamps válidos
      if (project.created_at && project.updated_at) {
        const created = new Date(project.created_at);
        const updated = new Date(project.updated_at);

        if (isNaN(created.getTime())) {
          this.log(
            `Proyecto ${projectNum}: Timestamp created_at inválido: ${project.created_at}`,
            'ERROR'
          );
        }

        if (isNaN(updated.getTime())) {
          this.log(
            `Proyecto ${projectNum}: Timestamp updated_at inválido: ${project.updated_at}`,
            'ERROR'
          );
        }

        if (created > updated) {
          this.log(
            `Proyecto ${projectNum}: created_at es posterior a updated_at`,
            'WARN'
          );
        }
      }

      // Verificar estructura de campos opcionales
      if (project.docs && !Array.isArray(project.docs)) {
        this.log(
          `Proyecto ${projectNum}: Campo "docs" debe ser un array`,
          'ERROR'
        );
      }

      if (project.features && !Array.isArray(project.features)) {
        this.log(
          `Proyecto ${projectNum}: Campo "features" debe ser un array`,
          'ERROR'
        );
      }
    });
  }

  validateTasks(data) {
    this.log('=== VALIDACIÓN DE TAREAS ===');

    if (!Array.isArray(data.tasks)) return;

    const taskIds = new Set();
    const projectIds = new Set(data.projects?.map(p => p.id) || []);

    data.tasks.forEach((task, index) => {
      const taskNum = index + 1;

      // Verificar campos requeridos
      const requiredFields = [
        'id',
        'project_id',
        'title',
        'status',
        'created_at',
        'updated_at'
      ];
      for (const field of requiredFields) {
        if (!(field in task)) {
          this.log(
            `Tarea ${taskNum}: Campo requerido faltante: ${field}`,
            'ERROR'
          );
        }
      }

      // Verificar ID único
      if (task.id) {
        if (taskIds.has(task.id)) {
          this.log(`Tarea ${taskNum}: ID duplicado: ${task.id}`, 'ERROR');
        }
        taskIds.add(task.id);
      }

      // Verificar que project_id existe
      if (task.project_id && !projectIds.has(task.project_id)) {
        this.log(
          `Tarea ${taskNum}: project_id no existe: ${task.project_id}`,
          'ERROR'
        );
      }

      // Verificar timestamps válidos
      if (task.created_at && task.updated_at) {
        const created = new Date(task.created_at);
        const updated = new Date(task.updated_at);

        if (isNaN(created.getTime())) {
          this.log(
            `Tarea ${taskNum}: Timestamp created_at inválido: ${task.created_at}`,
            'ERROR'
          );
        }

        if (isNaN(updated.getTime())) {
          this.log(
            `Tarea ${taskNum}: Timestamp updated_at inválido: ${task.updated_at}`,
            'ERROR'
          );
        }

        if (created > updated) {
          this.log(
            `Tarea ${taskNum}: created_at es posterior a updated_at`,
            'WARN'
          );
        }
      }

      // Verificar campos opcionales
      if (task.parent_task_id && !taskIds.has(task.parent_task_id)) {
        this.log(
          `Tarea ${taskNum}: parent_task_id no existe: ${task.parent_task_id}`,
          'WARN'
        );
      }
    });
  }

  validateCrossReferences(data) {
    this.log('=== VALIDACIÓN DE REFERENCIAS CRUZADAS ===');

    if (!Array.isArray(data.projects) || !Array.isArray(data.tasks)) return;

    // Verificar que todos los proyectos tienen tareas
    const projectsWithTasks = new Set(data.tasks?.map(t => t.project_id) || []);
    const allProjectIds = new Set(data.projects?.map(p => p.id) || []);

    for (const projectId of allProjectIds) {
      if (!projectsWithTasks.has(projectId)) {
        this.log(`Proyecto sin tareas: ${projectId}`, 'WARN');
      }
    }

    // Verificar tareas huérfanas (sin proyecto válido)
    for (const task of data.tasks) {
      if (task.project_id && !allProjectIds.has(task.project_id)) {
        this.log(`Tarea huérfana (project_id inválido): ${task.id}`, 'ERROR');
      }
    }
  }

  validateSchemaConsistency(data) {
    this.log('=== VALIDACIÓN DE CONSISTENCIA DE ESQUEMA ===');

    if (!Array.isArray(data.projects)) return;

    // Analizar estructura de proyectos para detectar inconsistencias
    const projectSchemas = data.projects.map((project, index) => {
      const schema = {};
      Object.keys(project).forEach(key => {
        const value = project[key];
        if (Array.isArray(value)) {
          schema[key] = `array[${value.length}]`;
        } else if (value === null) {
          schema[key] = 'null';
        } else if (typeof value === 'object') {
          schema[key] = 'object';
        } else {
          schema[key] = typeof value;
        }
      });
      return { index: index + 1, id: project.id, schema };
    });

    // Comparar esquemas y detectar diferencias
    const baseSchema = projectSchemas[0]?.schema;
    if (baseSchema) {
      projectSchemas.forEach(({ index, id, schema }) => {
        const differences = [];

        // Campos faltantes en este proyecto
        Object.keys(baseSchema).forEach(key => {
          if (!(key in schema)) {
            differences.push(`campo faltante: ${key}`);
          }
        });

        // Campos adicionales en este proyecto
        Object.keys(schema).forEach(key => {
          if (!(key in baseSchema)) {
            differences.push(`campo adicional: ${key}`);
          }
        });

        if (differences.length > 0) {
          this.log(
            `Proyecto ${index} (${id}): diferencias de esquema - ${differences.join(', ')}`,
            'WARN'
          );
        }
      });
    }

    // Verificar timestamps idénticos (posible problema de actualización)
    data.projects.forEach((project, index) => {
      if (project.created_at === project.updated_at) {
        this.log(
          `Proyecto ${index + 1} (${project.id}): timestamps idénticos - posible problema de actualización`,
          'WARN'
        );
      }
    });

    // Verificar proyectos con campos vacíos vs campos completos
    const projectsWithEmptyArrays = data.projects.filter(
      p =>
        (Array.isArray(p.docs) && p.docs.length === 0) ||
        (Array.isArray(p.features) && p.features.length === 0) ||
        p.data === null ||
        (typeof p.data === 'object' && Object.keys(p.data).length === 0)
    );

    const projectsWithFullData = data.projects.filter(
      p =>
        (Array.isArray(p.docs) && p.docs.length > 0) ||
        (Array.isArray(p.features) && p.features.length > 0) ||
        (p.data && typeof p.data === 'object' && Object.keys(p.data).length > 0)
    );

    if (projectsWithEmptyArrays.length > 0 && projectsWithFullData.length > 0) {
      this.log(
        `Inconsistencia: ${projectsWithEmptyArrays.length} proyectos con datos vacíos, ${projectsWithFullData.length} con datos completos`,
        'WARN'
      );
    }
  }

  validateDataQuality(data) {
    this.log('=== VALIDACIÓN DE CALIDAD DE DATOS ===');

    if (!Array.isArray(data.projects) || !Array.isArray(data.tasks)) return;

    // Verificar IDs con patrones sospechosos
    const suspiciousPatterns = [
      /^test/i,
      /^temp/i,
      /^debug/i,
      /^[0-9]+$/,
      /^.{1,3}$/ // IDs muy cortos
    ];

    [...data.projects, ...data.tasks].forEach((item, index) => {
      if (
        item.id &&
        suspiciousPatterns.some(pattern => pattern.test(item.id))
      ) {
        this.log(
          `${item.id ? 'Proyecto' : 'Tarea'} ${index + 1}: ID con patrón sospechoso: ${item.id}`,
          'WARN'
        );
      }
    });

    // Verificar descripciones muy cortas o genéricas
    [...data.projects, ...data.tasks].forEach((item, index) => {
      if (item.description && item.description.length < 10) {
        this.log(
          `${item.id ? 'Proyecto' : 'Tarea'} ${index + 1}: descripción muy corta: "${item.description}"`,
          'WARN'
        );
      }
    });

    // Verificar tareas sin descripción detallada
    data.tasks.forEach((task, index) => {
      if (!task.description || task.description.trim() === '') {
        this.log(`Tarea ${index + 1} (${task.id}): sin descripción`, 'WARN');
      }
    });
  }

  generateReport() {
    this.log('=== REPORTE DE DIAGNÓSTICO ===');
    this.log(`Total de errores: ${this.issues.length}`);
    this.log(`Total de advertencias: ${this.warnings.length}`);

    if (this.issues.length > 0) {
      this.log('ERRORES ENCONTRADOS:', 'ERROR');
      this.issues.forEach((issue, index) => {
        this.log(`${index + 1}. ${issue}`, 'ERROR');
      });
    }

    if (this.warnings.length > 0) {
      this.log('ADVERTENCIAS:', 'WARN');
      this.warnings.forEach((warning, index) => {
        this.log(`${index + 1}. ${warning}`, 'WARN');
      });
    }

    if (this.issues.length === 0 && this.warnings.length === 0) {
      this.log('No se encontraron problemas de corrupción en TaskDB', 'INFO');
    }
  }

  run() {
    this.log('Iniciando diagnóstico de TaskDB...');

    const data = this.loadTaskDB();
    if (!data) return;

    this.validateJSONStructure(data);
    this.validateProjects(data);
    this.validateTasks(data);
    this.validateCrossReferences(data);
    this.validateSchemaConsistency(data);
    this.validateDataQuality(data);
    this.generateReport();

    return {
      issues: this.issues,
      warnings: this.warnings,
      isCorrupted: this.issues.length > 0
    };
  }
}

// Ejecutar diagnóstico si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostic = new TaskDBDiagnostic();
  diagnostic.run();
}

export default TaskDBDiagnostic;
