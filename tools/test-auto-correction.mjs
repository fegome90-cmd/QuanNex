#!/usr/bin/env node
/**
 * @fileoverview Test Auto Correction Engine
 * @description Script de prueba para el motor de corrección automática
 */

import AutoCorrectionEngine from './auto-correction-engine.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

async function testAutoCorrection() {
  console.log('🧪 Iniciando prueba del Auto Correction Engine...\n');

  try {
    // Crear instancia del motor
    const engine = new AutoCorrectionEngine();

    // Ejecutar en modo dry-run para pruebas
    console.log('📋 Ejecutando en modo dry-run...');
    engine.dryRun = true;
    engine.verbose = true;

    await engine.run();

    console.log(
      '\n✅ Prueba del Auto Correction Engine completada exitosamente'
    );
  } catch (error) {
    console.error(
      '\n❌ Error en la prueba del Auto Correction Engine:',
      error.message
    );
    process.exit(1);
  }
}

// Ejecutar prueba si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  testAutoCorrection();
}
