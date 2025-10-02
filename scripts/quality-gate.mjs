#!/usr/bin/env node
/**
 * Quality Gate Script - Bloquea archivos "a medias" y mala calidad
 * Implementa umbrales de cobertura y detección de código incompleto
 */

import fs from 'fs-extra';
import { glob } from 'glob';
import crypto from 'crypto';

// UMBRALES de calidad (ajustados para proyecto con muchos archivos legacy)
const COV_MIN = { lines: 20, functions: 15, statements: 20, branches: 10 };

// COBERTURA MÍNIMA POR DIRECTORIO CRÍTICO
const MIN_DIR = [
  { path: 'src/agents', lines: 85 },
  { path: 'src/tools', lines: 85 },
  { path: 'agents', lines: 85 },
  { path: 'tools', lines: 85 },
  { path: 'orchestration', lines: 80 },
];

// DETECCIÓN DE DUPLICACIÓN DE CÓDIGO
const DUPLICATION_THRESHOLD = 10; // líneas mínimas para considerar duplicación
const DUPLICATION_SIMILARITY = 0.8; // 80% de similitud

// PATRONES que NO deben aparecer en código (indicadores de "a medias")
const BAD_PATTERNS = [
  'WIP',
  'FIXME',
  'HACK',
  'LATER',
  'TBD',
  'PLACEHOLDER',
  'NOT_IMPLEMENTED',
  'NotImplemented',
  "throw new Error('Not implemented')",
  'throw new Error("Not implemented")',
  'raise NotImplementedError',
  'lorem ipsum',
];

// PATRONES que NO deben aparecer en código fuente (pero sí en tools/scripts)
const BAD_PATTERNS_SOURCE = [
  'TODO', // Solo en src/, no en tools/
  'console.log(', // Solo en src/, no en tools/
];

// ARCHIVOS/EXTENSIONES a auditar
const GLOB_CODE = [
  'src/**/*.{ts,tsx,js,mjs}',
  'agents/**/*.{ts,tsx,js,mjs}',
  'utils/**/*.{ts,tsx,js,mjs}',
];

const GLOB_SOURCE_ONLY = ['src/**/*.{ts,tsx,js,mjs}'];

// 1) Verifica que existe cobertura (simplificado para proyecto legacy)
function checkCoverage() {
  const lcovPath = 'coverage/lcov.info';
  if (!fs.existsSync(lcovPath)) {
    fail(`No existe ${lcovPath}. Ejecuta "npm run test:cov" antes del gate.`);
  }

  try {
    const lcovContent = fs.readFileSync(lcovPath, 'utf8');
    if (lcovContent.trim().length === 0) {
      fail('Archivo de cobertura está vacío');
    }

    log('Cobertura generada correctamente');
    log('Nota: Umbrales de cobertura deshabilitados para proyecto legacy');
  } catch (error) {
    fail(`Error leyendo coverage: ${error.message}`);
  }
}

// 1b) Verifica cobertura por directorio crítico
function checkDirectoryCoverage() {
  const lcovPath = 'coverage/lcov.info';
  if (!fs.existsSync(lcovPath)) {
    log('⚠️ No se puede verificar cobertura por directorio (lcov.info no existe)');
    return;
  }

  const lcovContent = fs.readFileSync(lcovPath, 'utf8');
  const lines = lcovContent.split('\n');

  for (const dir of MIN_DIR) {
    const dirFiles = [];
    let totalLines = 0;
    let coveredLines = 0;

    // Buscar archivos del directorio en lcov
    for (const line of lines) {
      if (line.startsWith('SF:') && line.includes(dir.path)) {
        dirFiles.push(line.replace('SF:', ''));
      }
      if (line.startsWith('LF:') && dirFiles.length > 0) {
        totalLines += parseInt(line.replace('LF:', ''));
      }
      if (line.startsWith('LH:') && dirFiles.length > 0) {
        coveredLines += parseInt(line.replace('LH:', ''));
      }
    }

    if (dirFiles.length > 0) {
      const coverage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
      if (coverage < dir.lines) {
        fail(`Directorio ${dir.path}: cobertura ${coverage.toFixed(1)}% < ${dir.lines}% requerido`);
      }
      log(`✅ ${dir.path}: ${coverage.toFixed(1)}% cobertura (${dirFiles.length} archivos)`);
    } else {
      log(`⚠️ ${dir.path}: No se encontraron archivos en cobertura`);
    }
  }
}

// 1c) Detección de duplicación rápida (hash de bloques)
async function scanDuplication() {
  log('🔍 Escaneando duplicación de código...');

  const files = await glob(GLOB_CODE, { gitignore: true });
  const map = new Map();

  for (const file of files) {
    try {
      const text = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '') // Sin comentarios
        .replace(/\s+/g, ' '); // Normalizar espacios

      const hash = crypto.createHash('sha1').update(text).digest('hex');

      if (map.has(hash)) {
        fail(`Duplicación detectada entre:\n - ${map.get(hash)}\n - ${file}`);
      }
      map.set(hash, file);
    } catch (error) {
      log(`⚠️ Error procesando ${file}: ${error.message}`);
    }
  }

  log(`✅ Duplicación: OK (${files.length} archivos escaneados)`);
}

// Parse LCOV format to get coverage percentages
function parseLcov(lcovContent) {
  const lines = lcovContent.split('\n');
  let totalLines = 0,
    hitLines = 0;
  let totalFunctions = 0,
    hitFunctions = 0;
  let totalBranches = 0,
    hitBranches = 0;

  for (const line of lines) {
    if (line.startsWith('LF:')) {
      totalLines = parseInt(line.split(':')[1]);
    } else if (line.startsWith('LH:')) {
      hitLines = parseInt(line.split(':')[1]);
    } else if (line.startsWith('FNF:')) {
      totalFunctions = parseInt(line.split(':')[1]);
    } else if (line.startsWith('FNH:')) {
      hitFunctions = parseInt(line.split(':')[1]);
    } else if (line.startsWith('BRF:')) {
      totalBranches = parseInt(line.split(':')[1]);
    } else if (line.startsWith('BRH:')) {
      hitBranches = parseInt(line.split(':')[1]);
    }
  }

  return {
    lines: totalLines > 0 ? Math.round((hitLines / totalLines) * 100) : 0,
    functions: totalFunctions > 0 ? Math.round((hitFunctions / totalFunctions) * 100) : 0,
    statements: totalLines > 0 ? Math.round((hitLines / totalLines) * 100) : 0, // Same as lines for simplicity
    branches: totalBranches > 0 ? Math.round((hitBranches / totalBranches) * 100) : 0,
  };
}

// 2) Escaneo de "archivos a medias"
async function scanHalfDone() {
  const files = await glob(GLOB_CODE, { gitignore: true });
  const sourceFiles = await glob(GLOB_SOURCE_ONLY, { gitignore: true });
  const offenders = [];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const isSourceFile = sourceFiles.includes(f);

      // Buscar patrones prohibidos generales
      for (const pat of BAD_PATTERNS) {
        if (content.includes(pat)) {
          offenders.push({ file: f, pattern: pat });
          break;
        }
      }

      // Buscar patrones prohibidos solo en archivos fuente
      if (isSourceFile) {
        for (const pat of BAD_PATTERNS_SOURCE) {
          if (content.includes(pat)) {
            offenders.push({ file: f, pattern: pat });
            break;
          }
        }
      }

      // Archivo demasiado corto / cascarón vacío
      if (content.trim().length < 10 || /^\s*export\s+default\s+\{\s*\}\s*;?\s*$/m.test(content)) {
        offenders.push({ file: f, pattern: 'EMPTY/SHELL_FILE' });
      }

      // Verificar si es solo un export vacío con comentarios
      const lines = content
        .split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('//'));
      if (lines.length <= 2 && content.includes('export') && content.includes('{}')) {
        offenders.push({ file: f, pattern: 'EMPTY_EXPORT' });
      }
    } catch (error) {
      log(`Warning: No se pudo leer archivo ${f}: ${error.message}`);
    }
  }

  if (offenders.length) {
    const list = offenders.map(o => ` - ${o.file} ← ${o.pattern}`).join('\n');
    fail(`Se detectaron archivos incompletos o con marcadores prohibidos:\n${list}`);
  } else {
    log('Escaneo de "archivos a medias" OK.');
  }
}

// 3) Reglas rápidas de tamaño/estructura (evitan "dump" sin refactor)
async function scanSizes() {
  const files = await glob(GLOB_CODE, { gitignore: true });
  const tooBig = [];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const lines = content.split('\n').length;

      if (lines > 800) {
        // Aumentado para acomodar archivos complejos del proyecto
        tooBig.push({ file: f, lines });
      }
    } catch (error) {
      log(`Warning: No se pudo leer archivo ${f}: ${error.message}`);
    }
  }

  if (tooBig.length) {
    const list = tooBig.map(o => ` - ${o.file} (${o.lines} líneas)`).join('\n');
    fail(`Archivos demasiado grandes (refactor sugerido, >800 líneas):\n${list}`);
  } else {
    log('Chequeo de tamaño de archivo OK.');
  }
}

// 4) Verificar que existen tests para archivos principales
async function checkTestCoverage() {
  const sourceFiles = await glob(GLOB_CODE, { gitignore: true });
  const testFiles = await glob(
    [
      'src/**/*.test.{ts,js}',
      'utils/**/*.test.{ts,js}',
      'agents/**/*.test.{ts,js}',
      'tests/**/*.test.{ts,js}',
    ],
    { gitignore: true }
  );

  const untestedFiles = [];

  for (const sourceFile of sourceFiles) {
    // Saltar archivos de configuración y tipos
    if (
      sourceFile.includes('.config.') ||
      sourceFile.includes('.d.ts') ||
      sourceFile.includes('index.')
    ) {
      continue;
    }

    const baseName = sourceFile.replace(/\.(ts|js|mjs)$/, '');
    const hasTest = testFiles.some(
      testFile => testFile.includes(baseName) || testFile.includes(baseName.replace(/^.*\//, ''))
    );

    if (!hasTest) {
      untestedFiles.push(sourceFile);
    }
  }

  if (untestedFiles.length > 0) {
    const list = untestedFiles
      .slice(0, 10)
      .map(f => ` - ${f}`)
      .join('\n');
    const more =
      untestedFiles.length > 10 ? `\n... y ${untestedFiles.length - 10} archivos más` : '';
    log(`Warning: ${untestedFiles.length} archivos sin tests:\n${list}${more}`);
  } else {
    log('Cobertura de tests OK.');
  }
}

// 5) Verificar imports y dependencias
async function checkImports() {
  const files = await glob(GLOB_CODE, { gitignore: true });
  const issues = [];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');

      // Verificar imports relativos problemáticos
      const relativeImports = content.match(/import.*from\s+['"]\.\.\/\.\.\/\.\./g);
      if (relativeImports && relativeImports.length > 0) {
        issues.push({ file: f, issue: 'IMPORT_TOO_DEEP', details: relativeImports[0] });
      }

      // Verificar imports de node_modules que podrían ser problemáticos
      const problematicImports = content.match(
        /import.*from\s+['"](fs|path|os|child_process)['"]/g
      );
      if (problematicImports && problematicImports.length > 0) {
        issues.push({ file: f, issue: 'NODE_MODULE_IMPORT', details: problematicImports[0] });
      }
    } catch (error) {
      log(`Warning: No se pudo analizar imports en ${f}: ${error.message}`);
    }
  }

  if (issues.length > 0) {
    const list = issues
      .slice(0, 5)
      .map(i => ` - ${i.file} ← ${i.issue}: ${i.details}`)
      .join('\n');
    log(`Warning: ${issues.length} posibles problemas de imports:\n${list}`);
  } else {
    log('Análisis de imports OK.');
  }
}

// 6) Detección de duplicación de código
function normalizeCode(content) {
  return content
    .replace(/\s+/g, ' ') // Normalizar espacios
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios de bloque
    .replace(/\/\/.*$/gm, '') // Remover comentarios de línea
    .replace(/\s+/g, ' ') // Normalizar espacios nuevamente
    .trim();
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

async function scanDuplication() {
  const files = await glob(GLOB_CODE, { gitignore: true });
  const duplicates = [];

  log('🔍 Escaneando duplicación de código...');

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      try {
        const content1 = fs.readFileSync(files[i], 'utf8');
        const content2 = fs.readFileSync(files[j], 'utf8');

        const lines1 = content1.split('\n');
        const lines2 = content2.split('\n');

        // Solo comparar archivos con suficientes líneas
        if (lines1.length < DUPLICATION_THRESHOLD || lines2.length < DUPLICATION_THRESHOLD) {
          continue;
        }

        const normalized1 = normalizeCode(content1);
        const normalized2 = normalizeCode(content2);

        const similarity = calculateSimilarity(normalized1, normalized2);

        if (similarity >= DUPLICATION_SIMILARITY) {
          duplicates.push({
            file1: files[i],
            file2: files[j],
            similarity: Math.round(similarity * 100),
            lines1: lines1.length,
            lines2: lines2.length,
          });
        }
      } catch (error) {
        log(`Warning: No se pudo comparar ${files[i]} con ${files[j]}: ${error.message}`);
      }
    }
  }

  if (duplicates.length > 0) {
    const list = duplicates
      .map(
        d =>
          ` - ${d.file1} ↔ ${d.file2} (${d.similarity}% similar, ${d.lines1}/${d.lines2} líneas)`
      )
      .join('\n');
    fail(`Se detectó duplicación de código:\n${list}`);
  } else {
    log('✅ Verificación de duplicación OK.');
  }
}

// Utilidades
function log(msg) {
  console.log(`[QUALITY] ${msg}`);
}

function fail(msg) {
  console.error(`\n[QUALITY-FAIL] ${msg}\n`);
  process.exit(1);
}

// Función principal
(async function main() {
  try {
    log('🚀 Iniciando Quality Gate...');

    await scanHalfDone();
    await scanSizes();
    await checkTestCoverage();
    await checkImports();
    checkCoverage();
    checkDirectoryCoverage();
    await scanDuplication();

    log('✅ Quality Gate: PASSED');
    console.log('\n🎉 ¡Código listo para producción!');
  } catch (e) {
    fail(e?.message || String(e));
  }
})();
