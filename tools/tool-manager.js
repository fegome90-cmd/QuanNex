#!/usr/bin/env node
/**
 * tools/tool-manager.js
 * Interfaz para que los agentes accedan a las herramientas del proyecto
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const MAX_DEPENDENCY_LENGTH = 64;
const SAFE_DEPENDENCY_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

function isSafeBinaryName(name) {
  if (typeof name !== 'string') {
    return false;
  }

  if (name.length === 0 || name.length > MAX_DEPENDENCY_LENGTH) {
    return false;
  }

  if (!SAFE_DEPENDENCY_REGEX.test(name)) {
    return false;
  }

  if (name.includes('/') || name.includes('\\')) {
    return false;
  }

  if (name.includes('..')) {
    return false;
  }

  return name === basename(name);
}

function safeWhich(binName, { platform = process.platform } = {}) {
  if (!isSafeBinaryName(binName)) {
    return { found: false, reason: 'invalid_name' };
  }

  const isWindows = platform === 'win32';
  const command = isWindows ? 'where' : 'command';
  const args = isWindows ? [binName] : ['-v', binName];

  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    env: { PATH: process.env.PATH },
    stdio: 'pipe',
    shell: false,
    timeout: 5000,
  });

  return {
    found: result.status === 0,
    reason: result.status === 0 ? 'ok' : 'not_found',
  };
}

class ToolManager {
  constructor() {
    this.projectRoot = PROJECT_ROOT;
    this.registry = this.loadRegistry();
  }

  loadRegistry() {
    try {
      const registryPath = join(this.projectRoot, 'tools', 'registry.json');
      const registryData = readFileSync(registryPath, 'utf8');
      return JSON.parse(registryData);
    } catch (error) {
      console.error('Error loading tool registry:', error.message);
      return { tools: {}, categories: {}, workflows: {} };
    }
  }

  // Listar todas las herramientas disponibles
  listTools(category = null) {
    const tools = this.registry.tools;

    if (category) {
      return Object.entries(tools)
        .filter(([_, tool]) => tool.category === category)
        .reduce((acc, [name, tool]) => ({ ...acc, [name]: tool }), {});
    }

    return tools;
  }

  // Obtener información de una herramienta específica
  getTool(toolName) {
    const tools = this.registry.tools;

    // Buscar en todas las categorías
    for (const category of Object.values(tools)) {
      if (category[toolName]) {
        return category[toolName];
      }
    }

    return null;
  }

  // Ejecutar una herramienta
  async executeTool(toolName, args = []) {
    const tool = this.getTool(toolName);

    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    const toolPath = join(this.projectRoot, tool.path);

    if (!existsSync(toolPath)) {
      throw new Error(`Tool path does not exist: ${toolPath}`);
    }

    return new Promise((resolve, reject) => {
      const isScript = tool.path.endsWith('.sh');
      const command = isScript ? 'bash' : 'node';
      const commandArgs = isScript ? [toolPath, ...args] : [toolPath, ...args];

      const process = spawn(command, commandArgs, {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', data => {
        stdout += data.toString();
      });

      process.stderr.on('data', data => {
        stderr += data.toString();
      });

      process.on('close', code => {
        resolve({
          tool: toolName,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: code === 0,
        });
      });

      process.on('error', error => {
        reject({
          tool: toolName,
          error: error.message,
          success: false,
        });
      });
    });
  }

  // Ejecutar un workflow completo
  async executeWorkflow(workflowName) {
    const workflow = this.registry.workflows[workflowName];

    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    const results = [];

    for (const toolName of workflow) {
      try {
        const result = await this.executeTool(toolName);
        results.push(result);

        if (!result.success) {
          console.error(`Tool ${toolName} failed:`, result.stderr);
          break;
        }
      } catch (error) {
        console.error(`Error executing tool ${toolName}:`, error.message);
        results.push({ tool: toolName, error: error.message, success: false });
        break;
      }
    }

    return {
      workflow: workflowName,
      results: results,
      success: results.every(r => r.success),
    };
  }

  // Buscar herramientas por descripción
  searchTools(query) {
    const tools = this.registry.tools;
    const results = [];

    for (const category of Object.values(tools)) {
      for (const [name, tool] of Object.entries(category)) {
        if (
          tool.description.toLowerCase().includes(query.toLowerCase()) ||
          name.toLowerCase().includes(query.toLowerCase())
        ) {
          results.push({ name, ...tool });
        }
      }
    }

    return results;
  }

  // Obtener herramientas por categoría
  getToolsByCategory(category) {
    return this.listTools(category);
  }

  // Obtener todas las categorías
  getCategories() {
    return this.registry.categories;
  }

  // Obtener workflows disponibles
  getWorkflows() {
    return this.registry.workflows;
  }

  // Verificar dependencias de una herramienta
  checkDependencies(toolName) {
    const tool = this.getTool(toolName);

    if (!tool) {
      return { tool: toolName, available: false, error: 'Tool not found' };
    }

    const missing = [];
    const invalid = [];

    for (const dep of tool.dependencies || []) {
      const { found, reason } = safeWhich(dep);

      if (!found) {
        missing.push(dep);

        if (reason === 'invalid_name') {
          invalid.push(dep);
        }
      }
    }

    return {
      tool: toolName,
      available: missing.length === 0,
      missing,
      invalid,
      dependencies: tool.dependencies || [],
    };
  }
}

// CLI para uso directo
if (import.meta.url === `file://${process.argv[1]}`) {
  const toolManager = new ToolManager();
  const command = process.argv[2];

  switch (command) {
    case 'list':
      const category = process.argv[3];
      const tools = toolManager.listTools(category);
      console.log(JSON.stringify(tools, null, 2));
      break;

    case 'get':
      const toolName = process.argv[3];
      const tool = toolManager.getTool(toolName);
      console.log(JSON.stringify(tool, null, 2));
      break;

    case 'execute':
      const execToolName = process.argv[3];
      const args = process.argv.slice(4);
      toolManager
        .executeTool(execToolName, args)
        .then(result => console.log(JSON.stringify(result, null, 2)))
        .catch(error => console.error(JSON.stringify(error, null, 2)));
      break;

    case 'workflow':
      const workflowName = process.argv[3];
      toolManager
        .executeWorkflow(workflowName)
        .then(result => console.log(JSON.stringify(result, null, 2)))
        .catch(error => console.error(JSON.stringify(error, null, 2)));
      break;

    case 'search':
      const query = process.argv[3];
      const results = toolManager.searchTools(query);
      console.log(JSON.stringify(results, null, 2));
      break;

    case 'categories':
      const categories = toolManager.getCategories();
      console.log(JSON.stringify(categories, null, 2));
      break;

    case 'workflows':
      const workflows = toolManager.getWorkflows();
      console.log(JSON.stringify(workflows, null, 2));
      break;

    case 'deps':
      const depToolName = process.argv[3];
      const deps = toolManager.checkDependencies(depToolName);
      console.log(JSON.stringify(deps, null, 2));
      break;

    default:
      console.log(`
Tool Manager - StartKit QuanNex

Usage: node tools/tool-manager.js <command> [args]

Commands:
  list [category]           - List all tools or tools by category
  get <tool_name>           - Get tool information
  execute <tool_name> [args] - Execute a tool
  workflow <workflow_name>  - Execute a workflow
  search <query>            - Search tools by description
  categories                - List all categories
  workflows                 - List all workflows
  deps <tool_name>          - Check tool dependencies

Examples:
  node tools/tool-manager.js list
  node tools/tool-manager.js list validation
  node tools/tool-manager.js get validate-structure
  node tools/tool-manager.js execute validate-structure
  node tools/tool-manager.js workflow daily_maintenance
  node tools/tool-manager.js search "path"
      `);
      break;
  }
}

export default ToolManager;
export { isSafeBinaryName, safeWhich };
