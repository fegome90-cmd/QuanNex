#!/usr/bin/env node
/**
 * Gitleaks Check - Detección automática de secretos en commits
 * Gate de seguridad para el Nivel 2 de QuanNex
 */

import { execSync } from 'child_process';
import fs from 'node:fs';

async function fail(msg) {
  console.error(`\n❌ [GITLEAKS-FAIL] ${msg}\n`);
  process.exit(1);
}

async function log(msg) {
  console.log(`[GITLEAKS] ${msg}`);
}

async function checkGitleaksInstalled() {
  try {
    execSync('gitleaks version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function installGitleaks() {
  log('📦 Instalando gitleaks...');

  try {
    // Try to install via brew (macOS)
    execSync('brew install gitleaks', { stdio: 'inherit' });
    log('✅ Gitleaks instalado via brew');
    return true;
  } catch (error) {
    log('⚠️ Brew no disponible, intentando descarga directa...');

    try {
      // Download and install gitleaks manually
      const { execSync } = await import('child_process');
      execSync(
        'curl -sSfL https://github.com/zricethezav/gitleaks/releases/latest/download/gitleaks_8.18.0_darwin_amd64.tar.gz | tar -xz -C /usr/local/bin gitleaks',
        { stdio: 'inherit' }
      );
      log('✅ Gitleaks instalado via descarga directa');
      return true;
    } catch (downloadError) {
      log('❌ No se pudo instalar gitleaks automáticamente');
      log('💡 Instala manualmente: https://github.com/zricethezav/gitleaks#installation');
      return false;
    }
  }
}

async function runGitleaksCheck() {
  log('🔍 Ejecutando gitleaks check...');

  try {
    const output = execSync(
      'gitleaks detect --source . --config .gitleaks.toml --verbose --redact',
      {
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );

    log('✅ Gitleaks check completado - No se encontraron secretos');
    return true;
  } catch (error) {
    if (error.status === 1) {
      // Gitleaks found secrets
      const output = error.stdout || error.stderr || '';
      fail(`Se detectaron secretos en el repositorio:\n${output}`);
    } else {
      fail(`Error ejecutando gitleaks: ${error.message}`);
    }
  }
}

async function main() {
  try {
    log('🚀 Iniciando Gitleaks Check...');

    // Check if gitleaks is installed
    if (!(await checkGitleaksInstalled())) {
      log('⚠️ Gitleaks no está instalado');
      if (!(await installGitleaks())) {
        fail('No se pudo instalar gitleaks. Instala manualmente y vuelve a intentar.');
      }
    }

    // Check if config file exists
    if (!fs.existsSync('.gitleaks.toml')) {
      fail('Archivo de configuración .gitleaks.toml no encontrado');
    }

    // Run gitleaks check
    await runGitleaksCheck();

    log('✅ Gitleaks Check completado exitosamente.');
  } catch (error) {
    fail(`Error durante el Gitleaks Check: ${error.message}`);
  }
}

main();
