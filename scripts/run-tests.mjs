#!/usr/bin/env node

import { glob } from 'glob';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Cross-platform test runner for contract tests
 * Resolves glob patterns that work on Windows CMD/PowerShell
 */
async function runTests() {
  try {
    console.log('🔍 Buscando archivos de test...');

    // Buscar archivos de test con glob cross-platform
    const testFiles = await glob('tests/contracts/**/*.mjs', {
      cwd: projectRoot,
      windowsPathsNoEscape: true,
    });

    if (testFiles.length === 0) {
      console.log('⚠️  No se encontraron archivos de test en tests/contracts/');
      return;
    }

    console.log(`📋 Encontrados ${testFiles.length} archivos de test:`);
    testFiles.forEach(file => console.log(`   - ${file}`));

    // Ejecutar tests con Node.js
    console.log('\n🧪 Ejecutando tests...');
    const proc = spawn('node', ['--test', ...testFiles], {
      stdio: 'inherit',
      cwd: projectRoot,
    });

    proc.on('exit', code => {
      if (code === 0) {
        console.log('\n✅ Todos los tests pasaron exitosamente');
      } else {
        console.log(`\n❌ Tests fallaron con código ${code}`);
      }
      process.exit(code);
    });

    proc.on('error', error => {
      console.error('❌ Error ejecutando tests:', error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Error en runner de tests:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
