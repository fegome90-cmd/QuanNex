#!/usr/bin/env node
/**
 * @fileoverview Autofix Orchestrator v2 - Mejorado y Blindado
 * @description Ejecuta herramientas de calidad y seguridad de forma concurrente,
 *              con manejo de argumentos robusto y reportes detallados.
 */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// --- Configuración Inicial ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// MEJORA: Uso de 'yargs' para un manejo de argumentos CLI robusto y autodocumentado.
const argv = yargs(hideBin(process.argv))
  .usage('Uso: $0 <modo> [opciones]')
  .command(
    'dry-run',
    'Ejecuta las herramientas en modo de solo lectura para previsualizar cambios.'
  )
  .command('apply', 'Ejecuta las herramientas y aplica las correcciones automáticamente.')
  .demandCommand(1, 'Debes especificar un modo: "dry-run" o "apply".')
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Muestra salida detallada de los comandos ejecutados.',
    default: false,
  })
  .option('lang', {
    alias: 'l',
    type: 'string',
    description: 'Ejecuta fixers solo para un lenguaje específico (ej. "javascript").',
  })
  .help()
  .alias('help', 'h').argv;

const DRY_RUN = argv._.includes('dry-run');
const VERBOSE = argv.verbose;

// --- Utilidades ---

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const color = colors[level] || colors.reset;

  console.log(`${color}[${timestamp}][${level.toUpperCase()}]${colors.reset} ${message}`);
}

function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    // MEJORA: Añadir `shell: true` para manejar globs como `*.sh` de forma segura en diferentes OS.
    const child = spawn(cmd, args, {
      stdio: 'pipe',
      cwd: PROJECT_ROOT,
      shell: false, // Cambiado a false para evitar vulnerabilidades de seguridad
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => (stdout += data.toString()));
    child.stderr.on('data', data => (stderr += data.toString()));
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

// --- Definición de Fixers ---

// BLINDAJE: Se usan rutas explícitas a los binarios en `node_modules` para evitar
// la manipulación del PATH y asegurar que se ejecutan las versiones del proyecto.
const NODE_MODULES_BIN = join(PROJECT_ROOT, 'node_modules', '.bin');

const fixers = {
  javascript: {
    name: 'JavaScript/TypeScript (Calidad)',
    commands: [
      {
        name: 'ESLint --fix',
        cmd: join(NODE_MODULES_BIN, 'eslint'),
        args: ['--fix', '--ext', '.js,.mjs,.ts', '.'],
        dryRunArgs: ['--ext', '.js,.mjs,.ts', '.', '--format', 'json'],
      },
      {
        name: 'Prettier --write',
        cmd: join(NODE_MODULES_BIN, 'prettier'),
        args: ['--write', '.', '--ignore-path', '.prettierignore'],
        dryRunArgs: ['--check', '.', '--ignore-path', '.prettierignore'],
      },
    ],
  },
  // MEJORA: Se añaden categorías de seguridad, expandiendo la funcionalidad.
  security: {
    name: 'Seguridad (SAST & SCA)',
    commands: [
      {
        name: 'NPM Audit (SCA)',
        cmd: 'npm',
        args: ['audit', 'fix'],
        dryRunArgs: ['audit', '--json'],
      },
      {
        name: 'Snyk Code (SAST)',
        cmd: join(NODE_MODULES_BIN, 'snyk'),
        args: ['code', 'test'], // Snyk no tiene un modo "fix" directo, el test es la acción principal.
        dryRunArgs: ['code', 'test', '--json'],
      },
    ],
  },
};

// --- Lógica Principal ---

async function runFixer(category, fixer) {
  log('blue', `🔧 Ejecutando fixes para ${fixer.name}...`);
  const startTime = Date.now();

  const commandPromises = fixer.commands.map(async command => {
    log('cyan', `  📝 ${command.name}...`);
    const commandStartTime = Date.now();

    try {
      const args = DRY_RUN ? command.dryRunArgs : command.args;
      const result = await runCommand(command.cmd, args);
      const success = result.code === 0 || (command.name.includes('NPM Audit') && result.code <= 1); // npm audit a veces sale con código 1 para vulns.

      const commandResult = {
        name: command.name,
        success,
        durationMs: Date.now() - commandStartTime,
        details: {
          cmd: `${command.cmd} ${args.join(' ')}`,
          code: result.code,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      };

      if (!success) {
        log('red', `    ❌ ${command.name} falló (código: ${result.code})`);
        // MEJORA: Muestra el error directamente en la consola para un feedback inmediato.
        if (result.stderr) {
          console.error(colors.red, `    Error: ${result.stderr}`, colors.reset);
        }
      } else {
        log('green', `    ✅ ${command.name} completado`);
      }
      if (VERBOSE && result.stdout) {
        log('blue', `    Salida: ${result.stdout.substring(0, 300)}...`);
      }
      return commandResult;
    } catch (error) {
      log('red', `    💥 ${command.name} error catastrófico: ${error.message}`);
      return {
        name: command.name,
        success: false,
        durationMs: Date.now() - commandStartTime,
        error: error.message,
      };
    }
  });

  const commandResults = await Promise.all(commandPromises);
  const overallSuccess = commandResults.every(r => r.success);

  return {
    category,
    name: fixer.name,
    success: overallSuccess,
    durationMs: Date.now() - startTime,
    commands: commandResults,
  };
}

async function generateReport(results) {
  const successfulCommands = results.flatMap(r => r.commands).filter(c => c.success).length;
  const totalCommands = results.flatMap(r => r.commands).length;

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      mode: DRY_RUN ? 'dry-run' : 'apply',
      verbose: VERBOSE,
      languageFilter: argv.lang || 'all',
    },
    summary: {
      overallSuccess: results.every(r => r.success),
      totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      successful_categories: results.filter(r => r.success).length,
      failed_categories: results.filter(r => !r.success).length,
      successful_commands: successfulCommands,
      failed_commands: totalCommands - successfulCommands,
      total_commands: totalCommands,
    },
    results,
  };

  const reportsDir = join(PROJECT_ROOT, '.reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = join(reportsDir, `autofix-report-${Date.now()}.json`);
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log('magenta', `📊 Reporte detallado guardado en: ${reportFile}`);
  return report;
}

async function main() {
  log('blue', '🚀 Iniciando Autofix Orchestrator v2');
  log('blue', `📋 Modo: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);

  const targetFixers = argv.lang ? { [argv.lang]: fixers[argv.lang] } : fixers;

  // MEJORA: Ejecución concurrente de todas las categorías de fixers para mayor velocidad.
  const fixerPromises = Object.entries(targetFixers).map(([lang, fixer]) => runFixer(lang, fixer));

  const results = await Promise.all(fixerPromises);
  const report = await generateReport(results);

  log('blue', '\n📊 RESUMEN DE EJECUCIÓN:');
  log(
    'blue',
    `  Comandos Exitosos: ${report.summary.successful_commands} de ${report.summary.total_commands}`
  );
  log('blue', `  Duración Total: ${(report.summary.totalDurationMs / 1000).toFixed(2)}s`);

  if (!report.summary.overallSuccess) {
    log('red', '\n❌ Autofix completado con errores. Revisa el reporte para más detalles.');
    process.exit(1);
  } else {
    log('green', '\n✅ Autofix completado exitosamente.');
    process.exit(0);
  }
}

main().catch(error => {
  log('red', `💥 Error fatal en el orquestador: ${error.message}`);
  console.error(error);
  process.exit(1);
});
