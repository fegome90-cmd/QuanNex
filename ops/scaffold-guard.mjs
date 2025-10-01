#!/usr/bin/env node
import { execSync } from 'node:child_process';

function getGitStatus() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch (error) {
    console.error('[scaffold-guard] Cannot read git status:', error.message);
    process.exit(1);
  }
}

function isNewEntry(statusLine) {
  const code = statusLine.slice(0, 2);
  return ['??', 'A ', 'AM', 'AA'].includes(code);
}

function main() {
  const offenders = [];
  for (const line of getGitStatus()) {
    const code = line.slice(0, 2);
    const path = line.slice(3).trim();
    if (!path) continue;
    const normalized = path.replace(/\\/g, '/');
    if (!normalized.startsWith('agents/')) continue;
    if (!isNewEntry(line)) continue;
    offenders.push({ code: code.trim() || code, path: normalized });
  }

  if (offenders.length > 0) {
    console.error('[scaffold-guard] Nuevos archivos en `agents/**` detectados:');
    for (const entry of offenders) {
      console.error(`  - ${entry.code} ${entry.path}`);
    }
    console.error('Elimina o mueve estos archivos antes de continuar.');
    process.exit(1);
  }

  console.log('[scaffold-guard] Sin archivos nuevos en `agents/**`.');
}

main();
