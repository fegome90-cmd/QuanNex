#!/usr/bin/env node

/**
 * RAG Ingest CLI
 * Script para ingesta idempotente de documentos al sistema RAG
 */

import { program } from 'yargs';
import { readFile, readdir, stat } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración por defecto
const DEFAULT_CONFIG = {
  chunkSize: 512,
  chunkOverlap: 50,
  supportedTypes: [
    '.md', '.txt', '.json', '.html', '.pdf', '.docx'
  ],
  batchSize: 10,
  purgeObsolete: false
};

/**
 * Calcula hash SHA-256 de un contenido
 */
function calculateHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Extrae contenido de un archivo según su tipo
 */
async function extractContent(filePath, contentType) {
  const content = await readFile(filePath, 'utf-8');
  
  switch (path.extname(filePath).toLowerCase()) {
    case '.md':
      return { content, metadata: { type: 'markdown' } };
    case '.txt':
      return { content, metadata: { type: 'text' } };
    case '.json':
      const jsonData = JSON.parse(content);
      return { 
        content: JSON.stringify(jsonData, null, 2),
        metadata: { type: 'json', structure: Object.keys(jsonData) }
      };
    case '.html':
      return { content, metadata: { type: 'html' } };
    default:
      return { content, metadata: { type: 'unknown' } };
  }
}

/**
 * Divide contenido en chunks semánticos
 */
function createChunks(content, chunkSize = 512, overlap = 50) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = sentence.trim().split(/\s+/).length;
    
    if (tokenCount + sentenceTokens > chunkSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount
      });
      currentChunk = currentChunk.slice(-overlap) + sentence;
      tokenCount = Math.min(tokenCount, overlap);
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
      tokenCount += sentenceTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount
    });
  }

  return chunks;
}

/**
 * Procesa un archivo individual
 */
async function processFile(filePath, config) {
  try {
    const stats = await stat(filePath);
    const uri = path.relative(process.cwd(), filePath);
    
    console.log(`📄 Procesando: ${uri}`);
    
    const { content, metadata } = await extractContent(filePath);
    const contentHash = calculateHash(content);
    
    const fileInfo = {
      uri,
      title: path.basename(filePath, path.extname(filePath)),
      contentHash,
      contentType: path.extname(filePath),
      sizeBytes: stats.size,
      metadata: {
        ...metadata,
        filePath: uri,
        lastModified: stats.mtime.toISOString()
      }
    };

    const chunks = createChunks(content, config.chunkSize, config.chunkOverlap);
    
    console.log(`  ✅ ${chunks.length} chunks generados`);
    
    return {
      file: fileInfo,
      chunks: chunks.map((chunk, index) => ({
        chunkIndex: index,
        content: chunk.content,
        contentHash: calculateHash(chunk.content),
        tokenCount: chunk.tokenCount,
        metadata: {
          ...fileInfo.metadata,
          chunkIndex: index
        }
      }))
    };
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Procesa directorio recursivamente
 */
async function processDirectory(dirPath, config) {
  const results = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      const subResults = await processDirectory(fullPath, config);
      results.push(...subResults);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (config.supportedTypes.includes(ext)) {
        const result = await processFile(fullPath, config);
        if (result) {
          results.push(result);
        }
      }
    }
  }

  return results;
}

/**
 * Función principal
 */
async function main() {
  const args = await program
    .option('input', {
      alias: 'i',
      type: 'string',
      description: 'Archivo o directorio a procesar',
      demandOption: true
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Archivo de salida JSON',
      default: 'rag-ingest-output.json'
    })
    .option('chunk-size', {
      type: 'number',
      description: 'Tamaño de chunk en tokens',
      default: DEFAULT_CONFIG.chunkSize
    })
    .option('chunk-overlap', {
      type: 'number',
      description: 'Solapamiento entre chunks',
      default: DEFAULT_CONFIG.chunkOverlap
    })
    .option('batch-size', {
      type: 'number',
      description: 'Tamaño de lote para procesamiento',
      default: DEFAULT_CONFIG.batchSize
    })
    .option('purge-obsolete', {
      type: 'boolean',
      description: 'Eliminar chunks obsoletos por URI',
      default: DEFAULT_CONFIG.purgeObsolete
    })
    .option('dry-run', {
      type: 'boolean',
      description: 'Simular sin guardar en base de datos',
      default: false
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Salida verbosa',
      default: false
    })
    .help()
    .parse();

  const config = {
    chunkSize: args.chunkSize,
    chunkOverlap: args.chunkOverlap,
    batchSize: args.batchSize,
    purgeObsolete: args.purgeObsolete,
    supportedTypes: DEFAULT_CONFIG.supportedTypes
  };

  console.log('🚀 Iniciando ingesta RAG...');
  console.log(`📁 Input: ${args.input}`);
  console.log(`📄 Output: ${args.output}`);
  console.log(`⚙️  Config:`, config);

  try {
    const inputPath = path.resolve(args.input);
    const stats = await stat(inputPath);
    
    let results = [];
    
    if (stats.isFile()) {
      console.log('📄 Procesando archivo individual...');
      const result = await processFile(inputPath, config);
      if (result) {
        results = [result];
      }
    } else if (stats.isDirectory()) {
      console.log('📁 Procesando directorio...');
      results = await processDirectory(inputPath, config);
    } else {
      throw new Error('Input debe ser un archivo o directorio');
    }

    console.log(`\n📊 Resumen:`);
    console.log(`  📄 Archivos procesados: ${results.length}`);
    console.log(`  📝 Total chunks: ${results.reduce((sum, r) => sum + r.chunks.length, 0)}`);
    console.log(`  💾 Tamaño total: ${results.reduce((sum, r) => sum + r.file.sizeBytes, 0)} bytes`);

    if (args.dryRun) {
      console.log('\n🧪 Modo dry-run - No se guardará en base de datos');
    } else {
      console.log('\n💾 Guardando resultados...');
      // Aquí iría la lógica para guardar en PostgreSQL y Qdrant
      console.log('  ⚠️  Funcionalidad de guardado pendiente de implementación');
    }

    // Guardar resultados en archivo JSON
    await import('fs/promises').then(fs => 
      fs.writeFile(args.output, JSON.stringify(results, null, 2))
    );
    
    console.log(`✅ Resultados guardados en: ${args.output}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { processFile, processDirectory, createChunks };
