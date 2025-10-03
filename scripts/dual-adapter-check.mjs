#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import { spawn } from 'child_process';
import fs from 'node:fs';

const PG_URL = process.env.TASKDB_PG_URL || 'postgres://user:pass@localhost:5432/taskdb';
const SQLITE_PATH = process.env.TASKDB_SQLITE_PATH || './data/taskdb.sqlite';

function execCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed: ${stderr}`));
      }
    });
  });
}

async function getPGCount() {
  try {
    const result = await execCommand('psql', [PG_URL, '-Atc', 'SELECT COUNT(*) FROM taskdb_events;']);
    return parseInt(result) || 0;
  } catch (err) {
    console.warn('⚠️ Error querying PostgreSQL:', err.message);
    return 0;
  }
}

async function getSQLiteCount() {
  try {
    if (!fs.existsSync(SQLITE_PATH)) {
      return 0;
    }
    const result = await execCommand('sqlite3', [SQLITE_PATH, 'SELECT COUNT(*) FROM taskdb_events;']);
    return parseInt(result) || 0;
  } catch (err) {
    console.warn('⚠️ Error querying SQLite:', err.message);
    return 0;
  }
}

async function main() {
  console.log('🔍 Verificando consistencia dual adapter...\n');
  
  const [pgCount, sqliteCount] = await Promise.all([
    getPGCount(),
    getSQLiteCount()
  ]);
  
  const total = pgCount + sqliteCount;
  const delta = Math.abs(pgCount - sqliteCount);
  const deltaPercent = total > 0 ? (delta / total) * 100 : 0;
  
  console.log('📊 Conteos:');
  console.log(`  PostgreSQL: ${pgCount} eventos`);
  console.log(`  SQLite:     ${sqliteCount} eventos`);
  console.log(`  Total:      ${total} eventos`);
  console.log(`  Delta:      ${delta} eventos (${deltaPercent.toFixed(2)}%)`);
  
  // Estado de salud
  if (deltaPercent <= 1) {
    console.log('✅ Estado: EXCELENTE (≤1% diferencia)');
  } else if (deltaPercent <= 5) {
    console.log('⚠️ Estado: ACEPTABLE (≤5% diferencia)');
  } else {
    console.log('❌ Estado: REVISAR (>5% diferencia)');
  }
  
  // Recomendaciones
  if (deltaPercent > 5) {
    console.log('\n🔧 Recomendaciones:');
    console.log('- Revisar logs de DualTaskDB para mismatches');
    console.log('- Verificar conectividad a PostgreSQL');
    console.log('- Considerar rollback si persiste');
  }
  
  console.log(`\n⏰ Timestamp: ${new Date().toISOString()}`);
}

main().catch(console.error);
