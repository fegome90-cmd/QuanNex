#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import { spawn } from 'child_process';
import http from 'node:http';

const METRICS_URL = 'http://localhost:9464/metrics';
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

async function checkMetrics() {
  try {
    const response = await fetch(METRICS_URL);
    const text = await response.text();
    const lines = text.split('\n').slice(0, 5);
    console.log('📊 Métricas Prometheus:');
    lines.forEach(line => {
      if (line.trim()) console.log(`  ${line}`);
    });
    return true;
  } catch (err) {
    console.error('❌ Métricas no disponibles:', err.message);
    return false;
  }
}

async function getPGCount() {
  try {
    const result = await execCommand('psql', [PG_URL, '-Atc', 'SELECT COUNT(*) FROM taskdb_events;']);
    return parseInt(result) || 0;
  } catch (err) {
    console.warn('⚠️ PostgreSQL no disponible:', err.message);
    return 0;
  }
}

async function getSQLiteCount() {
  try {
    const result = await execCommand('sqlite3', [SQLITE_PATH, 'SELECT COUNT(*) FROM taskdb_events;']);
    return parseInt(result) || 0;
  } catch (err) {
    console.warn('⚠️ SQLite no disponible:', err.message);
    return 0;
  }
}

async function main() {
  console.log('🩺 Health Quick-Check - TaskDB Shadow Write\n');
  
  const startTime = Date.now();
  
  // 1. Verificar métricas
  const metricsOk = await checkMetrics();
  
  // 2. Verificar conteos
  const [pgCount, sqliteCount] = await Promise.all([
    getPGCount(),
    getSQLiteCount()
  ]);
  
  const delta = Math.abs(pgCount - sqliteCount);
  const deltaPercent = Math.max(pgCount, sqliteCount) > 0 ? 
    (delta / Math.max(pgCount, sqliteCount)) * 100 : 0;
  
  console.log('\n📊 Conteos:');
  console.log(`  PostgreSQL: ${pgCount} eventos`);
  console.log(`  SQLite:     ${sqliteCount} eventos`);
  console.log(`  Delta:      ${delta} eventos (${deltaPercent.toFixed(2)}%)`);
  
  // 3. Evaluar salud
  const duration = Date.now() - startTime;
  console.log(`\n⏱️ Duración: ${duration}ms`);
  
  let healthy = true;
  let issues = [];
  
  if (!metricsOk) {
    healthy = false;
    issues.push('Métricas no disponibles');
  }
  
  if (deltaPercent > 2) {
    healthy = false;
    issues.push(`Delta alto: ${deltaPercent.toFixed(2)}%`);
  }
  
  if (duration > 5000) {
    healthy = false;
    issues.push(`Lentitud: ${duration}ms`);
  }
  
  // 4. Resultado
  if (healthy) {
    console.log('✅ Estado: SALUDABLE');
    process.exit(0);
  } else {
    console.log('❌ Estado: PROBLEMAS DETECTADOS');
    console.log('🔧 Issues:', issues.join(', '));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Error en health check:', err.message);
  process.exit(1);
});
