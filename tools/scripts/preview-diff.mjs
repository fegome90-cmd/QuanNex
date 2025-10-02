#!/usr/bin/env node
/**
 * @fileoverview Preview Diff Generator - Genera diff de cambios de autofix
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Colores
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const color = colors[level] || colors.reset;
  console.error(
    `${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}`
  );
}

function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });
    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', error => {
      reject(error);
    });
  });
}

async function generateDiff() {
  log('blue', '🔍 Generando diff de cambios...');

  try {
    // Verificar si hay cambios staged
    const gitStatus = await runCommand('git', ['status', '--porcelain']);
    if (gitStatus.stdout.trim() === '') {
      log('yellow', '⚠️  No hay cambios para mostrar');
      return;
    }

    // Generar diff
    const diffResult = await runCommand('git', ['diff', '--no-color']);

    if (diffResult.stdout.trim() === '') {
      log('yellow', '⚠️  No hay cambios en el working directory');
      return;
    }

    // Crear directorio de reportes
    const reportsDir = join(PROJECT_ROOT, '.reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    // Guardar diff
    const diffFile = join(reportsDir, 'autofix.diff');
    require('fs').writeFileSync(diffFile, diffResult.stdout);

    log('green', `✅ Diff guardado en: ${diffFile}`);
    log('blue', `📊 Tamaño del diff: ${diffResult.stdout.length} caracteres`);

    // Mostrar resumen
    const lines = diffResult.stdout.split('\n');
    const addedLines = lines.filter(
      line => line.startsWith('+') && !line.startsWith('+++')
    ).length;
    const removedLines = lines.filter(
      line => line.startsWith('-') && !line.startsWith('---')
    ).length;

    log('blue', `📈 Líneas añadidas: ${addedLines}`);
    log('blue', `📉 Líneas eliminadas: ${removedLines}`);

    return {
      file: diffFile,
      size: diffResult.stdout.length,
      addedLines,
      removedLines,
      content: diffResult.stdout
    };
  } catch (error) {
    log('red', `❌ Error generando diff: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    const result = await generateDiff();
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    log('red', `💥 Error fatal: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es el script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
