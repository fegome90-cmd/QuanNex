#!/usr/bin/env node
/**
 * quannex-audit.mjs
 * Auditoría completa de uso de MCP QuanNex
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

class QuanNexAuditor {
  constructor() {
    this.traceDir = join(PROJECT_ROOT, '.quannex', 'trace');
    this.logsDir = join(PROJECT_ROOT, 'logs');
  }

  async auditCommit(commitHash) {
    console.log(`🔍 Auditando commit: ${commitHash}`);
    console.log('===============================');
    
    // Obtener mensaje del commit
    const result = spawnSync('git', ['log', '-1', '--pretty=%B', commitHash], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    if (result.status !== 0) {
      console.log('❌ Error obteniendo commit');
      return false;
    }
    
    const msg = result.stdout;
    console.log(`📝 Mensaje: ${msg.split('\n')[0]}`);
    
    // Verificar trailer QuanNex
    const trailer = msg.match(/QuanNex: requestId=([^ ]+) sig=([0-9a-f]+)/);
    
    if (!trailer) {
      console.log('❌ NO USÓ MCP - Sin trailer QuanNex');
      return false;
    }
    
    const [, requestId, signature] = trailer;
    console.log(`📋 RequestId: ${requestId}`);
    console.log(`🔐 Firma: ${signature.substring(0, 16)}...`);
    
    // Verificar traza
    const traceFile = join(this.traceDir, `${requestId}.json`);
    
    if (!existsSync(traceFile)) {
      console.log('❌ NO USÓ MCP - Sin traza');
      return false;
    }
    
    const trace = JSON.parse(readFileSync(traceFile, 'utf8'));
    console.log(`📄 Traza: ${traceFile}`);
    console.log(`⏰ Timestamp: ${trace.timestamp}`);
    console.log(`🔧 Operación: ${trace.operation}`);
    
    // Verificar componentes MCP
    const mcpChecks = [
      ['Handshake', trace.mcp?.handshake === true],
      ['Router Rule ID', !!trace.mcp?.router_rule_id],
      ['State', !!trace.mcp?.state],
      ['Policy OK', trace.mcp?.policy_ok === true],
      ['Tools Invoked', Array.isArray(trace.mcp?.tools_invoked) && trace.mcp.tools_invoked.length > 0]
    ];
    
    console.log('\n🤖 Verificaciones MCP:');
    let mcpScore = 0;
    for (const [check, passed] of mcpChecks) {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
      if (passed) mcpScore++;
    }
    
    // Verificar firma
    const signingKey = process.env.QUANNEX_SIGNING_KEY;
    let signatureValid = false;
    
    if (signingKey) {
      const crypto = await import('node:crypto');
      const expectedSig = crypto.createHmac('sha256', signingKey)
        .update(requestId)
        .digest('hex');
      signatureValid = signature === expectedSig;
      console.log(`\n🔐 Verificación de firma: ${signatureValid ? '✅' : '❌'}`);
    } else {
      console.log('\n⚠️  QUANNEX_SIGNING_KEY no configurada - no se puede verificar firma');
    }
    
    // Buscar en logs
    const logFiles = this.findLogFiles();
    let foundInLogs = false;
    
    for (const logFile of logFiles) {
      try {
        const content = readFileSync(logFile, 'utf8');
        if (content.includes(requestId)) {
          console.log(`📊 Encontrado en logs: ${logFile}`);
          foundInLogs = true;
        }
      } catch (error) {
        // Ignorar errores de lectura
      }
    }
    
    if (!foundInLogs) {
      console.log('⚠️  No encontrado en logs del sistema');
    }
    
    // Resultado final
    const totalChecks = mcpChecks.length + 1; // +1 por firma
    const passedChecks = mcpScore + (signatureValid ? 1 : 0);
    const score = (passedChecks / totalChecks) * 100;
    
    console.log(`\n📊 Puntuación: ${score.toFixed(1)}% (${passedChecks}/${totalChecks})`);
    
    if (score >= 80) {
      console.log('✅ USÓ MCP - Verificación exitosa');
      return true;
    } else if (score >= 50) {
      console.log('⚠️  MCP PARCIAL - Algunas verificaciones fallaron');
      return false;
    } else {
      console.log('❌ NO USÓ MCP - Verificación falló');
      return false;
    }
  }

  async auditLastCommit() {
    console.log('🔍 Auditando último commit');
    console.log('==========================');
    
    const result = spawnSync('git', ['log', '-1', '--pretty=%H'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    if (result.status !== 0) {
      console.log('❌ Error obteniendo último commit');
      return false;
    }
    
    const commitHash = result.stdout.trim();
    return await this.auditCommit(commitHash);
  }

  async auditRecentCommits(limit = 5) {
    console.log(`🔍 Auditando últimos ${limit} commits`);
    console.log('=====================================');
    
    const result = spawnSync('git', ['log', `-${limit}`, '--pretty=%H'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    if (result.status !== 0) {
      console.log('❌ Error obteniendo commits');
      return;
    }
    
    const commits = result.stdout.trim().split('\n');
    let mcpCount = 0;
    let totalCount = commits.length;
    
    for (const commit of commits) {
      console.log(`\n--- Commit: ${commit.substring(0, 8)} ---`);
      const usedMCP = await this.auditCommit(commit);
      if (usedMCP) mcpCount++;
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Total commits: ${totalCount}`);
    console.log(`  Con MCP: ${mcpCount}`);
    console.log(`  Sin MCP: ${totalCount - mcpCount}`);
    console.log(`  Porcentaje MCP: ${((mcpCount / totalCount) * 100).toFixed(1)}%`);
  }

  findLogFiles() {
    const logFiles = [];
    
    if (existsSync(this.logsDir)) {
      const files = readdirSync(this.logsDir);
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.log')) {
          logFiles.push(join(this.logsDir, file));
        }
      }
    }
    
    return logFiles;
  }

  async auditTraces() {
    console.log('🔍 Auditando trazas QuanNex');
    console.log('============================');
    
    if (!existsSync(this.traceDir)) {
      console.log('❌ Directorio de trazas no existe');
      return;
    }
    
    const files = readdirSync(this.traceDir);
    const traceFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`📄 Trazas encontradas: ${traceFiles.length}`);
    
    let validTraces = 0;
    let invalidTraces = 0;
    
    for (const file of traceFiles) {
      const traceFile = join(this.traceDir, file);
      try {
        const trace = JSON.parse(readFileSync(traceFile, 'utf8'));
        
        const isValid = trace.mcp?.handshake === true && 
                       trace.mcp?.policy_ok === true &&
                       Array.isArray(trace.mcp?.tools_invoked);
        
        if (isValid) {
          validTraces++;
          console.log(`  ✅ ${file}: ${trace.operation} (${trace.timestamp})`);
        } else {
          invalidTraces++;
          console.log(`  ❌ ${file}: Traza inválida`);
        }
      } catch (error) {
        invalidTraces++;
        console.log(`  ❌ ${file}: Error de parsing`);
      }
    }
    
    console.log(`\n📊 Resumen de trazas:`);
    console.log(`  Válidas: ${validTraces}`);
    console.log(`  Inválidas: ${invalidTraces}`);
    console.log(`  Total: ${traceFiles.length}`);
  }

  showHelp() {
    console.log('QuanNex Auditor - Verificación de uso de MCP');
    console.log('=============================================');
    console.log('');
    console.log('Comandos:');
    console.log('  last                 Auditar último commit');
    console.log('  recent [n]           Auditar últimos n commits (default: 5)');
    console.log('  commit <hash>        Auditar commit específico');
    console.log('  traces               Auditar todas las trazas');
    console.log('  help                 Mostrar esta ayuda');
    console.log('');
    console.log('Ejemplos:');
    console.log('  quannex-audit last');
    console.log('  quannex-audit recent 10');
    console.log('  quannex-audit commit abc123');
    console.log('  quannex-audit traces');
  }
}

// Ejecutar auditor
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new QuanNexAuditor();
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'last':
      auditor.auditLastCommit();
      break;
      
    case 'recent':
      const limit = parseInt(args[0]) || 5;
      auditor.auditRecentCommits(limit);
      break;
      
    case 'commit':
      const commitHash = args[0];
      if (!commitHash) {
        console.log('❌ Error: Hash de commit requerido');
        process.exit(1);
      }
      auditor.auditCommit(commitHash);
      break;
      
    case 'traces':
      auditor.auditTraces();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      auditor.showHelp();
      break;
      
    default:
      console.log('❌ Comando desconocido:', command);
      auditor.showHelp();
      process.exit(1);
  }
}

export default QuanNexAuditor;
