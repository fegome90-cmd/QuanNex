#!/usr/bin/env node
/**
 * No-Mock Gate Anti-Manipulación
 * Prohíbe variables de mock y módulos de simulación en CI
 * Garantiza que los tests midan comportamiento real
 */

import fs from 'fs';
import { globby } from 'globby';

// Módulos de mocking prohibidos en CI
const FORBIDDEN_MOCK_PACKAGES = [
  /^nock$/,
  /^msw$/,
  /^fetch-mock$/,
  /^sinon$/,
  /^jest-mock$/,
  /^@testing-library\/jest-dom$/,
  /^mock-fs$/,
  /^proxyquire$/,
];

// Variables de entorno prohibidas en CI
const FORBIDDEN_ENV_VARS = [/^MOCK_/, /^FAKE_/, /^SIMULATE_/, /^TEST_MODE$/, /^SKIP_VALIDATION$/];

// Patrones de código sospechoso
const SUSPICIOUS_PATTERNS = [
  /mock\s*=\s*true/i,
  /fake\s*=\s*true/i,
  /simulate\s*=\s*true/i,
  /bypass.*validation/i,
  /skip.*gate/i,
];

// Archivos que pueden contener estos patrones legítimamente
const ALLOWED_FILES = [
  'scripts/no-mock-gate.mjs',
  'scripts/anti-tamper.mjs',
  'scripts/coverage-gate.mjs',
];

function fail(msg) {
  console.error(`❌ [NO-MOCK-GATE] ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`🔍 [NO-MOCK-GATE] ${msg}`);
}

function checkEnvironmentVariables() {
  log('Verificando variables de entorno...');

  const suspiciousVars = [];

  Object.keys(process.env).forEach(key => {
    FORBIDDEN_ENV_VARS.forEach(pattern => {
      if (pattern.test(key)) {
        suspiciousVars.push(`${key}=${process.env[key]}`);
      }
    });
  });

  if (suspiciousVars.length > 0) {
    fail(`Variables de mock/simulación detectadas en CI:
      ${suspiciousVars.join('\n      ')}`);
  }

  log('✅ Variables de entorno limpias');
}

async function checkPackageImports() {
  log('Verificando imports de módulos de mocking...');

  const files = await globby(
    ['src/**/*.{ts,js,mjs,tsx}', 'agents/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}'],
    {
      gitignore: true,
      ignore: ['**/*.test.*', '**/*.spec.*'],
    }
  );

  const violations = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Buscar imports sospechosos
      const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
      const requireMatches = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];

      const allImports = [...importMatches, ...requireMatches];

      for (const importStr of allImports) {
        const moduleName = importStr.replace(/.*['"]|['"].*/g, '');

        FORBIDDEN_MOCK_PACKAGES.forEach(pattern => {
          if (pattern.test(moduleName)) {
            violations.push(`${file}: ${moduleName}`);
          }
        });
      }

      // Buscar patrones sospechosos en el código (excepto en archivos permitidos)
      if (!ALLOWED_FILES.some(allowed => file.includes(allowed))) {
        SUSPICIOUS_PATTERNS.forEach(pattern => {
          if (pattern.test(content)) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (pattern.test(line)) {
                violations.push(`${file}:${index + 1} - "${line.trim()}"`);
              }
            });
          }
        });
      }
    } catch (error) {
      log(`⚠️ No se pudo leer ${file}: ${error.message}`);
    }
  }

  if (violations.length > 0) {
    fail(`Módulos de mocking o código sospechoso detectado:
      ${violations.join('\n      ')}`);
  }

  log(`✅ ${files.length} archivos verificados sin módulos de mocking`);
}

function checkTestConfiguration() {
  log('Verificando configuración de tests...');

  // Verificar que no hay configuración de mocking en vitest.config.ts
  if (fs.existsSync('vitest.config.ts')) {
    const config = fs.readFileSync('vitest.config.ts', 'utf8');

    if (/mock|fake|simulate/i.test(config)) {
      fail('Configuración de mocking detectada en vitest.config.ts');
    }
  }

  // Verificar package.json por dependencias de mocking
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const mockDeps = Object.keys(allDeps).filter(dep =>
      FORBIDDEN_MOCK_PACKAGES.some(pattern => pattern.test(dep))
    );

    if (mockDeps.length > 0) {
      log(`⚠️ Dependencias de mocking encontradas: ${mockDeps.join(', ')}`);
      log('   Estas dependencias están permitidas en devDependencies pero no deben usarse en CI');
    }
  }

  log('✅ Configuración de tests verificada');
}

function checkCIEnvironment() {
  log('Verificando entorno de CI...');

  if (process.env.CI) {
    log('✅ Ejecutándose en entorno CI - validaciones estrictas activadas');

    // En CI, verificar que no hay archivos de mock
    const mockFiles = ['mocks/', '__mocks__/', 'test-utils/mocks.js', 'test-utils/mocks.ts'];

    const existingMockFiles = mockFiles.filter(file => fs.existsSync(file));

    if (existingMockFiles.length > 0) {
      log(`⚠️ Archivos de mock encontrados: ${existingMockFiles.join(', ')}`);
      log('   Estos archivos están permitidos pero no deben usarse en CI');
    }
  } else {
    log('⚠️ Ejecutándose en entorno local - algunas validaciones relajadas');
  }
}

async function main() {
  try {
    log('🚀 Iniciando validación anti-mock...');

    checkCIEnvironment();
    checkEnvironmentVariables();
    await checkPackageImports();
    checkTestConfiguration();

    log('🎉 Validación anti-mock completada exitosamente');
    log('✅ No se detectaron intentos de simulación o mocking');
  } catch (error) {
    fail(`Error durante validación: ${error.message}`);
  }
}

main();
