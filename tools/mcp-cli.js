#!/usr/bin/env node
/**
 * CLI para operaciones MCP
 * Herramienta de línea de comandos para gestionar trazas y firmas MCP
 */
import { 
  createTrace, 
  updateTrace, 
  completeTrace, 
  getTrace, 
  listTraces,
  cleanupOldTraces 
} from './mcp-tracer.js';
import { 
  signCommit, 
  verifyCommitSignature, 
  extractMCPInfo, 
  generateMCPTrailer 
} from './mcp-signer.js';
import { logSecurity } from './structured-logger.mjs';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'trace':
        await handleTraceCommand();
        break;
      case 'sign':
        await handleSignCommand();
        break;
      case 'verify':
        await handleVerifyCommand();
        break;
      case 'list':
        await handleListCommand();
        break;
      case 'cleanup':
        await handleCleanupCommand();
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function handleTraceCommand() {
  const subcommand = process.argv[3];
  
  switch (subcommand) {
    case 'create':
      const operation = process.argv[4] || 'manual_operation';
      const agentId = process.argv[5] || 'cli';
      const context = {
        input: process.argv[6] || '{}',
        metadata: {
          source: 'cli',
          timestamp: new Date().toISOString()
        }
      };
      
      const traceId = createTrace(operation, context, agentId);
      console.log(`✅ Traza creada: ${traceId}`);
      console.log(`📁 Archivo: .quannex/trace/${traceId}.json`);
      break;
      
    case 'get':
      const traceIdToGet = process.argv[4];
      if (!traceIdToGet) {
        throw new Error('Se requiere traceId');
      }
      
      const trace = getTrace(traceIdToGet);
      console.log(JSON.stringify(trace, null, 2));
      break;
      
    case 'complete':
      const traceIdToComplete = process.argv[4];
      const result = process.argv[5] || 'completed';
      const error = process.argv[6];
      
      if (!traceIdToComplete) {
        throw new Error('Se requiere traceId');
      }
      
      completeTrace(traceIdToComplete, result, error ? new Error(error) : null);
      console.log(`✅ Traza completada: ${traceIdToComplete}`);
      break;
      
    default:
      console.log('Comandos de traza disponibles:');
      console.log('  create <operation> [agentId] [context]');
      console.log('  get <traceId>');
      console.log('  complete <traceId> [result] [error]');
      break;
  }
}

async function handleSignCommand() {
  const subcommand = process.argv[3];
  
  switch (subcommand) {
    case 'commit':
      const commitMessage = process.argv[4];
      const traceId = process.argv[5];
      
      if (!commitMessage || !traceId) {
        throw new Error('Se requiere: commitMessage traceId');
      }
      
      const signedCommit = await signCommit(commitMessage, traceId);
      console.log('✅ Commit firmado:');
      console.log(signedCommit.fullMessage);
      break;
      
    case 'trailer':
      const traceIdForTrailer = process.argv[4];
      
      if (!traceIdForTrailer) {
        throw new Error('Se requiere traceId');
      }
      
      const trailer = await generateMCPTrailer(traceIdForTrailer);
      console.log(`✅ Trailer MCP: ${trailer}`);
      break;
      
    default:
      console.log('Comandos de firma disponibles:');
      console.log('  commit <message> <traceId>');
      console.log('  trailer <traceId>');
      break;
  }
}

async function handleVerifyCommand() {
  const commitMessage = process.argv[3];
  
  if (!commitMessage) {
    throw new Error('Se requiere mensaje de commit');
  }
  
  const mcpInfo = extractMCPInfo(commitMessage);
  
  if (!mcpInfo) {
    console.log('❌ No se encontró información MCP en el mensaje');
    return;
  }
  
  const isValid = await verifyCommitSignature(commitMessage, mcpInfo.traceId, mcpInfo.signature);
  
  if (isValid) {
    console.log('✅ Firma MCP válida');
    console.log(`   TraceId: ${mcpInfo.traceId}`);
    console.log(`   Firma: ${mcpInfo.signature.substring(0, 8)}...`);
  } else {
    console.log('❌ Firma MCP inválida');
  }
}

async function handleListCommand() {
  const filters = {};
  
  // Parsear filtros de la línea de comandos
  for (let i = 3; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    const value = process.argv[i + 1];
    
    if (key === '--agent') {
      filters.agentId = value;
    } else if (key === '--operation') {
      filters.operation = value;
    } else if (key === '--status') {
      filters.status = value;
    } else if (key === '--since') {
      filters.since = value;
    }
  }
  
  const traces = listTraces(filters);
  
  console.log(`📊 Trazas encontradas: ${traces.length}`);
  console.log('');
  
  traces.forEach(trace => {
    console.log(`🔍 ${trace.traceId}`);
    console.log(`   Operación: ${trace.operation}`);
    console.log(`   Agente: ${trace.agentId}`);
    console.log(`   Estado: ${trace.status}`);
    console.log(`   Timestamp: ${trace.timestamp}`);
    if (trace.duration) {
      console.log(`   Duración: ${trace.duration}ms`);
    }
    console.log('');
  });
}

async function handleCleanupCommand() {
  const maxAgeDays = parseInt(process.argv[3]) || 30;
  
  const cleanedCount = cleanupOldTraces(maxAgeDays);
  
  console.log(`🧹 Trazas limpiadas: ${cleanedCount}`);
  console.log(`📅 Edad máxima: ${maxAgeDays} días`);
}

function showHelp() {
  console.log('🔐 MCP CLI - Herramienta de gestión MCP');
  console.log('');
  console.log('Comandos disponibles:');
  console.log('');
  console.log('📊 Trazas:');
  console.log('  node tools/mcp-cli.js trace create <operation> [agentId] [context]');
  console.log('  node tools/mcp-cli.js trace get <traceId>');
  console.log('  node tools/mcp-cli.js trace complete <traceId> [result] [error]');
  console.log('');
  console.log('🔐 Firmas:');
  console.log('  node tools/mcp-cli.js sign commit <message> <traceId>');
  console.log('  node tools/mcp-cli.js sign trailer <traceId>');
  console.log('');
  console.log('✅ Verificación:');
  console.log('  node tools/mcp-cli.js verify <commitMessage>');
  console.log('');
  console.log('📋 Listado:');
  console.log('  node tools/mcp-cli.js list [--agent <agentId>] [--operation <operation>] [--status <status>] [--since <date>]');
  console.log('');
  console.log('🧹 Limpieza:');
  console.log('  node tools/mcp-cli.js cleanup [maxAgeDays]');
  console.log('');
  console.log('Ejemplos:');
  console.log('  node tools/mcp-cli.js trace create "test_operation" "security"');
  console.log('  node tools/mcp-cli.js sign commit "feat: add security" abc123...');
  console.log('  node tools/mcp-cli.js list --agent security --status completed');
}

// Ejecutar CLI
main();
