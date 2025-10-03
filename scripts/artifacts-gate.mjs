#!/usr/bin/env node

/**
 * Artifacts Gate - Ensures AutoFix artifacts are created correctly
 * Fails if artifacts are missing or invalid after AutoFix operations
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'node:child_process';

async function fail(msg) {
  console.error(`\n❌ [ARTIFACTS-FAIL] ${msg}\n`);
  process.exit(1);
}

async function log(msg) {
  console.log(`[ARTIFACTS-GATE] ${msg}`);
}

async function checkArtifactsDirectory() {
  log('🔍 Verificando directorio de artifacts...');

  const artifactsDir = path.join(process.cwd(), 'artifacts', 'autofix');

  if (!fs.existsSync(artifactsDir)) {
    await fail('Directorio artifacts/autofix no existe');
  }

  log('✅ Directorio de artifacts existe.');
}

async function checkArtifactFiles() {
  log('🔍 Verificando archivos de artifacts...');

  const artifactsDir = path.join(process.cwd(), 'artifacts', 'autofix');
  const files = fs.readdirSync(artifactsDir);

  if (files.length === 0) {
    log('⚠️  No hay artifacts de AutoFix (esto es normal si no se han ejecutado autofixes)');
    return;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) {
      await fail(`Archivo de artifact inválido: ${file} (debe terminar en .json)`);
    }

    const filepath = path.join(artifactsDir, file);
    const content = fs.readFileSync(filepath, 'utf8');

    try {
      const artifact = JSON.parse(content);

      // Verificar campos requeridos
      const requiredFields = [
        'timestamp',
        'branch',
        'baseCommit',
        'finalCommit',
        'actions',
        'riskTotal',
        'durationMs',
        'result',
        'costAvoided',
        'metadata',
      ];

      for (const field of requiredFields) {
        if (!artifact.hasOwnProperty(field)) {
          await fail(`Artifact ${file} falta campo requerido: ${field}`);
        }
      }

      // Verificar que no hay archivos .tmp (atomic write falló)
      if (fs.existsSync(filepath + '.tmp')) {
        await fail(`Archivo temporal encontrado: ${file}.tmp (atomic write falló)`);
      }
    } catch (error) {
      await fail(`Artifact ${file} no es JSON válido: ${error.message}`);
    }
  }

  log(`✅ ${files.length} artifacts válidos encontrados.`);
}

async function checkArtifactNaming() {
  log('🔍 Verificando nomenclatura de artifacts...');

  const artifactsDir = path.join(process.cwd(), 'artifacts', 'autofix');
  const files = fs.readdirSync(artifactsDir);

  for (const file of files) {
    // Patrón esperado: YYYY-MM-DDTHH-MM-SS-sssZ-branch-name.json
    const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-.+\.json$/;

    if (!pattern.test(file)) {
      await fail(`Nombre de artifact inválido: ${file} (debe seguir patrón timestamp-branch.json)`);
    }
  }

  log('✅ Nomenclatura de artifacts correcta.');
}

async function checkArtifactIntegrity() {
  log('🔍 Verificando integridad de artifacts...');

  const artifactsDir = path.join(process.cwd(), 'artifacts', 'autofix');
  const files = fs.readdirSync(artifactsDir);

  for (const file of files) {
    const filepath = path.join(artifactsDir, file);
    const stats = fs.statSync(filepath);

    // Verificar que el archivo no esté vacío
    if (stats.size === 0) {
      await fail(`Artifact vacío: ${file}`);
    }

    // Verificar que el archivo no sea demasiado grande (límite de 1MB)
    if (stats.size > 1024 * 1024) {
      await fail(`Artifact demasiado grande: ${file} (${stats.size} bytes)`);
    }

    // Verificar que el archivo sea reciente (menos de 24 horas)
    const age = Date.now() - stats.mtime.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    if (age > maxAge) {
      log(`⚠️  Artifact antiguo: ${file} (${Math.round(age / (60 * 60 * 1000))} horas)`);
    }
  }

  log('✅ Integridad de artifacts verificada.');
}

async function main() {
  log('🚀 Iniciando Artifacts Gate...');
  await checkArtifactsDirectory();
  await checkArtifactFiles();
  await checkArtifactNaming();
  await checkArtifactIntegrity();
  log('✅ Artifacts Gate completado exitosamente.');
}

main().catch(error => {
  console.error(`\nFatal error during Artifacts Gate: ${error.message}\n`);
  process.exit(1);
});
