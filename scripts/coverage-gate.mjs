#!/usr/bin/env node
/**
 * Coverage Gate Anti-Manipulación
 * Valida cobertura real por directorio crítico + branches
 * No permite cobertura "inflada" o simulada
 */

import fs from 'fs';
import path from 'path';

const GLOBAL_MIN = {
  lines: 85,
  branches: 75,
  functions: 80,
  statements: 85,
};

const DIR_MIN = [
  { dir: 'src/agents', lines: 85, branches: 75 },
  { dir: 'src/tools', lines: 85, branches: 75 },
  { dir: 'agents', lines: 85, branches: 75 },
];

function fail(msg) {
  console.error(`❌ [COVERAGE-GATE] ${msg}`);
  process.exit(1);
}

function ok(stat, min) {
  return stat.pct >= min;
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function main() {
  try {
    console.log('🔍 [COVERAGE-GATE] Validando cobertura anti-manipulación...');

    // Verificar que existen los archivos de cobertura
    if (!fs.existsSync('coverage/coverage-summary.json')) {
      fail('No existe coverage-summary.json. Ejecuta "npm run test:cov" primero.');
    }

    if (!fs.existsSync('coverage/coverage-final.json')) {
      fail('No existe coverage-final.json. Ejecuta "npm run test:cov" primero.');
    }

    // Cargar datos de cobertura
    const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8')).total;
    const final = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));

    console.log(
      `📊 Cobertura global: L:${summary.lines.pct}% B:${summary.branches.pct}% F:${summary.functions.pct}% S:${summary.statements.pct}%`
    );

    // Validar umbrales globales
    if (
      !ok(summary.lines, GLOBAL_MIN.lines) ||
      !ok(summary.branches, GLOBAL_MIN.branches) ||
      !ok(summary.functions, GLOBAL_MIN.functions) ||
      !ok(summary.statements, GLOBAL_MIN.statements)
    ) {
      fail(`Cobertura global insuficiente:
        Líneas: ${summary.lines.pct}% < ${GLOBAL_MIN.lines}%
        Branches: ${summary.branches.pct}% < ${GLOBAL_MIN.branches}%
        Funciones: ${summary.functions.pct}% < ${GLOBAL_MIN.functions}%
        Statements: ${summary.statements.pct}% < ${GLOBAL_MIN.statements}%`);
    }

    // Validar cobertura por directorio crítico
    const byFile = Object.entries(final);
    const results = [];

    for (const { dir, lines, branches } of DIR_MIN) {
      const files = byFile.filter(([path]) => path.startsWith(dir));

      if (!files.length) {
        console.log(`⚠️ Sin archivos en ${dir} para medir cobertura`);
        continue;
      }

      const lineCovs = files.map(([_, v]) => v.lines.pct);
      const branchCovs = files.map(([_, v]) => v.branches.pct);

      const avgLines = avg(lineCovs);
      const avgBranches = avg(branchCovs);

      if (avgLines < lines || avgBranches < branches) {
        fail(`${dir} bajo umbral requerido:
          Líneas: ${avgLines.toFixed(1)}% < ${lines}%
          Branches: ${avgBranches.toFixed(1)}% < ${branches}%
          Archivos: ${files.length}`);
      }

      results.push(`${dir} OK (L:${avgLines.toFixed(1)}% B:${avgBranches.toFixed(1)}%)`);
    }

    // Validar que no hay archivos con cobertura 0% en directorios críticos
    const criticalFiles = byFile.filter(([path]) =>
      DIR_MIN.some(({ dir }) => path.startsWith(dir))
    );

    const zeroCoverage = criticalFiles.filter(
      ([path, data]) => data.lines.pct === 0 || data.branches.pct === 0
    );

    if (zeroCoverage.length > 0) {
      fail(`Archivos con cobertura 0% en directorios críticos:
        ${zeroCoverage.map(([path]) => path).join('\n        ')}`);
    }

    console.log(`✅ [COVERAGE-GATE] Validación exitosa:`);
    console.log(`   Global: L:${summary.lines.pct}% B:${summary.branches.pct}%`);
    console.log(`   ${results.join(' | ')}`);
    console.log(`   Archivos críticos: ${criticalFiles.length} (ninguno con 0% cobertura)`);
  } catch (error) {
    fail(`Error durante validación: ${error.message}`);
  }
}

main();
