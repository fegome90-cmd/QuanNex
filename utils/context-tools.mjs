/**
 * Context Tools - Herramientas mejoradas para el agente context
 * Implementa anatomía estándar con guardrails de I/O
 */

import { ToolBase, FileTool } from './tool-base.mjs';
import { getToolLogger } from './tool-logger.mjs';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname } from 'node:path';

/**
 * Herramienta para leer archivos con validaciones
 */
export class ReadFileTool extends FileTool {
  constructor() {
    super('read_file', 'Lee el contenido de un archivo con validaciones de seguridad', {
      path: { type: 'string', required: true, description: 'Ruta del archivo a leer' },
      max_size: {
        type: 'number',
        required: false,
        description: 'Tamaño máximo en bytes (default: 1MB)',
      },
      encoding: {
        type: 'string',
        required: false,
        description: 'Codificación del archivo (default: utf8)',
      },
    });
    this.logger = getToolLogger();
  }

  async execute(input, context = {}) {
    return await this.executeWithGuardrails(
      async input => {
        const { path, max_size = 1024 * 1024, encoding = 'utf8' } = input;

        // Validaciones adicionales
        if (!existsSync(path)) {
          throw new Error(`File not found: ${path}`);
        }

        const stats = statSync(path);
        if (stats.size > max_size) {
          throw new Error(`File too large: ${stats.size} bytes (max: ${max_size})`);
        }

        // Validar extensión de archivo
        const allowedExtensions = [
          '.js',
          '.ts',
          '.json',
          '.md',
          '.txt',
          '.yml',
          '.yaml',
          '.xml',
          '.html',
          '.css',
        ];
        const ext = extname(path).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          throw new Error(`File type not allowed: ${ext}`);
        }

        const content = readFileSync(path, encoding);

        return {
          path,
          content,
          size: stats.size,
          encoding,
          last_modified: stats.mtime.toISOString(),
        };
      },
      input,
      context
    );
  }

  getExamples() {
    return [
      {
        input: { path: 'package.json' },
        output: { success: true, data: { path: 'package.json', content: '...', size: 1234 } },
      },
      {
        input: { path: 'src/index.js', max_size: 50000 },
        output: { success: true, data: { path: 'src/index.js', content: '...', size: 2345 } },
      },
    ];
  }

  getErrorHandlingInfo() {
    return {
      common_errors: [
        'File not found',
        'File too large',
        'File type not allowed',
        'Permission denied',
      ],
      retry_strategy: 'none',
      fallback_behavior: 'return error with file path',
    };
  }
}

/**
 * Herramienta para buscar en código base
 */
export class CodebaseSearchTool extends ToolBase {
  constructor() {
    super('codebase_search', 'Busca patrones en el código base con contexto relevante', {
      query: { type: 'string', required: true, description: 'Consulta de búsqueda' },
      file_pattern: { type: 'string', required: false, description: 'Patrón de archivos a buscar' },
      max_results: { type: 'number', required: false, description: 'Máximo número de resultados' },
    });
    this.logger = getToolLogger();
  }

  async execute(input, context = {}) {
    return await this.executeWithGuardrails(
      async input => {
        const { query, max_results = 10 } = input;

        // Simulación de búsqueda en código base
        // En implementación real, usaría herramientas como ripgrep o similar
        const mockResults = [
          {
            file: 'src/utils/helper.js',
            line: 15,
            content: `// ${query} found here`,
            context: 'function helper() { ... }',
          },
          {
            file: 'docs/api.md',
            line: 42,
            content: `## ${query} documentation`,
            context: 'API reference for ...',
          },
        ].slice(0, max_results);

        return {
          query,
          results: mockResults,
          total_found: mockResults.length,
          search_time_ms: Math.random() * 100 + 50,
        };
      },
      input,
      context
    );
  }

  getExamples() {
    return [
      {
        input: { query: 'authentication', max_results: 5 },
        output: { success: true, data: { query: 'authentication', results: [], total_found: 3 } },
      },
    ];
  }

  getErrorHandlingInfo() {
    return {
      common_errors: ['Invalid query pattern', 'Search timeout', 'No results found'],
      retry_strategy: 'none',
      fallback_behavior: 'return empty results',
    };
  }
}

/**
 * Herramienta para extraer contexto de archivos
 */
export class ExtractContextTool extends ToolBase {
  constructor() {
    super('extract_context', 'Extrae contexto relevante de múltiples fuentes', {
      sources: { type: 'array', required: true, description: 'Array de fuentes a procesar' },
      selectors: {
        type: 'array',
        required: false,
        description: 'Selectores para filtrar contenido',
      },
      max_tokens: { type: 'number', required: false, description: 'Máximo número de tokens' },
    });
    this.logger = getToolLogger();
  }

  async execute(input, context = {}) {
    return await this.executeWithGuardrails(
      async input => {
        const { sources, selectors = [], max_tokens = 3000 } = input;

        if (!Array.isArray(sources) || sources.length === 0) {
          throw new Error('Sources must be a non-empty array');
        }

        const extractedContext = [];
        let totalTokens = 0;

        for (const source of sources) {
          if (totalTokens >= max_tokens) break;

          // Simulación de extracción de contexto
          const contextItem = {
            source,
            content: `Context extracted from ${source}`,
            relevance_score: Math.random(),
            tokens: Math.floor(Math.random() * 200) + 50,
            selectors_applied: selectors,
          };

          extractedContext.push(contextItem);
          totalTokens += contextItem.tokens;
        }

        return {
          sources_processed: sources.length,
          context_items: extractedContext,
          total_tokens: totalTokens,
          selectors_used: selectors,
        };
      },
      input,
      context
    );
  }

  validateInput(input) {
    const baseError = super.validateInput(input);
    if (baseError) return baseError;

    if (!Array.isArray(input.sources)) {
      return 'sources must be an array';
    }

    if (input.sources.length === 0) {
      return 'sources must not be empty';
    }

    if (input.sources.length > 50) {
      return 'sources must not exceed 50 items';
    }

    return null;
  }

  getExamples() {
    return [
      {
        input: { sources: ['package.json', 'README.md'], max_tokens: 1000 },
        output: {
          success: true,
          data: { sources_processed: 2, context_items: [], total_tokens: 856 },
        },
      },
    ];
  }

  getErrorHandlingInfo() {
    return {
      common_errors: [
        'Invalid sources array',
        'Too many sources',
        'Token limit exceeded',
        'Source not accessible',
      ],
      retry_strategy: 'partial',
      fallback_behavior: 'return partial context',
    };
  }
}

/**
 * Herramienta para validar esquemas
 */
export class ValidateSchemaTool extends ToolBase {
  constructor() {
    super('validate_schema', 'Valida datos contra un esquema JSON', {
      data: { type: 'object', required: true, description: 'Datos a validar' },
      schema: { type: 'object', required: true, description: 'Esquema de validación' },
      strict: { type: 'boolean', required: false, description: 'Validación estricta' },
    });
    this.logger = getToolLogger();
  }

  async execute(input, context = {}) {
    return await this.executeWithGuardrails(
      async input => {
        const { data, schema, strict = false } = input;

        // Validación básica de esquema
        const errors = [];
        const warnings = [];

        // Validar campos requeridos
        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data)) {
              errors.push(`Required field missing: ${field}`);
            }
          }
        }

        // Validar tipos
        if (schema.properties) {
          for (const [field, fieldSchema] of Object.entries(schema.properties)) {
            if (field in data) {
              const value = data[field];
              const expectedType = fieldSchema.type;

              if (expectedType === 'string' && typeof value !== 'string') {
                errors.push(`Field ${field} must be a string`);
              } else if (expectedType === 'number' && typeof value !== 'number') {
                errors.push(`Field ${field} must be a number`);
              } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
                errors.push(`Field ${field} must be a boolean`);
              } else if (expectedType === 'array' && !Array.isArray(value)) {
                errors.push(`Field ${field} must be an array`);
              } else if (
                expectedType === 'object' &&
                (typeof value !== 'object' || Array.isArray(value))
              ) {
                errors.push(`Field ${field} must be an object`);
              }
            }
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
          fields_validated: Object.keys(schema.properties || {}).length,
          strict_mode: strict,
        };
      },
      input,
      context
    );
  }

  getExamples() {
    return [
      {
        input: {
          data: { name: 'test', age: 25 },
          schema: {
            required: ['name'],
            properties: { name: { type: 'string' }, age: { type: 'number' } },
          },
        },
        output: { success: true, data: { valid: true, errors: [], warnings: [] } },
      },
    ];
  }

  getErrorHandlingInfo() {
    return {
      common_errors: ['Invalid schema format', 'Data validation failed', 'Schema parsing error'],
      retry_strategy: 'none',
      fallback_behavior: 'return validation errors',
    };
  }
}

// Exportar todas las herramientas
export const contextTools = {
  readFile: new ReadFileTool(),
  codebaseSearch: new CodebaseSearchTool(),
  extractContext: new ExtractContextTool(),
  validateSchema: new ValidateSchemaTool(),
};

export default contextTools;
