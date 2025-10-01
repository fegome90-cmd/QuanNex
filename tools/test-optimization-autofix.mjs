#!/usr/bin/env node
/**
 * @fileoverview Test Optimization-Autofix Integration
 * @description Script de prueba para la integración @optimization + run-autofix
 */

import OptimizationAutofixIntegration from './optimization-autofix-integration.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

async function testIntegration() {
  console.log(
    '🧪 Iniciando prueba de integración @optimization + run-autofix...\n'
  );

  try {
    // Crear instancia de integración
    const integration = new OptimizationAutofixIntegration();

    // Ejecutar integración en modo dry-run
    console.log('📋 Ejecutando en modo dry-run...');
    await integration.run();

    console.log('\n✅ Prueba de integración completada exitosamente');
  } catch (error) {
    console.error('\n❌ Error en la prueba de integración:', error.message);
    process.exit(1);
  }
}

// Ejecutar prueba si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  testIntegration();
}
