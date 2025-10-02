#!/usr/bin/env node
/**
 * @fileoverview Autofix Orchestrator Simplificado - Solo herramientas disponibles
 */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
const VERBOSE =
  process.argv.includes('--verbose') || process.argv.includes('-v');

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
  console.log(
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

// Fixers disponibles
const fixers = {
  javascript: {
    name: 'JavaScript/TypeScript',
    commands: [
      {
        name: 'ESLint --fix',
        cmd: 'npx',
        args: ['eslint', '--fix', '--ext', '.js,.mjs,.ts', '.'],
        dryRun: [
          'npx',
          'eslint',
          '--ext',
          '.js,.mjs,.ts',
          '.',
          '--format',
          'json'
        ]
      },
      {
        name: 'Prettier --write',
        cmd: 'npx',
        args: ['prettier', '--write', '.', '--ignore-path', '.prettierignore'],
        dryRun: [
          'npx',
          'prettier',
          '--check',
          '.',
          '--ignore-path',
          '.prettierignore'
        ]
      }
    ]
  }
};

async function runFixer(language, fixer) {
  log('blue', `🔧 Ejecutando fixes para ${fixer.name}...`);

  const results = {
    language,
    name: fixer.name,
    commands: [],
    success: true,
    errors: []
  };

  for (const command of fixer.commands) {
    log('cyan', `  📝 ${command.name}...`);

    try {
      const args = DRY_RUN ? command.dryRun : command.args;
      const result = await runCommand(command.cmd, args);

      const commandResult = {
        name: command.name,
        cmd: command.cmd,
        args: args,
        code: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        success: result.code === 0
      };

      results.commands.push(commandResult);

      if (result.code !== 0) {
        results.success = false;
        results.errors.push(`${command.name} failed with code ${result.code}`);
        log('red', `    ❌ ${command.name} failed (code: ${result.code})`);
        if (VERBOSE && result.stderr) {
          log('red', `    Error: ${result.stderr.substring(0, 200)}...`);
        }
      } else {
        log('green', `    ✅ ${command.name} completed`);
        if (VERBOSE && result.stdout) {
          log('blue', `    Output: ${result.stdout.substring(0, 200)}...`);
        }
      }
    } catch (error) {
      results.success = false;
      results.errors.push(`${command.name} error: ${error.message}`);
      log('red', `    ❌ ${command.name} error: ${error.message}`);
    }
  }

  return results;
}

async function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'apply',
    summary: {
      total_languages: results.length,
      successful_languages: results.filter(r => r.success).length,
      failed_languages: results.filter(r => !r.success).length,
      total_commands: results.reduce((sum, r) => sum + r.commands.length, 0),
      successful_commands: results.reduce(
        (sum, r) => sum + r.commands.filter(c => c.success).length,
        0
      ),
      failed_commands: results.reduce(
        (sum, r) => sum + r.commands.filter(c => !c.success).length,
        0
      )
    },
    results
  };

  // Crear directorio de reportes
  const reportsDir = join(PROJECT_ROOT, '.reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  // Guardar reporte JSON
  const reportFile = join(reportsDir, 'autofix-report.json');
  writeFileSync(reportFile, JSON.stringify(report, null, 2));

  log('blue', `📊 Reporte guardado en: ${reportFile}`);

  return report;
}

async function main() {
  log('blue', '🚀 Iniciando Autofix Orchestrator (Simplificado)');
  log('blue', `📋 Modo: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);

  if (!DRY_RUN && !APPLY) {
    log('yellow', '⚠️  Usar --dry-run para preview o --apply para ejecutar');
    process.exit(1);
  }

  const results = [];

  // Ejecutar solo fixers de JavaScript/TypeScript
  for (const [lang, fixer] of Object.entries(fixers)) {
    try {
      const result = await runFixer(lang, fixer);
      results.push(result);
    } catch (error) {
      log('red', `❌ Error ejecutando ${fixer.name}: ${error.message}`);
      results.push({
        language: lang,
        name: fixer.name,
        commands: [],
        success: false,
        errors: [error.message]
      });
    }
  }

  // Generar reporte
  const report = await generateReport(results);

  // Mostrar resumen
  log('blue', '\n📊 RESUMEN:');
  log('blue', `  Lenguajes procesados: ${report.summary.total_languages}`);
  log('green', `  Exitosos: ${report.summary.successful_languages}`);
  log('red', `  Fallidos: ${report.summary.failed_languages}`);
  log('blue', `  Comandos ejecutados: ${report.summary.total_commands}`);
  log('green', `  Exitosos: ${report.summary.successful_commands}`);
  log('red', `  Fallidos: ${report.summary.failed_commands}`);

  // Mostrar errores si los hay
  if (report.summary.failed_commands > 0) {
    log('red', '\n❌ ERRORES:');
    results.forEach(result => {
      if (!result.success) {
        log('red', `  ${result.name}:`);
        result.errors.forEach(error => {
          log('red', `    - ${error}`);
        });
      }
    });
  }

  // Exit code basado en éxito
  const overallSuccess = report.summary.failed_languages === 0;
  if (overallSuccess) {
    log('green', '\n✅ Autofix completado exitosamente');
    process.exit(0);
  } else {
    log('red', '\n❌ Autofix completado con errores');
    process.exit(1);
  }
}

// Ejecutar si es el script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log('red', `💥 Error fatal: ${error.message}`);
    process.exit(1);
  });
}
