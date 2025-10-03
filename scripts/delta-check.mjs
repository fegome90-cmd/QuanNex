#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import { spawn } from 'child_process';

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
    return 0;
  }
}

async function getSQLiteCount() {
  try {
    const result = await execCommand('sqlite3', [SQLITE_PATH, 'SELECT COUNT(*) FROM taskdb_events;']);
    return parseInt(result) || 0;
  } catch (err) {
    return 0;
  }
}

async function main() {
  const [pg, sq] = await Promise.all([getPGCount(), getSQLiteCount()]);
  const d = pg - sq;
  const pct = ((Math.abs(d) / (sq || 1)) * 100).toFixed(2);
  
  const result = { pg, sq, delta: d, delta_pct: pct + '%' };
  console.log(JSON.stringify(result, null, 2));
  
  // Exit code 2 si desviación alta
  if (Math.abs(d) > Math.max(50, sq * 0.02)) {
    process.exit(2);
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
