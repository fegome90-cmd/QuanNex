#!/usr/bin/env node

/**
 * TaskDB Migrate - Herramienta de migración para TaskDB
 * PR-J: TaskDB portable (taskbd/taskkernel) – base de datos de tareas
 * 
 * Migra datos entre diferentes formatos y backends
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class TaskDBMigrate {
  constructor() {
    this.dataDir = join(PROJECT_ROOT, 'data');
    this.migrationDir = join(PROJECT_ROOT, 'migration');
    
    // Asegurar que los directorios existen
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    if (!existsSync(this.migrationDir)) {
      mkdirSync(this.migrationDir, { recursive: true });
    }
  }

  /**
   * Migrar desde SQL a JSON
   */
  async migrateFromSQL(sqlFile, outputFile) {
    try {
      console.log(`🔄 Migrando desde SQL: ${sqlFile}`);
      
      // Leer archivo SQL
      const sqlContent = readFileSync(sqlFile, 'utf8');
      
      // Extraer datos de INSERT statements (simplificado)
      const projects = this.extractProjectsFromSQL(sqlContent);
      const tasks = this.extractTasksFromSQL(sqlContent);
      
      // Crear estructura JSON
      const jsonData = {
        version: '1.0.0',
        migrated_at: new Date().toISOString(),
        source: 'sql',
        projects: projects,
        tasks: tasks
      };
      
      // Guardar archivo JSON
      writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
      
      console.log(`✅ Migración completada: ${projects.length} proyectos, ${tasks.length} tareas`);
      return jsonData;
      
    } catch (error) {
      console.error(`❌ Error en migración SQL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer proyectos desde SQL
   */
  extractProjectsFromSQL(sqlContent) {
    const projects = [];
    const insertRegex = /INSERT INTO archon_projects[^;]+;/gi;
    const matches = sqlContent.match(insertRegex);
    
    if (matches) {
      matches.forEach(match => {
        // Extraer valores (simplificado)
        const valuesMatch = match.match(/VALUES\s*\(([^)]+)\)/i);
        if (valuesMatch) {
          const values = this.parseSQLValues(valuesMatch[1]);
          if (values.length >= 6) {
            projects.push({
              id: values[0] || this.generateId(),
              title: values[1] || 'Sin título',
              description: values[2] || '',
              docs: this.parseJSONField(values[3]) || [],
              features: this.parseJSONField(values[4]) || [],
              data: this.parseJSONField(values[5]) || [],
              github_repo: values[6] || null,
              pinned: values[7] === 'true' || false,
              created_at: values[8] || new Date().toISOString(),
              updated_at: values[9] || new Date().toISOString()
            });
          }
        }
      });
    }
    
    return projects;
  }

  /**
   * Extraer tareas desde SQL
   */
  extractTasksFromSQL(sqlContent) {
    const tasks = [];
    const insertRegex = /INSERT INTO archon_tasks[^;]+;/gi;
    const matches = sqlContent.match(insertRegex);
    
    if (matches) {
      matches.forEach(match => {
        // Extraer valores (simplificado)
        const valuesMatch = match.match(/VALUES\s*\(([^)]+)\)/i);
        if (valuesMatch) {
          const values = this.parseSQLValues(valuesMatch[1]);
          if (values.length >= 10) {
            tasks.push({
              id: values[0] || this.generateId(),
              project_id: values[1] || null,
              parent_task_id: values[2] || null,
              title: values[3] || 'Sin título',
              description: values[4] || '',
              status: values[5] || 'todo',
              assignee: values[6] || 'User',
              task_order: parseInt(values[7]) || 0,
              feature: values[8] || null,
              sources: this.parseJSONField(values[9]) || [],
              code_examples: this.parseJSONField(values[10]) || [],
              archived: values[11] === 'true' || false,
              archived_at: values[12] || null,
              archived_by: values[13] || null,
              created_at: values[14] || new Date().toISOString(),
              updated_at: values[15] || new Date().toISOString()
            });
          }
        }
      });
    }
    
    return tasks;
  }

  /**
   * Parsear valores SQL
   */
  parseSQLValues(valuesString) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < valuesString.length; i++) {
      const char = valuesString[i];
      
      if (!inQuotes && (char === "'" || char === '"')) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        current += char;
      } else if (!inQuotes && char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      values.push(current.trim());
    }
    
    return values.map(v => v.replace(/^['"]|['"]$/g, ''));
  }

  /**
   * Parsear campo JSON
   */
  parseJSONField(field) {
    try {
      if (field === 'NULL' || field === null || field === '') {
        return [];
      }
      return JSON.parse(field);
    } catch {
      return [];
    }
  }

  /**
   * Generar ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Migrar desde JSON a SQL
   */
  async migrateToSQL(jsonFile, outputFile) {
    try {
      console.log(`🔄 Migrando desde JSON: ${jsonFile}`);
      
      // Leer archivo JSON
      const jsonData = JSON.parse(readFileSync(jsonFile, 'utf8'));
      
      // Generar SQL
      const sqlContent = this.generateSQLFromJSON(jsonData);
      
      // Guardar archivo SQL
      writeFileSync(outputFile, sqlContent);
      
      console.log(`✅ Migración completada: ${jsonData.projects?.length || 0} proyectos, ${jsonData.tasks?.length || 0} tareas`);
      return sqlContent;
      
    } catch (error) {
      console.error(`❌ Error en migración JSON: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generar SQL desde JSON
   */
  generateSQLFromJSON(jsonData) {
    let sql = `-- TaskDB Migration - Generated at ${new Date().toISOString()}
-- Source: JSON format
-- Projects: ${jsonData.projects?.length || 0}
-- Tasks: ${jsonData.tasks?.length || 0}

-- Clear existing data
DELETE FROM archon_tasks;
DELETE FROM archon_projects;

-- Insert projects
`;

    // Insertar proyectos
    if (jsonData.projects) {
      jsonData.projects.forEach(project => {
        sql += `INSERT INTO archon_projects (id, title, description, docs, features, data, github_repo, pinned, created_at, updated_at) VALUES (
  '${project.id}',
  '${this.escapeSQL(project.title)}',
  '${this.escapeSQL(project.description)}',
  '${JSON.stringify(project.docs || [])}',
  '${JSON.stringify(project.features || [])}',
  '${JSON.stringify(project.data || [])}',
  ${project.github_repo ? `'${this.escapeSQL(project.github_repo)}'` : 'NULL'},
  ${project.pinned ? 'true' : 'false'},
  '${project.created_at}',
  '${project.updated_at}'
);

`;
      });
    }

    sql += `
-- Insert tasks
`;

    // Insertar tareas
    if (jsonData.tasks) {
      jsonData.tasks.forEach(task => {
        sql += `INSERT INTO archon_tasks (id, project_id, parent_task_id, title, description, status, assignee, task_order, feature, sources, code_examples, archived, archived_at, archived_by, created_at, updated_at) VALUES (
  '${task.id}',
  ${task.project_id ? `'${task.project_id}'` : 'NULL'},
  ${task.parent_task_id ? `'${task.parent_task_id}'` : 'NULL'},
  '${this.escapeSQL(task.title)}',
  '${this.escapeSQL(task.description)}',
  '${task.status}',
  '${this.escapeSQL(task.assignee)}',
  ${task.task_order || 0},
  ${task.feature ? `'${this.escapeSQL(task.feature)}'` : 'NULL'},
  '${JSON.stringify(task.sources || [])}',
  '${JSON.stringify(task.code_examples || [])}',
  ${task.archived ? 'true' : 'false'},
  ${task.archived_at ? `'${task.archived_at}'` : 'NULL'},
  ${task.archived_by ? `'${this.escapeSQL(task.archived_by)}'` : 'NULL'},
  '${task.created_at}',
  '${task.updated_at}'
);

`;
      });
    }

    return sql;
  }

  /**
   * Escapar caracteres SQL
   */
  escapeSQL(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
  }

  /**
   * Validar estructura de datos
   */
  validateData(data) {
    const errors = [];
    
    if (!data.projects || !Array.isArray(data.projects)) {
      errors.push('Campo "projects" debe ser un array');
    }
    
    if (!data.tasks || !Array.isArray(data.tasks)) {
      errors.push('Campo "tasks" debe ser un array');
    }
    
    // Validar proyectos
    if (data.projects) {
      data.projects.forEach((project, index) => {
        if (!project.id) errors.push(`Proyecto ${index}: falta campo "id"`);
        if (!project.title) errors.push(`Proyecto ${index}: falta campo "title"`);
      });
    }
    
    // Validar tareas
    if (data.tasks) {
      data.tasks.forEach((task, index) => {
        if (!task.id) errors.push(`Tarea ${index}: falta campo "id"`);
        if (!task.title) errors.push(`Tarea ${index}: falta campo "title"`);
        if (!['todo', 'doing', 'review', 'done'].includes(task.status)) {
          errors.push(`Tarea ${index}: status inválido "${task.status}"`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const migrate = new TaskDBMigrate();

  try {
    switch (command) {
      case 'sql-to-json':
        const sqlFile = process.argv[3] || join(migrate.migrationDir, 'complete_setup_fixed.sql');
        const jsonFile = process.argv[4] || join(migrate.dataDir, 'taskdb-migrated.json');
        
        if (!existsSync(sqlFile)) {
          console.error(`❌ Archivo SQL no encontrado: ${sqlFile}`);
          process.exit(1);
        }
        
        await migrate.migrateFromSQL(sqlFile, jsonFile);
        break;

      case 'json-to-sql':
        const jsonInputFile = process.argv[3] || join(migrate.dataDir, 'taskdb.json');
        const sqlOutputFile = process.argv[4] || join(migrate.migrationDir, 'taskdb-export.sql');
        
        if (!existsSync(jsonInputFile)) {
          console.error(`❌ Archivo JSON no encontrado: ${jsonInputFile}`);
          process.exit(1);
        }
        
        await migrate.migrateToSQL(jsonInputFile, sqlOutputFile);
        break;

      case 'validate':
        const validateFile = process.argv[3] || join(migrate.dataDir, 'taskdb.json');
        
        if (!existsSync(validateFile)) {
          console.error(`❌ Archivo no encontrado: ${validateFile}`);
          process.exit(1);
        }
        
        const data = JSON.parse(readFileSync(validateFile, 'utf8'));
        const validation = migrate.validateData(data);
        
        if (validation.valid) {
          console.log('✅ Datos válidos');
        } else {
          console.log('❌ Datos inválidos:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
          process.exit(1);
        }
        break;

      default:
        console.log(`
TaskDB Migrate - Herramienta de migración para TaskDB

Comandos disponibles:
  sql-to-json <sql_file> <json_file>  - Migrar desde SQL a JSON
  json-to-sql <json_file> <sql_file>  - Migrar desde JSON a SQL
  validate <file>                     - Validar estructura de datos

Uso: node tools/taskdb-migrate.mjs <comando> [archivos]
        `);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

export default TaskDBMigrate;
