/**
 * TaskDB Kernel Tests
 * PR-J: TaskDB portable (taskbd/taskkernel) – base de datos de tareas
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import TaskDBKernel from '../tools/taskdb-kernel.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const TEST_DATA_DIR = join(PROJECT_ROOT, 'test-data');

describe('TaskDB Kernel', () => {
  let taskdb;

  beforeEach(() => {
    // Crear directorio de test
    if (!existsSync(TEST_DATA_DIR)) {
      mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    // Inicializar TaskDB con directorio de test
    taskdb = new TaskDBKernel({
      dataDir: TEST_DATA_DIR,
      dbFile: 'test-taskdb.json'
    });
  });

  afterEach(() => {
    // Limpiar datos de test
    try {
      taskdb.clear();
    } catch {
      // Ignorar errores de limpieza
    }
  });

  describe('Inicialización', () => {
    test('debe inicializar correctamente', () => {
      assert.ok(taskdb);
      assert.ok(taskdb.config);
      assert.ok(taskdb.schema);
      assert.strictEqual(taskdb.schema.version, '1.0.0');
    });

    test('debe crear archivo de base de datos si no existe', () => {
      const dbFile = join(TEST_DATA_DIR, 'test-taskdb.json');
      assert.ok(existsSync(dbFile));
    });
  });

  describe('Gestión de Proyectos', () => {
    test('debe crear un proyecto correctamente', () => {
      const projectData = {
        title: 'Proyecto Test',
        description: 'Descripción del proyecto',
        github_repo: 'https://github.com/test/repo'
      };

      const project = taskdb.createProject(projectData);

      assert.ok(project.id);
      assert.strictEqual(project.title, 'Proyecto Test');
      assert.strictEqual(project.description, 'Descripción del proyecto');
      assert.strictEqual(project.github_repo, 'https://github.com/test/repo');
      assert.strictEqual(project.pinned, false);
      assert.ok(project.created_at);
      assert.ok(project.updated_at);
    });

    test('debe obtener un proyecto por ID', () => {
      const project = taskdb.createProject({ title: 'Proyecto Test' });
      const retrieved = taskdb.getProject(project.id);

      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, project.id);
      assert.strictEqual(retrieved.title, 'Proyecto Test');
    });

    test('debe listar todos los proyectos', () => {
      taskdb.createProject({ title: 'Proyecto 1' });
      taskdb.createProject({ title: 'Proyecto 2' });

      const projects = taskdb.listProjects();
      assert.strictEqual(projects.length, 2);
    });

    test('debe actualizar un proyecto', () => {
      const project = taskdb.createProject({ title: 'Proyecto Original' });

      const updated = taskdb.updateProject(project.id, {
        title: 'Proyecto Actualizado',
        description: 'Nueva descripción'
      });

      assert.strictEqual(updated.title, 'Proyecto Actualizado');
      assert.strictEqual(updated.description, 'Nueva descripción');
      assert.ok(updated.updated_at > project.updated_at);
    });

    test('debe eliminar un proyecto', () => {
      const project = taskdb.createProject({ title: 'Proyecto a Eliminar' });

      const result = taskdb.deleteProject(project.id);
      assert.strictEqual(result, true);

      const retrieved = taskdb.getProject(project.id);
      assert.strictEqual(retrieved, undefined);
    });
  });

  describe('Gestión de Tareas', () => {
    let project;

    beforeEach(() => {
      project = taskdb.createProject({ title: 'Proyecto Test' });
    });

    test('debe crear una tarea correctamente', () => {
      const taskData = {
        project_id: project.id,
        title: 'Tarea Test',
        description: 'Descripción de la tarea',
        status: 'todo',
        assignee: 'TestUser',
        task_order: 1,
        feature: 'TestFeature'
      };

      const task = taskdb.createTask(taskData);

      assert.ok(task.id);
      assert.strictEqual(task.project_id, project.id);
      assert.strictEqual(task.title, 'Tarea Test');
      assert.strictEqual(task.status, 'todo');
      assert.strictEqual(task.assignee, 'TestUser');
      assert.strictEqual(task.task_order, 1);
      assert.strictEqual(task.feature, 'TestFeature');
      assert.strictEqual(task.archived, false);
    });

    test('debe obtener una tarea por ID', () => {
      const task = taskdb.createTask({
        project_id: project.id,
        title: 'Tarea Test'
      });

      const retrieved = taskdb.getTask(task.id);
      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, task.id);
    });

    test('debe listar tareas con filtros', () => {
      taskdb.createTask({
        project_id: project.id,
        title: 'Tarea 1',
        status: 'todo',
        assignee: 'User1'
      });

      taskdb.createTask({
        project_id: project.id,
        title: 'Tarea 2',
        status: 'doing',
        assignee: 'User2'
      });

      taskdb.createTask({
        project_id: project.id,
        title: 'Tarea 3',
        status: 'todo',
        assignee: 'User1'
      });

      // Filtrar por proyecto
      const projectTasks = taskdb.listTasks({ project_id: project.id });
      assert.strictEqual(projectTasks.length, 3);

      // Filtrar por status
      const todoTasks = taskdb.listTasks({ status: 'todo' });
      assert.strictEqual(todoTasks.length, 2);

      // Filtrar por assignee
      const user1Tasks = taskdb.listTasks({ assignee: 'User1' });
      assert.strictEqual(user1Tasks.length, 2);

      // Filtrar por feature
      const featureTasks = taskdb.listTasks({ feature: 'TestFeature' });
      assert.strictEqual(featureTasks.length, 0);
    });

    test('debe actualizar una tarea', () => {
      const task = taskdb.createTask({
        project_id: project.id,
        title: 'Tarea Original',
        status: 'todo'
      });

      const updated = taskdb.updateTask(task.id, {
        title: 'Tarea Actualizada',
        status: 'doing'
      });

      assert.strictEqual(updated.title, 'Tarea Actualizada');
      assert.strictEqual(updated.status, 'doing');
      assert.ok(updated.updated_at > task.updated_at);
    });

    test('debe archivar una tarea', () => {
      const task = taskdb.createTask({
        project_id: project.id,
        title: 'Tarea a Archivar'
      });

      const archived = taskdb.archiveTask(task.id, 'TestUser');

      assert.strictEqual(archived.archived, true);
      assert.ok(archived.archived_at);
      assert.strictEqual(archived.archived_by, 'TestUser');
    });

    test('debe desarchivar una tarea', () => {
      const task = taskdb.createTask({
        project_id: project.id,
        title: 'Tarea Archivada'
      });

      taskdb.archiveTask(task.id);
      const unarchived = taskdb.unarchiveTask(task.id);

      assert.strictEqual(unarchived.archived, false);
      assert.strictEqual(unarchived.archived_at, null);
      assert.strictEqual(unarchived.archived_by, null);
    });

    test('debe eliminar una tarea', () => {
      const task = taskdb.createTask({
        project_id: project.id,
        title: 'Tarea a Eliminar'
      });

      const result = taskdb.deleteTask(task.id);
      assert.strictEqual(result, true);

      const retrieved = taskdb.getTask(task.id);
      assert.strictEqual(retrieved, undefined);
    });
  });

  describe('Estadísticas', () => {
    test('debe generar estadísticas correctas', () => {
      // Crear datos de test
      const project1 = taskdb.createProject({ title: 'Proyecto 1' });
      const project2 = taskdb.createProject({ title: 'Proyecto 2' });

      taskdb.createTask({
        project_id: project1.id,
        title: 'Tarea 1',
        status: 'todo'
      });
      taskdb.createTask({
        project_id: project1.id,
        title: 'Tarea 2',
        status: 'doing'
      });
      taskdb.createTask({
        project_id: project2.id,
        title: 'Tarea 3',
        status: 'review'
      });
      taskdb.createTask({
        project_id: project2.id,
        title: 'Tarea 4',
        status: 'done'
      });
      taskdb.createTask({
        project_id: project1.id,
        title: 'Tarea 5',
        status: 'todo',
        archived: true
      });

      const stats = taskdb.getStats();

      assert.strictEqual(stats.total_projects, 2);
      assert.strictEqual(stats.total_tasks, 5);
      assert.strictEqual(stats.tasks_by_status.todo, 2);
      assert.strictEqual(stats.tasks_by_status.doing, 1);
      assert.strictEqual(stats.tasks_by_status.review, 1);
      assert.strictEqual(stats.tasks_by_status.done, 1);
      assert.strictEqual(stats.archived_tasks, 1);
      assert.strictEqual(stats.active_tasks, 4);
    });
  });

  describe('Exportar/Importar', () => {
    test('debe exportar datos correctamente', () => {
      const project = taskdb.createProject({ title: 'Proyecto Export' });
      taskdb.createTask({ project_id: project.id, title: 'Tarea Export' });

      const exportData = taskdb.export();

      assert.ok(exportData.exported_at);
      assert.strictEqual(exportData.version, '1.0.0');
      assert.strictEqual(exportData.projects.length, 1);
      assert.strictEqual(exportData.tasks.length, 1);
    });

    test('debe importar datos correctamente', () => {
      const importData = {
        version: '1.0.0',
        projects: [
          {
            id: 'test-project-1',
            title: 'Proyecto Importado',
            description: 'Descripción importada',
            docs: [],
            features: [],
            data: [],
            github_repo: null,
            pinned: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        tasks: [
          {
            id: 'test-task-1',
            project_id: 'test-project-1',
            parent_task_id: null,
            title: 'Tarea Importada',
            description: 'Descripción importada',
            status: 'todo',
            assignee: 'TestUser',
            task_order: 0,
            feature: null,
            sources: [],
            code_examples: [],
            archived: false,
            archived_at: null,
            archived_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      };

      taskdb.import(importData);

      const projects = taskdb.listProjects();
      const tasks = taskdb.listTasks();

      assert.strictEqual(projects.length, 1);
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(projects[0].title, 'Proyecto Importado');
      assert.strictEqual(tasks[0].title, 'Tarea Importada');
    });
  });

  describe('Limpieza', () => {
    test('debe limpiar la base de datos', () => {
      taskdb.createProject({ title: 'Proyecto Test' });
      taskdb.createTask({ title: 'Tarea Test' });

      const result = taskdb.clear();

      assert.strictEqual(result, true);
      assert.strictEqual(taskdb.listProjects().length, 0);
      assert.strictEqual(taskdb.listTasks().length, 0);
    });
  });
});
