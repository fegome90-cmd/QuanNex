#!/usr/bin/env node
/**
 * ORCHESTRATOR GATEWAY - Blindaje del Orquestador Correcto
 *
 * Este gateway asegura que SIEMPRE se use el orquestador correcto
 * y previene el uso de versiones problemáticas.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// RUTA ABSOLUTA al orquestador correcto
const CORRECT_ORCHESTRATOR = resolve(__dirname, 'orchestrator.js');

// Verificar que el orquestador correcto existe
import { existsSync } from 'node:fs';
if (!existsSync(CORRECT_ORCHESTRATOR)) {
  console.error('❌ ERROR: Orquestador correcto no encontrado');
  console.error(`   Esperado: ${CORRECT_ORCHESTRATOR}`);
  process.exit(1);
}

// Verificar que es ejecutable
import { accessSync, constants } from 'node:fs';
try {
  accessSync(CORRECT_ORCHESTRATOR, constants.X_OK);
} catch (error) {
  console.error('❌ ERROR: Orquestador no es ejecutable');
  console.error(`   Archivo: ${CORRECT_ORCHESTRATOR}`);
  process.exit(1);
}

// Log de seguridad
console.error(`🔒 ORCHESTRATOR GATEWAY: Usando orquestador correcto`);
console.error(`   Archivo: ${CORRECT_ORCHESTRATOR}`);

// Ejecutar el orquestador correcto con todos los argumentos
const args = process.argv.slice(2);
const child = spawn('node', [CORRECT_ORCHESTRATOR, ...args], {
  stdio: 'inherit',
  cwd: resolve(__dirname, '..'),
});

// Manejar señales
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

// Esperar a que termine
child.on('close', code => {
  process.exit(code);
});

child.on('error', error => {
  console.error('❌ ERROR: Fallo al ejecutar orquestador:', error.message);
  process.exit(1);
});
