/**
 * contracts/threadstate.js
 * ThreadState explícito para Context v2
 * Estado real del repo: archivos, diffs, errores de build, fuentes y restricciones
 */
import { z } from 'zod';

// Esquema mínimo ThreadState
export const ZThreadState = z.object({
  files: z.array(z.string()).default([]), // paths relevantes
  diffs: z.array(z.object({ 
    file: z.string(), 
    patch: z.string() 
  })).default([]),
  build_errors: z.array(z.string()).default([]), // stderr/lint/compilación
  sources: z.array(z.object({ 
    uri: z.string().url(), 
    hash: z.string().optional(), 
    license: z.string().optional() 
  })).default([]),
  constraints: z.record(z.any()).default({}) // p.ej. line-length, style
});

export const ZThreadStateInput = z.object({
  requestId: z.string(),
  agent: z.string(),
  capability: z.string(),
  payload: z.object({
    sources: z.array(z.string()).optional(),
    selectors: z.array(z.string()).optional(),
    max_tokens: z.number().optional(),
    thread_state_id: z.string().optional()
  }),
  ts: z.string()
});

// SEMANA 3: Memory Pool para ThreadState
class ThreadStatePool {
  constructor(maxSize = 100) {
    this.pool = [];
    this.maxSize = maxSize;
    this.available = [];
  }

  acquire() {
    if (this.available.length > 0) {
      return this.available.pop();
    }
    return new ThreadStateBuilder();
  }

  release(builder) {
    if (this.available.length < this.maxSize) {
      builder.reset();
      this.available.push(builder);
    }
  }
}

const threadStatePool = new ThreadStatePool();

// Builder de ThreadState
export class ThreadStateBuilder {
  constructor() {
    this.state = {
      files: [],
      diffs: [],
      build_errors: [],
      sources: [],
      constraints: {}
    };
  }

  // Agregar archivos relevantes
  addFiles(files) {
    if (Array.isArray(files)) {
      this.state.files.push(...files);
    }
    return this;
  }

  // Agregar diffs
  addDiffs(diffs) {
    if (Array.isArray(diffs)) {
      this.state.diffs.push(...diffs);
    }
    return this;
  }

  // Agregar errores de build
  addBuildErrors(errors) {
    if (Array.isArray(errors)) {
      this.state.build_errors.push(...errors);
    }
    return this;
  }

  // Agregar fuentes
  addSources(sources) {
    if (Array.isArray(sources)) {
      this.state.sources.push(...sources);
    }
    return this;
  }

  // Agregar restricciones
  addConstraints(constraints) {
    if (typeof constraints === 'object' && constraints !== null) {
      this.state.constraints = { ...this.state.constraints, ...constraints };
    }
    return this;
  }

  // Construir ThreadState final
  build() {
    try {
      return ZThreadState.parse(this.state);
    } catch (error) {
      throw new Error(`ThreadState validation failed: ${error.message}`);
    }
  }

  // Reset para reutilizar
  reset() {
    this.state = {
      files: [],
      diffs: [],
      build_errors: [],
      sources: [],
      constraints: {}
    };
    return this;
  }
}

// Función helper para construir ThreadState desde request
export async function buildThreadState(payload) {
  // SEMANA 3: Usar memory pool
  const builder = threadStatePool.acquire();
  
  try {
    // Procesar sources si están presentes
    if (payload.sources && Array.isArray(payload.sources)) {
      const sources = payload.sources.map(uri => ({
        uri: uri.startsWith('http') ? uri : `file://${uri}`,
        hash: generateFileHash(uri),
        license: 'MIT' // Default, en producción vendría de metadata
      }));
      builder.addSources(sources);
    }

    // Procesar selectors para archivos
    if (payload.selectors && Array.isArray(payload.selectors)) {
      const files = payload.selectors.filter(s => !s.startsWith('http'));
      builder.addFiles(files);
    }

    // Agregar restricciones por defecto
    builder.addConstraints({
      'line-length': 120,
      'max-tokens': payload.max_tokens || 2000,
      'style': 'eslint'
    });

    return builder.build();
  } finally {
    // SEMANA 3: Liberar builder al pool
    threadStatePool.release(builder);
  }
}

// Helper para generar hash de archivo
function generateFileHash(filePath) {
  // En producción, esto vendría de fs.readFileSync + crypto
  return `hash_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// Validación de ThreadState
export function validateThreadState(threadState) {
  try {
    ZThreadState.parse(threadState);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Serialización para logs/trazas
export function serializeThreadState(threadState) {
  return {
    files_count: threadState.files.length,
    diffs_count: threadState.diffs.length,
    build_errors_count: threadState.build_errors.length,
    sources_count: threadState.sources.length,
    constraints_keys: Object.keys(threadState.constraints)
  };
}

export default {
  ZThreadState,
  ZThreadStateInput,
  ThreadStateBuilder,
  buildThreadState,
  validateThreadState,
  serializeThreadState
};
