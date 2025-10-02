#!/usr/bin/env node
/**
 * @fileoverview Test Retry Rollback System
 * @description Script de prueba para el sistema de retry y rollback
 */

import RetryRollbackSystem from './retry-rollback-system.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

async function testRetryRollback() {
  console.log('🧪 Iniciando prueba del Retry Rollback System...\n');

  try {
    // Crear instancia del sistema
    const system = new RetryRollbackSystem();

    // Configurar para pruebas
    system.maxRetries = 3;
    system.retryDelay = 500; // Más rápido para pruebas
    system.verbose = true;

    await system.run();

    console.log(
      '\n✅ Prueba del Retry Rollback System completada exitosamente'
    );
  } catch (error) {
    console.error(
      '\n❌ Error en la prueba del Retry Rollback System:',
      error.message
    );
    process.exit(1);
  }
}

// Ejecutar prueba si se llama directamente
if (import.meta.url === `file://${__filename}`) {
  testRetryRollback();
}
