#!/usr/bin/env node
/**
 * Anti-Tamper Gate Anti-Manipulación
 * Verifica que el working tree no haya sido modificado durante los tests
 * Previene generación de archivos "truchos" o manipulación del repo
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

function fail(msg) {
  console.error(`❌ [ANTI-TAMPER] ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`🔍 [ANTI-TAMPER] ${msg}`);
}

function checkGitStatus() {
  log('Verificando estado del working tree...');

  try {
    const output = execSync('git status --porcelain', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim();

    if (output) {
      const lines = output.split('\n');
      const suspiciousFiles = [];

      for (const line of lines) {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        // Archivos sospechosos que no deberían cambiar durante tests
        const suspiciousPatterns = [
          /^package\.json$/,
          /^package-lock\.json$/,
          /^tsconfig\.json$/,
          /^vitest\.config\.ts$/,
          /^\.eslintrc/,
          /^\.github\/workflows\//,
          /^scripts\//,
          /^src\//,
          /^agents\//,
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(file))) {
          suspiciousFiles.push(`${status} ${file}`);
        }
      }

      if (suspiciousFiles.length > 0) {
        fail(`Archivos críticos modificados durante tests:
          ${suspiciousFiles.join('\n          ')}`);
      }

      // Mostrar archivos modificados (permitidos)
      const allowedFiles = lines.filter(line => {
        const file = line.substring(3);
        return !suspiciousPatterns.some(pattern => pattern.test(file));
      });

      if (allowedFiles.length > 0) {
        log(`Archivos modificados (permitidos): ${allowedFiles.length}`);
        allowedFiles.forEach(line => {
          const status = line.substring(0, 2);
          const file = line.substring(3);
          log(`  ${status} ${file}`);
        });
      }
    } else {
      log('✅ Working tree limpio - no hay modificaciones');
    }
  } catch (error) {
    fail(`Error verificando git status: ${error.message}`);
  }
}

function checkUntrackedFiles() {
  log('Verificando archivos no trackeados...');

  try {
    const output = execSync('git ls-files --others --exclude-standard', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim();

    if (output) {
      const files = output.split('\n');
      const suspiciousUntracked = [];

      for (const file of files) {
        // Archivos que no deberían generarse durante tests
        const suspiciousPatterns = [
          /^src\//,
          /^agents\//,
          /^scripts\//,
          /^\.github\/workflows\//,
          /^package\.json$/,
          /^tsconfig\.json$/,
          /^vitest\.config\.ts$/,
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(file))) {
          suspiciousUntracked.push(file);
        }
      }

      if (suspiciousUntracked.length > 0) {
        fail(`Archivos críticos no trackeados generados durante tests:
          ${suspiciousUntracked.join('\n          ')}`);
      }

      log(`Archivos no trackeados (permitidos): ${files.length}`);
    } else {
      log('✅ No hay archivos no trackeados');
    }
  } catch (error) {
    fail(`Error verificando archivos no trackeados: ${error.message}`);
  }
}

function checkStagedChanges() {
  log('Verificando cambios staged...');

  try {
    const output = execSync('git diff --cached --name-only', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim();

    if (output) {
      const files = output.split('\n');
      const suspiciousStaged = [];

      for (const file of files) {
        // Archivos críticos que no deberían estar staged durante tests
        const suspiciousPatterns = [
          /^src\//,
          /^agents\//,
          /^scripts\//,
          /^\.github\/workflows\//,
          /^package\.json$/,
          /^tsconfig\.json$/,
          /^vitest\.config\.ts$/,
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(file))) {
          suspiciousStaged.push(file);
        }
      }

      if (suspiciousStaged.length > 0) {
        fail(`Archivos críticos staged durante tests:
          ${suspiciousStaged.join('\n          ')}`);
      }

      log(`Archivos staged (permitidos): ${files.length}`);
    } else {
      log('✅ No hay cambios staged');
    }
  } catch (error) {
    fail(`Error verificando cambios staged: ${error.message}`);
  }
}

function checkTestArtifacts() {
  log('Verificando artefactos de test...');

  // Verificar que los artefactos de test estén en ubicaciones correctas
  const expectedArtifacts = ['coverage/', 'reports/', 'artifacts/'];

  const suspiciousArtifacts = [];

  // Buscar artefactos en ubicaciones incorrectas
  const forbiddenLocations = ['src/', 'agents/', 'scripts/', '.github/workflows/'];

  for (const location of forbiddenLocations) {
    if (fs.existsSync(location)) {
      const files = fs.readdirSync(location, { recursive: true });

      for (const file of files) {
        const filePath = `${location}/${file}`;

        if (fs.statSync(filePath).isFile()) {
          const suspiciousPatterns = [
            /\.coverage$/,
            /\.report$/,
            /test-artifact/,
            /coverage-data/,
            /metrics-data/,
          ];

          if (suspiciousPatterns.some(pattern => pattern.test(file))) {
            suspiciousArtifacts.push(filePath);
          }
        }
      }
    }
  }

  if (suspiciousArtifacts.length > 0) {
    fail(`Artefactos de test en ubicaciones incorrectas:
      ${suspiciousArtifacts.join('\n      ')}`);
  }

  log('✅ Artefactos de test en ubicaciones correctas');
}

function checkEnvironmentIntegrity() {
  log('Verificando integridad del entorno...');

  // Verificar que no hay variables de entorno sospechosas
  const suspiciousEnvVars = ['TEST_BYPASS', 'SKIP_VALIDATION', 'MOCK_MODE', 'FAKE_DATA'];

  const foundSuspicious = [];

  for (const envVar of suspiciousEnvVars) {
    if (process.env[envVar]) {
      foundSuspicious.push(`${envVar}=${process.env[envVar]}`);
    }
  }

  if (foundSuspicious.length > 0) {
    fail(`Variables de entorno sospechosas detectadas:
      ${foundSuspicious.join('\n      ')}`);
  }

  // Verificar que estamos en el directorio correcto
  const expectedFiles = ['package.json', 'tsconfig.json', 'vitest.config.ts'];

  for (const file of expectedFiles) {
    if (!fs.existsSync(file)) {
      fail(`Archivo esperado no encontrado: ${file}`);
    }
  }

  log('✅ Integridad del entorno verificada');
}

async function main() {
  try {
    log('🚀 Iniciando verificación anti-tamper...');

    checkEnvironmentIntegrity();
    checkGitStatus();
    checkUntrackedFiles();
    checkStagedChanges();
    checkTestArtifacts();

    log('🎉 Verificación anti-tamper completada exitosamente');
    log('✅ Working tree limpio y sin manipulación detectada');
  } catch (error) {
    fail(`Error durante verificación: ${error.message}`);
  }
}

main();
