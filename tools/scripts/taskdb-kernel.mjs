#!/usr/bin/env node

/**
 * TaskDB Kernel - Base de datos de tareas portable
 * PR-J: TaskDB portable (taskbd/taskkernel) – base de datos de tareas
 *
 * Implementa una interfaz portable para gestionar tareas y proyectos
 * con soporte para múltiples backends (SQLite, PostgreSQL, JSON)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración por defecto
const DEFAULT_CONFIG = {
  backend: 'json', // json, sqlite, postgresql
  dataDir: join(PROJECT_ROOT, 'data'),
  dbFile: 'taskdb.json',
  schema: {
    version: '1.0.0',
    projects: [],
    tasks: []
  }
};

class TaskDBKernel {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataDir = this.config.dataDir;
    this.dbFile = join(this.dataDir, this.config.dbFile);
    this.schema = this.config.schema;

    // Asegurar que el directorio de datos existe
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    this.init();
  }

  /**
   * Inicializar la base de datos
   */
  init() {
    try {
      if (existsSync(this.dbFile)) {
        const data = JSON.parse(readFileSync(this.dbFile, 'utf8'));
        this.schema = { ...this.schema, ...data };
      } else {
        this.save();
      }
      console.log(`✅ TaskDB Kernel inicializado: ${this.dbFile}`);
    } catch (error) {
      console.error(`❌ Error inicializando TaskDB: ${error.message}`);
      throw error;
    }
  }

  /**
   * Guardar datos en el archivo
   */
  save() {
    try {
      writeFileSync(this.dbFile, JSON.stringify(this.schema, null, 2));
    } catch (error) {
      console.error(`❌ Error guardando TaskDB: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generar ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Crear un nuevo proyecto
   */
  createProject(projectData) {
    const project = {
      id: this.generateId(),
      title: projectData.title || 'Sin título',
      description: projectData.description || '',
      docs: projectData.docs || [],
      features: projectData.features || [],
      data: projectData.data || [],
      github_repo: projectData.github_repo || null,
      pinned: projectData.pinned || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.schema.projects.push(project);
    this.save();

    console.log(`✅ Proyecto creado: ${project.title} (${project.id})`);
    return project;
  }

  /**
   * Obtener proyecto por ID
   */
  getProject(projectId) {
    return this.schema.projects.find(p => p.id === projectId);
  }

  /**
   * Listar todos los proyectos
   */
  listProjects() {
    return this.schema.projects;
  }

  /**
   * Actualizar proyecto
   */
  updateProject(projectId, updateData) {
    const projectIndex = this.schema.projects.findIndex(
      p => p.id === projectId
    );
    if (projectIndex === -1) {
      throw new Error(`Proyecto no encontrado: ${projectId}`);
    }

    this.schema.projects[projectIndex] = {
      ...this.schema.projects[projectIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };

    this.save();
    console.log(`✅ Proyecto actualizado: ${projectId}`);
    return this.schema.projects[projectIndex];
  }

  /**
   * Eliminar proyecto
   */
  deleteProject(projectId) {
    const projectIndex = this.schema.projects.findIndex(
      p => p.id === projectId
    );
    if (projectIndex === -1) {
      throw new Error(`Proyecto no encontrado: ${projectId}`);
    }

    // Eliminar todas las tareas del proyecto
    this.schema.tasks = this.schema.tasks.filter(
      t => t.project_id !== projectId
    );

    // Eliminar el proyecto
    this.schema.projects.splice(projectIndex, 1);
    this.save();

    console.log(`✅ Proyecto eliminado: ${projectId}`);
    return true;
  }

  /**
   * Crear una nueva tarea
   */
  createTask(taskData) {
    const task = {
      id: this.generateId(),
      project_id: taskData.project_id || null,
      parent_task_id: taskData.parent_task_id || null,
      title: taskData.title || 'Sin título',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      assignee: taskData.assignee || 'User',
      task_order: taskData.task_order || 0,
      feature: taskData.feature || null,
      sources: taskData.sources || [],
      code_examples: taskData.code_examples || [],
      archived: taskData.archived || false,
      archived_at: null,
      archived_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.schema.tasks.push(task);
    this.save();

    console.log(`✅ Tarea creada: ${task.title} (${task.id})`);
    return task;
  }

  /**
   * Obtener tarea por ID
   */
  getTask(taskId) {
    return this.schema.tasks.find(t => t.id === taskId);
  }

  /**
   * Listar tareas con filtros
   */
  listTasks(filters = {}) {
    let tasks = [...this.schema.tasks];

    if (filters.project_id) {
      tasks = tasks.filter(t => t.project_id === filters.project_id);
    }

    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    if (filters.assignee) {
      tasks = tasks.filter(t => t.assignee === filters.assignee);
    }

    if (filters.feature) {
      tasks = tasks.filter(t => t.feature === filters.feature);
    }

    if (filters.archived !== undefined) {
      tasks = tasks.filter(t => t.archived === filters.archived);
    }

    // Ordenar por task_order
    tasks.sort((a, b) => a.task_order - b.task_order);

    return tasks;
  }

  /**
   * Actualizar tarea
   */
  updateTask(taskId, updateData) {
    const taskIndex = this.schema.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    this.schema.tasks[taskIndex] = {
      ...this.schema.tasks[taskIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };

    this.save();
    console.log(`✅ Tarea actualizada: ${taskId}`);
    return this.schema.tasks[taskIndex];
  }

  /**
   * Eliminar tarea
   */
  deleteTask(taskId) {
    const taskIndex = this.schema.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    this.schema.tasks.splice(taskIndex, 1);
    this.save();

    console.log(`✅ Tarea eliminada: ${taskId}`);
    return true;
  }

  /**
   * Archivar tarea
   */
  archiveTask(taskId, archivedBy = 'User') {
    return this.updateTask(taskId, {
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: archivedBy
    });
  }

  /**
   * Desarchivar tarea
   */
  unarchiveTask(taskId) {
    return this.updateTask(taskId, {
      archived: false,
      archived_at: null,
      archived_by: null
    });
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    const totalProjects = this.schema.projects.length;
    const totalTasks = this.schema.tasks.length;
    const tasksByStatus = {
      todo: this.schema.tasks.filter(t => t.status === 'todo').length,
      doing: this.schema.tasks.filter(t => t.status === 'doing').length,
      review: this.schema.tasks.filter(t => t.status === 'review').length,
      done: this.schema.tasks.filter(t => t.status === 'done').length
    };
    const archivedTasks = this.schema.tasks.filter(t => t.archived).length;

    return {
      total_projects: totalProjects,
      total_tasks: totalTasks,
      tasks_by_status: tasksByStatus,
      archived_tasks: archivedTasks,
      active_tasks: totalTasks - archivedTasks
    };
  }

  /**
   * Exportar datos
   */
  export() {
    return {
      ...this.schema,
      exported_at: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Importar datos
   */
  import(data) {
    if (!data.projects || !data.tasks) {
      throw new Error('Datos de importación inválidos');
    }

    this.schema = {
      version: data.version || '1.0.0',
      projects: data.projects,
      tasks: data.tasks
    };

    this.save();
    console.log(
      `✅ Datos importados: ${data.projects.length} proyectos, ${data.tasks.length} tareas`
    );
    return true;
  }

  /**
   * Limpiar base de datos
   */
  clear() {
    this.schema = {
      version: '1.0.0',
      projects: [],
      tasks: []
    };
    this.save();
    console.log('✅ Base de datos limpiada');
    return true;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const taskdb = new TaskDBKernel();

  try {
    switch (command) {
      case 'init':
        console.log('✅ TaskDB Kernel inicializado');
        break;

      case 'stats':
        const stats = taskdb.getStats();
        console.log('📊 Estadísticas de TaskDB:');
        console.log(JSON.stringify(stats, null, 2));
        break;

      case 'export':
        const exportData = taskdb.export();
        const exportFile = join(
          taskdb.dataDir,
          `taskdb-export-${Date.now()}.json`
        );
        writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
        console.log(`✅ Datos exportados a: ${exportFile}`);
        break;

      case 'clear':
        taskdb.clear();
        break;

      default:
        console.log(`
TaskDB Kernel - Base de datos de tareas portable

Comandos disponibles:
  init     - Inicializar TaskDB
  stats    - Mostrar estadísticas
  export   - Exportar datos
  clear    - Limpiar base de datos

Uso: node tools/taskdb-kernel.mjs <comando>
        `);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

export default TaskDBKernel;
