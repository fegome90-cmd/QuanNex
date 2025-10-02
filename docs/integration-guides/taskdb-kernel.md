# TaskDB Kernel - Base de Datos de Tareas Portable

**PR-J: TaskDB portable (taskbd/taskkernel) – base de datos de tareas**

## 📋 Descripción

TaskDB Kernel es una base de datos de tareas portable que proporciona una interfaz unificada para gestionar proyectos y tareas. Soporta múltiples backends (JSON, SQLite, PostgreSQL) y está diseñado para ser ligero, rápido y fácil de usar.

## 🚀 Características

### ✅ Funcionalidades Principales

- **Gestión de Proyectos**: Crear, leer, actualizar y eliminar proyectos
- **Gestión de Tareas**: CRUD completo para tareas con estados y prioridades
- **Filtrado Avanzado**: Filtrar tareas por proyecto, estado, asignado, feature, etc.
- **Estados de Tarea**: `todo`, `doing`, `review`, `done`
- **Archivado**: Archivar/desarchivar tareas manteniendo historial
- **Estadísticas**: Métricas detalladas de proyectos y tareas
- **Exportar/Importar**: Migración de datos entre formatos
- **Portable**: Funciona con JSON, SQLite y PostgreSQL

### 🏗️ Arquitectura

```
TaskDB Kernel
├── Backend JSON (por defecto)
├── Backend SQLite (opcional)
├── Backend PostgreSQL (opcional)
├── Migración de datos
├── Validación de esquemas
└── CLI Interface
```

## 📦 Instalación

### Requisitos

- Node.js 18+
- npm o yarn

### Instalación Local

```bash
# Clonar el repositorio
git clone <repo-url>
cd startkit-main

# Instalar dependencias
npm install

# Verificar instalación
node tools/taskdb-kernel.mjs init
```

## 🛠️ Uso

### CLI Interface

```bash
# Inicializar TaskDB
node tools/taskdb-kernel.mjs init

# Ver estadísticas
node tools/taskdb-kernel.mjs stats

# Exportar datos
node tools/taskdb-kernel.mjs export

# Limpiar base de datos
node tools/taskdb-kernel.mjs clear
```

### API Programática

```javascript
import TaskDBKernel from './tools/taskdb-kernel.mjs';

// Inicializar
const taskdb = new TaskDBKernel({
  dataDir: './data',
  dbFile: 'taskdb.json'
});

// Crear proyecto
const project = taskdb.createProject({
  title: 'Mi Proyecto',
  description: 'Descripción del proyecto',
  github_repo: 'https://github.com/user/repo'
});

// Crear tarea
const task = taskdb.createTask({
  project_id: project.id,
  title: 'Implementar feature X',
  description: 'Descripción detallada',
  status: 'todo',
  assignee: 'developer',
  task_order: 1,
  feature: 'authentication'
});

// Listar tareas
const tasks = taskdb.listTasks({
  project_id: project.id,
  status: 'todo'
});

// Actualizar tarea
taskdb.updateTask(task.id, {
  status: 'doing',
  assignee: 'developer'
});

// Obtener estadísticas
const stats = taskdb.getStats();
console.log(stats);
```

## 📊 Estructura de Datos

### Proyecto

```javascript
{
  id: "string",           // ID único
  title: "string",        // Título del proyecto
  description: "string",  // Descripción
  docs: [],              // Documentos relacionados
  features: [],          // Features del proyecto
  data: [],              // Datos adicionales
  github_repo: "string", // Repositorio GitHub
  pinned: boolean,       // Proyecto fijado
  created_at: "ISO",     // Fecha de creación
  updated_at: "ISO"      // Fecha de actualización
}
```

### Tarea

```javascript
{
  id: "string",              // ID único
  project_id: "string",      // ID del proyecto
  parent_task_id: "string",  // ID de tarea padre (opcional)
  title: "string",           // Título de la tarea
  description: "string",     // Descripción
  status: "todo|doing|review|done", // Estado
  assignee: "string",        // Asignado a
  task_order: number,        // Orden de prioridad
  feature: "string",         // Feature relacionada
  sources: [],               // Fuentes de información
  code_examples: [],         // Ejemplos de código
  archived: boolean,         // Archivada
  archived_at: "ISO",        // Fecha de archivado
  archived_by: "string",     // Quien archivó
  created_at: "ISO",         // Fecha de creación
  updated_at: "ISO"          // Fecha de actualización
}
```

## 🔄 Migración de Datos

### Migrar desde SQL

```bash
# Migrar desde archivo SQL a JSON
node tools/taskdb-migrate.mjs sql-to-json migration/complete_setup_fixed.sql data/taskdb-migrated.json
```

### Migrar desde JSON

```bash
# Migrar desde JSON a SQL
node tools/taskdb-migrate.mjs json-to-sql data/taskdb.json migration/taskdb-export.sql
```

### Validar Datos

```bash
# Validar estructura de datos
node tools/taskdb-migrate.mjs validate data/taskdb.json
```

## 📈 Estadísticas

### Métricas Disponibles

```javascript
{
  total_projects: number,      // Total de proyectos
  total_tasks: number,         // Total de tareas
  tasks_by_status: {
    todo: number,              // Tareas pendientes
    doing: number,             // Tareas en progreso
    review: number,            // Tareas en revisión
    done: number               // Tareas completadas
  },
  archived_tasks: number,      // Tareas archivadas
  active_tasks: number         // Tareas activas
}
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test tests/taskdb-kernel.test.js

# Ejecutar tests específicos
node --test tests/taskdb-kernel.test.js
```

### Cobertura de Tests

- ✅ Inicialización
- ✅ Gestión de proyectos (CRUD)
- ✅ Gestión de tareas (CRUD)
- ✅ Filtrado y búsqueda
- ✅ Archivado/desarchivado
- ✅ Estadísticas
- ✅ Exportar/importar
- ✅ Limpieza de datos

## 🔧 Configuración

### Opciones de Configuración

```javascript
const config = {
  backend: 'json',                    // Backend: json, sqlite, postgresql
  dataDir: './data',                 // Directorio de datos
  dbFile: 'taskdb.json',            // Archivo de base de datos
  schema: {                          // Esquema por defecto
    version: '1.0.0',
    projects: [],
    tasks: []
  }
};
```

### Variables de Entorno

```bash
# Directorio de datos
export TASKDB_DATA_DIR="./data"

# Archivo de base de datos
export TASKDB_FILE="taskdb.json"

# Backend a usar
export TASKDB_BACKEND="json"
```

## 🚀 Scripts NPM

### Scripts Disponibles

```json
{
  "taskdb:init": "node tools/taskdb-kernel.mjs init",
  "taskdb:stats": "node tools/taskdb-kernel.mjs stats",
  "taskdb:export": "node tools/taskdb-kernel.mjs export",
  "taskdb:clear": "node tools/taskdb-kernel.mjs clear",
  "taskdb:migrate:sql-to-json": "node tools/taskdb-migrate.mjs sql-to-json",
  "taskdb:migrate:json-to-sql": "node tools/taskdb-migrate.mjs json-to-sql",
  "taskdb:validate": "node tools/taskdb-migrate.mjs validate",
  "taskdb:test": "node --test tests/taskdb-kernel.test.js"
}
```

### Uso de Scripts

```bash
# Inicializar TaskDB
npm run taskdb:init

# Ver estadísticas
npm run taskdb:stats

# Exportar datos
npm run taskdb:export

# Migrar desde SQL
npm run taskdb:migrate:sql-to-json migration/complete_setup_fixed.sql

# Validar datos
npm run taskdb:validate data/taskdb.json

# Ejecutar tests
npm run taskdb:test
```

## 🔒 Seguridad

### Consideraciones de Seguridad

- **Validación de Entrada**: Todos los datos se validan antes de guardar
- **Sanitización**: Los datos se sanitizan para prevenir inyección
- **Permisos**: Control de acceso basado en archivos del sistema
- **Backup**: Funcionalidad de exportación para respaldos

### Mejores Prácticas

1. **Respaldos Regulares**: Exportar datos regularmente
2. **Validación**: Validar datos antes de importar
3. **Permisos**: Configurar permisos apropiados en archivos
4. **Monitoreo**: Monitorear el uso y rendimiento

## 🐛 Troubleshooting

### Problemas Comunes

#### Error: "Base de datos no encontrada"
```bash
# Solución: Inicializar TaskDB
node tools/taskdb-kernel.mjs init
```

#### Error: "Datos corruptos"
```bash
# Solución: Validar y reparar datos
node tools/taskdb-migrate.mjs validate data/taskdb.json
```

#### Error: "Permisos insuficientes"
```bash
# Solución: Verificar permisos del directorio
chmod 755 data/
chmod 644 data/taskdb.json
```

### Logs y Debugging

```bash
# Habilitar logs detallados
DEBUG=taskdb:* node tools/taskdb-kernel.mjs stats

# Verificar estructura de datos
node tools/taskdb-migrate.mjs validate data/taskdb.json
```

## 📚 Referencias

### Documentación Relacionada

- [PR-J: TaskDB Portable](./PR-J-COMPLETADO.md)
- [Esquema de Base de Datos](../migration/complete_setup_fixed.sql)
- [Tests de TaskDB](../tests/taskdb-kernel.test.js)

### Enlaces Externos

- [Node.js File System](https://nodejs.org/api/fs.html)
- [JSON Schema](https://json-schema.org/)
- [SQLite](https://www.sqlite.org/)

## 🤝 Contribución

### Cómo Contribuir

1. Fork el repositorio
2. Crear una rama para tu feature
3. Implementar cambios
4. Ejecutar tests
5. Crear Pull Request

### Estándares de Código

- Usar ESLint para linting
- Escribir tests para nuevas funcionalidades
- Documentar cambios en CHANGELOG
- Seguir convenciones de naming

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](../LICENSE) para más detalles.

---

**TaskDB Kernel v1.0.0** - Base de datos de tareas portable y eficiente 🚀
