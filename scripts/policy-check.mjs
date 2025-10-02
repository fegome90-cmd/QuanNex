#!/usr/bin/env node
/**
 * Policy Check Script
 * Valida configuración de escaneo y elimina "0 archivos escaneados"
 */

import { readFileSync, existsSync } from 'node:fs';
import { globby } from 'globby';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Función para fallar con mensaje
function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// Función para éxito con mensaje
function success(message) {
  console.log(`✅ ${message}`);
}

async function main() {
  console.log('🔍 Policy Check - Validating scan configuration...\n');

  // 1. Verificar que existe el archivo de configuración
  const configPath = join(PROJECT_ROOT, 'config', 'scan-globs.json');
  if (!existsSync(configPath)) {
    fail('scan-globs.json not found in config/ directory');
  }

  // 2. Leer configuración
  let globs;
  try {
    const configContent = readFileSync(configPath, 'utf8');
    globs = JSON.parse(configContent);
  } catch (error) {
    fail(`Error reading scan-globs.json: ${error.message}`);
  }

  // 3. Validar estructura de configuración
  const requiredSections = ['code', 'configs', 'security', 'exclude'];
  for (const section of requiredSections) {
    if (!globs[section] || !Array.isArray(globs[section])) {
      fail(`Missing or invalid '${section}' section in scan-globs.json`);
    }
  }

  success('Configuration file structure is valid');

  // 4. Encontrar archivos según los globs
  const allGlobs = [...globs.code, ...globs.configs, ...globs.security];
  const excludeGlobs = globs.exclude;

  console.log(`📁 Scanning patterns: ${allGlobs.length} include, ${excludeGlobs.length} exclude`);

  let files;
  try {
    files = await globby(allGlobs, {
      gitignore: true,
      ignore: excludeGlobs,
      cwd: PROJECT_ROOT,
    });
  } catch (error) {
    fail(`Error scanning files: ${error.message}`);
  }

  // 5. Validar que se encontraron archivos
  if (files.length === 0) {
    fail('Configurado, pero 0 archivos encontrados. Revisa rutas/monorepo.');
  }

  success(`Found ${files.length} files to scan`);

  // 6. Categorizar archivos encontrados
  const categorized = {
    code: files.filter(f => /\.(ts|js|mjs|tsx)$/.test(f)),
    configs: files.filter(f => /\.(json|yml|yaml)$/.test(f) || /\.config\.(js|ts)$/.test(f)),
    security: files.filter(
      f => /\.(env|key|pem|p12)$/.test(f) || f.includes('secrets') || f.includes('keys')
    ),
  };

  console.log('\n📊 File categorization:');
  console.log(`  Code files: ${categorized.code.length}`);
  console.log(`  Config files: ${categorized.configs.length}`);
  console.log(`  Security files: ${categorized.security.length}`);

  // 7. Validar que hay archivos en cada categoría crítica
  if (categorized.code.length === 0) {
    fail('No code files found - check code globs');
  }

  if (categorized.configs.length === 0) {
    fail('No config files found - check config globs');
  }

  success('All critical file categories have files');

  // 8. Mostrar algunos ejemplos
  console.log('\n📋 Sample files found:');
  console.log('  Code files:');
  categorized.code.slice(0, 3).forEach(f => console.log(`    - ${f}`));
  if (categorized.code.length > 3) {
    console.log(`    ... and ${categorized.code.length - 3} more`);
  }

  console.log('  Config files:');
  categorized.configs.slice(0, 3).forEach(f => console.log(`    - ${f}`));
  if (categorized.configs.length > 3) {
    console.log(`    ... and ${categorized.configs.length - 3} more`);
  }

  // 9. Generar reporte de configuración
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    categorized,
    globs: {
      include: allGlobs,
      exclude: excludeGlobs,
    },
    status: 'PASSED',
  };

  console.log('\n🎯 Policy Check Summary:');
  console.log(`  Status: ${report.status}`);
  console.log(`  Total files: ${report.totalFiles}`);
  console.log(`  Code files: ${report.categorized.code.length}`);
  console.log(`  Config files: ${report.categorized.configs.length}`);
  console.log(`  Security files: ${report.categorized.security.length}`);

  success('Policy check completed successfully');
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Policy check failed:', error.message);
    process.exit(1);
  });
}

export default main;
