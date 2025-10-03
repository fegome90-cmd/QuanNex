#!/usr/bin/env node

/**
 * Script de contexto compacto para el workflow adaptativo
 * Genera un resumen compacto del contexto del proyecto
 */

import fs from 'fs';
import path from 'path';

function getProjectContext() {
  const cwd = process.cwd();

  // Información básica del proyecto
  const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));

  // Archivos clave
  const keyFiles = [
    'README.md',
    'package.json',
    'tsconfig.json',
    'vitest.config.ts',
    '.eslintrc.cjs',
  ].filter(file => fs.existsSync(path.join(cwd, file)));

  // Estructura de directorios principales
  const mainDirs = ['src', 'tests', 'scripts', 'config', 'docs'].filter(dir =>
    fs.existsSync(path.join(cwd, dir))
  );

  return {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type || 'commonjs',
    keyFiles,
    mainDirs,
    timestamp: new Date().toISOString(),
  };
}

function main() {
  try {
    const context = getProjectContext();
    console.log('📋 Contexto compacto generado:');
    console.log(`   Proyecto: ${context.name} v${context.version}`);
    console.log(`   Tipo: ${context.type}`);
    console.log(`   Archivos clave: ${context.keyFiles.length}`);
    console.log(`   Directorios principales: ${context.mainDirs.length}`);
    console.log(`   Timestamp: ${context.timestamp}`);
  } catch (error) {
    console.error('❌ Error generando contexto compacto:', error.message);
    process.exit(1);
  }
}

main();
