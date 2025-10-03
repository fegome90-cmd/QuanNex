#!/usr/bin/env node

/**
 * QuanNex Policy Checker - AST-based version
 * Replaces regex-based detection with proper AST parsing for better accuracy
 */

import fs from 'fs';
import path from 'path';
import { scanFiles, generateSARIFReport } from './policy-ast-parser.mjs';

const SCAN_PATTERNS = ['src/**/*.{js,ts,mjs}', 'agents/**/*.{js,ts,mjs}', 'scripts/**/*.{js,mjs}'];

async function fail(msg) {
  console.error(`\n❌ [POLICY-FAIL] ${msg}\n`);
  process.exit(1);
}

async function log(msg) {
  console.log(`[POLICY-AST] ${msg}`);
}

async function checkCriticalFiles() {
  log('🔍 Verificando archivos críticos...');
  const criticalFiles = [
    'config/scan-globs.json',
    'package.json',
    'package-lock.json',
    'config/policies.json',
  ];

  for (const file of criticalFiles) {
    if (!fs.existsSync(file)) {
      await fail(`Archivo crítico faltante: ${file}`);
    }
  }
  log('✅ Archivos críticos presentes.');
}

async function checkScanConfigIntegrity() {
  log('🔍 Verificando configuración de escaneo...');
  try {
    const scanGlobs = JSON.parse(fs.readFileSync('config/scan-globs.json', 'utf8'));
    if (!Array.isArray(scanGlobs.include) || !Array.isArray(scanGlobs.exclude)) {
      await fail('config/scan-globs.json tiene formato inválido.');
    }
    log(`✅ Policy Check: configuración válida.`);
  } catch (error) {
    await fail(`Error al leer config/scan-globs.json: ${error.message}`);
  }
}

async function checkForbiddenAPIs() {
  log('🔍 Escaneando APIs prohibidas con AST...');

  const violations = await scanFiles(SCAN_PATTERNS);

  if (violations.length > 0) {
    // Generar reporte SARIF
    const sarifReport = generateSARIFReport(violations);
    const artifactsDir = path.join(process.cwd(), 'artifacts', 'policy');
    fs.mkdirSync(artifactsDir, { recursive: true });

    const sarifFile = path.join(artifactsDir, `policy-violations-${Date.now()}.sarif`);
    fs.writeFileSync(sarifFile, JSON.stringify(sarifReport, null, 2));

    const list = violations
      .map(v => ` - ${v.file}:${v.line}:${v.column} ${v.api} - "${v.content}"`)
      .join('\n');

    await fail(`Se detectaron APIs prohibidas:\n${list}\n\nReporte SARIF: ${sarifFile}`);
  } else {
    log('✅ Verificación de APIs prohibidas OK.');
  }
}

async function checkSecretsInCode() {
  log('🔍 Escaneando secretos en código...');

  const secretPatterns = [
    /password\s*=\s*['"][^'"]+['"]/gi,
    /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
    /secret\s*=\s*['"][^'"]+['"]/gi,
    /token\s*=\s*['"][^'"]+['"]/gi,
    /private[_-]?key\s*=\s*['"][^'"]+['"]/gi,
    /access[_-]?token\s*=\s*['"][^'"]+['"]/gi,
    /bearer\s*=\s*['"][^'"]+['"]/gi,
  ];

  const violations = [];
  const files = await scanFiles(SCAN_PATTERNS);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      for (const pattern of secretPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          violations.push({
            file,
            content: matches[0],
          });
        }
      }
    } catch (error) {
      log(`Warning: No se pudo leer ${file}: ${error.message}`);
    }
  }

  if (violations.length > 0) {
    const list = violations.map(v => ` - ${v.file} - "${v.content}"`).join('\n');
    await fail(`Se detectaron secretos en claro:\n${list}`);
  } else {
    log('✅ Verificación de secretos OK.');
  }
}

async function main() {
  log('🚀 Iniciando Policy Check AST...');
  await checkCriticalFiles();
  await checkScanConfigIntegrity();
  await checkForbiddenAPIs();
  await checkSecretsInCode();
  log('✅ Policy Check AST completado exitosamente.');
}

main().catch(error => {
  console.error(`\nFatal error during Policy Check AST: ${error.message}\n`);
  process.exit(1);
});
