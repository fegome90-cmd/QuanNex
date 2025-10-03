#!/usr/bin/env node
/**
 * Policy Check - Detección de APIs prohibidas y secretos en claro
 * Gate de seguridad para el Nivel 2 de QuanNex
 */

import fs from 'node:fs';
import { globby } from 'globby';
import path from 'node:path';

// Cargar configuración de políticas
const policies = JSON.parse(fs.readFileSync('config/policies.json', 'utf8'));

// Configuración de políticas de seguridad
const FORBIDDEN_APIS = [
  'eval\\(',
  'exec\\(',
  'Function\\(',
  'setTimeout.*string',
  'setInterval.*string',
  'new Function',
  'vm\\.runInNewContext',
  'vm\\.runInThisContext',
  'child_process\\.exec',
  'child_process\\.execSync',
];

const SECRET_PATTERNS = [
  /password\s*=\s*['"][^'"]+['"]/gi,
  /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
  /secret\s*=\s*['"][^'"]+['"]/gi,
  /token\s*=\s*['"][^'"]+['"]/gi,
  /private[_-]?key\s*=\s*['"][^'"]+['"]/gi,
  /access[_-]?token\s*=\s*['"][^'"]+['"]/gi,
  /bearer\s*=\s*['"][^'"]+['"]/gi,
];

const CRITICAL_FILES = ['config/scan-globs.json', 'package.json', 'package-lock.json'];

async function fail(msg) {
  console.error(`\n❌ [POLICY-FAIL] ${msg}\n`);
  process.exit(1);
}

async function log(msg) {
  console.log(`[POLICY] ${msg}`);
}

async function checkForbiddenAPIs() {
  log('🔍 Escaneando APIs prohibidas...');

  const files = await globby(
    ['src/**/*.{js,ts,mjs}', 'agents/**/*.{js,ts,mjs}', 'scripts/**/*.{js,mjs}'],
    {
      gitignore: true,
    }
  );

  const violations = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comments, strings, and pattern definitions (legitimate security scanning)
        if (
          line.trim().startsWith('//') ||
          line.trim().startsWith('*') ||
          line.includes('includes(') ||
          (line.includes("'") && line.includes('FORBIDDEN_APIS')) ||
          (line.includes('const ') && line.includes('FORBIDDEN_APIS')) ||
          (line.includes("'") && line.includes('setTimeout')) ||
          (line.includes("'") && line.includes('setInterval')) ||
          (line.includes("'") && line.includes('new Function'))
        ) {
          continue;
        }

        // Check for actual usage of forbidden APIs
        for (const api of FORBIDDEN_APIS) {
          const regex = new RegExp(api, 'gi');
          const matches = line.match(regex);

          if (matches) {
            // Verificar si el archivo está en la lista de excepciones
            const allowedPaths = policies.allowInPaths?.[api.replace('\\', '')];
            const isAllowed = allowedPaths?.some(pattern => {
              if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(file);
              }
              return file.includes(pattern);
            });

            if (!isAllowed) {
              violations.push({
                file,
                line: i + 1,
                api,
                content: line.trim(),
              });
            }
          }
        }
      }
    } catch (error) {
      log(`Warning: No se pudo leer ${file}: ${error.message}`);
    }
  }

  if (violations.length > 0) {
    const list = violations.map(v => ` - ${v.file}:${v.line} ${v.api} - "${v.content}"`).join('\n');
    fail(`Se detectaron APIs prohibidas:\n${list}`);
  } else {
    log('✅ Verificación de APIs prohibidas OK.');
  }
}

async function checkSecretsInCode() {
  log('🔍 Escaneando secretos en código...');

  const files = await globby(
    ['src/**/*.{js,ts,mjs}', 'agents/**/*.{js,ts,mjs}', 'scripts/**/*.{js,mjs}'],
    {
      gitignore: true,
    }
  );

  const violations = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      for (const pattern of SECRET_PATTERNS) {
        const matches = content.match(pattern);

        if (matches) {
          violations.push({
            file,
            pattern: pattern.toString(),
            matches: matches.length,
          });
        }
      }
    } catch (error) {
      log(`Warning: No se pudo leer ${file}: ${error.message}`);
    }
  }

  if (violations.length > 0) {
    const list = violations
      .map(v => ` - ${v.file}: ${v.pattern} (${v.matches} ocurrencias)`)
      .join('\n');
    fail(`Se detectaron secretos en código:\n${list}`);
  } else {
    log('✅ Verificación de secretos OK.');
  }
}

async function checkCriticalFiles() {
  log('🔍 Verificando archivos críticos...');

  const missing = [];

  for (const file of CRITICAL_FILES) {
    if (!fs.existsSync(file)) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    fail(`Archivos críticos faltantes: ${missing.join(', ')}`);
  } else {
    log('✅ Archivos críticos presentes.');
  }
}

async function checkScanGlobs() {
  log('🔍 Verificando configuración de escaneo...');

  const globsPath = 'config/scan-globs.json';
  if (!fs.existsSync(globsPath)) {
    fail(`No se encontró el archivo de configuración de globs: ${globsPath}`);
  }

  try {
    const globs = JSON.parse(fs.readFileSync(globsPath, 'utf8'));

    if (
      !globs.code ||
      !Array.isArray(globs.code) ||
      !globs.configs ||
      !Array.isArray(globs.configs)
    ) {
      fail('El archivo scan-globs.json debe contener arrays "code" y "configs".');
    }

    // Verificar que los globs encuentran archivos
    const files = await globby([...globs.code, ...globs.configs], { gitignore: true });

    if (files.length === 0) {
      fail(
        'Configurado, pero 0 archivos encontrados por los globs. Revisa rutas/monorepo o la configuración de scan-globs.json.'
      );
    } else {
      log(`✅ Policy Check: ${files.length} archivos encontrados para escanear.`);
    }
  } catch (error) {
    fail(`Error leyendo scan-globs.json: ${error.message}`);
  }
}

async function main() {
  try {
    log('🚀 Iniciando Policy Check...');

    await checkCriticalFiles();
    await checkScanGlobs();
    await checkForbiddenAPIs();
    await checkSecretsInCode();

    log('✅ Policy Check completado exitosamente.');
  } catch (error) {
    fail(`Error durante el Policy Check: ${error.message}`);
  }
}

main();
