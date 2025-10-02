#!/usr/bin/env node
/**
 * Generador de Baseline para Test Integrity
 * Analiza la suite actual y genera un baseline para Gate 13
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const list = (d, rx) => {
  const out = [];
  const w = p => {
    if (!fs.existsSync(p)) return;
    try {
      fs.readdirSync(p).forEach(f => {
        const a = path.join(p, f);
        try {
          const s = fs.statSync(a);
          s.isDirectory() ? w(a) : rx.test(a) && out.push(a);
        } catch (e) {
          // Ignorar archivos especiales que no se pueden leer
          if (e.code !== 'ENOENT' && e.code !== 'EACCES') {
            console.warn(`⚠️ No se pudo acceder a ${a}: ${e.message}`);
          }
        }
      });
    } catch (e) {
      console.warn(`⚠️ No se pudo leer directorio ${p}: ${e.message}`);
    }
  };
  w(d);
  return out;
};

console.log('🔍 Analizando suite de tests actual...');

// Buscar archivos de test
const testFiles = list('tests', /\.(test|spec)\.(mjs|js|ts)$/);
const allTestFiles = list('.', /\.(test|spec)\.(mjs|js|ts)$/);

console.log(`📊 Archivos de test encontrados: ${testFiles.length} en tests/, ${allTestFiles.length} total`);

// Calcular LOC
const loc = testFiles.reduce((a, f) => a + fs.readFileSync(f, 'utf8').split('\n').length, 0);

// Buscar snapshots
const snapFiles = list('tests', /\.snap$/);
const h = crypto.createHash('sha256');
snapFiles.sort().forEach(f => h.update(fs.readFileSync(f)));
const hash = 'sha256:' + h.digest('hex');

// Calcular cobertura actual (si existe)
let coverage = { lines: 78, branches: 70, functions: 75 };
try {
  if (fs.existsSync('coverage/coverage-summary.json')) {
    const cov = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
    coverage = {
      lines: Math.round(cov.total.lines.pct),
      branches: Math.round(cov.total.branches.pct),
      functions: Math.round(cov.total.functions.pct)
    };
    console.log(`📈 Cobertura actual: L=${coverage.lines}% B=${coverage.branches}% F=${coverage.functions}%`);
  }
} catch (e) {
  console.log('⚠️ No se encontró cobertura actual, usando valores por defecto');
}

// Generar baseline
const BASE = {
  test_glob: "tests/**/*.{mjs,js,ts}",
  min_count: testFiles.length,
  min_loc: loc,
  coverage: coverage,
  snapshots_hash: snapFiles.length ? hash : 'sha256:0',
  include_patterns: ["tests/"],
  exclude_patterns: ["tests/helpers/", "tests/fixtures/", "tests/mocks/"]
};

// Crear directorio si no existe
fs.mkdirSync('.quannex/tests', { recursive: true });

// Escribir baseline
fs.writeFileSync('.quannex/tests/baseline.json', JSON.stringify(BASE, null, 2));

console.log('✅ Baseline generado:');
console.log(`   Tests: ${BASE.min_count}`);
console.log(`   LOC: ${BASE.min_loc}`);
console.log(`   Cobertura: L=${BASE.coverage.lines}% B=${BASE.coverage.branches}% F=${BASE.coverage.functions}%`);
console.log(`   Snapshots: ${snapFiles.length} archivos`);
console.log(`   Hash: ${BASE.snapshots_hash}`);
console.log('');
console.log('📁 Guardado en: .quannex/tests/baseline.json');
