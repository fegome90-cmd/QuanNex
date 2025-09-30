#!/usr/bin/env node
/**
 * @fileoverview SARIF Aggregator - Combina reportes de ESLint/Ruff/Semgrep en SARIF
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Colores
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const color = colors[level] || colors.reset;
  console.error(
    `${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}`
  );
}

// SARIF base structure
const sarifBase = {
  $schema:
    'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: []
};

function createSarifRun(tool, results) {
  return {
    tool: {
      driver: {
        name: tool.name,
        version: tool.version,
        informationUri: tool.uri,
        rules: tool.rules || []
      }
    },
    results: results
  };
}

function convertEslintToSarif(eslintData) {
  const results = [];

  for (const file of eslintData) {
    for (const message of file.messages) {
      const result = {
        ruleId: message.ruleId || 'eslint-rule',
        level:
          message.severity === 2
            ? 'error'
            : message.severity === 1
              ? 'warning'
              : 'note',
        message: {
          text: message.message
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: file.filePath.replace(PROJECT_ROOT + '/', '')
              },
              region: {
                startLine: message.line,
                startColumn: message.column,
                endLine: message.endLine || message.line,
                endColumn: message.endColumn || message.column + 1
              }
            }
          }
        ]
      };

      if (message.fix) {
        result.fixes = [
          {
            description: {
              text: 'ESLint autofix available'
            }
          }
        ];
      }

      results.push(result);
    }
  }

  return createSarifRun(
    {
      name: 'ESLint',
      version: '9.34.0',
      uri: 'https://eslint.org/'
    },
    results
  );
}

function convertRuffToSarif(ruffData) {
  const results = [];

  for (const file of ruffData) {
    for (const diagnostic of file.diagnostics) {
      const result = {
        ruleId: diagnostic.code,
        level: diagnostic.severity === 'error' ? 'error' : 'warning',
        message: {
          text: diagnostic.message
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: file.filename.replace(PROJECT_ROOT + '/', '')
              },
              region: {
                startLine: diagnostic.location.row,
                startColumn: diagnostic.location.column,
                endLine:
                  diagnostic.end_location?.row || diagnostic.location.row,
                endColumn:
                  diagnostic.end_location?.column ||
                  diagnostic.location.column + 1
              }
            }
          }
        ]
      };

      if (diagnostic.fix) {
        result.fixes = [
          {
            description: {
              text: 'Ruff autofix available'
            }
          }
        ];
      }

      results.push(result);
    }
  }

  return createSarifRun(
    {
      name: 'Ruff',
      version: '0.1.0',
      uri: 'https://github.com/astral-sh/ruff'
    },
    results
  );
}

function convertSemgrepToSarif(semgrepData) {
  const results = [];

  for (const finding of semgrepData.results) {
    const result = {
      ruleId: finding.check_id,
      level:
        finding.extra.severity === 'ERROR'
          ? 'error'
          : finding.extra.severity === 'WARNING'
            ? 'warning'
            : 'note',
      message: {
        text: finding.extra.message
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: finding.path.replace(PROJECT_ROOT + '/', '')
            },
            region: {
              startLine: finding.start.line,
              startColumn: finding.start.col,
              endLine: finding.end.line,
              endColumn: finding.end.col
            }
          }
        }
      ]
    };

    results.push(result);
  }

  return createSarifRun(
    {
      name: 'Semgrep',
      version: '1.0.0',
      uri: 'https://semgrep.dev/'
    },
    results
  );
}

async function aggregateReports() {
  log('blue', '🔍 Agregando reportes de seguridad...');

  const runs = [];
  const reportsDir = join(PROJECT_ROOT, '.reports');

  if (!existsSync(reportsDir)) {
    log('yellow', '⚠️  Directorio de reportes no encontrado');
    return sarifBase;
  }

  // Buscar reportes ESLint
  try {
    const eslintFiles = readdirSync(reportsDir).filter(f =>
      f.startsWith('eslint-report')
    );
    if (eslintFiles.length > 0) {
      const latestEslint = eslintFiles.sort().pop();
      const eslintData = JSON.parse(
        readFileSync(join(reportsDir, latestEslint), 'utf8')
      );
      runs.push(convertEslintToSarif(eslintData));
      log('green', `  ✅ ESLint report agregado: ${latestEslint}`);
    }
  } catch (error) {
    log('yellow', `  ⚠️  Error procesando ESLint: ${error.message}`);
  }

  // Buscar reportes Ruff
  try {
    const ruffFiles = readdirSync(reportsDir).filter(f =>
      f.startsWith('ruff-report')
    );
    if (ruffFiles.length > 0) {
      const latestRuff = ruffFiles.sort().pop();
      const ruffData = JSON.parse(
        readFileSync(join(reportsDir, latestRuff), 'utf8')
      );
      runs.push(convertRuffToSarif(ruffData));
      log('green', `  ✅ Ruff report agregado: ${latestRuff}`);
    }
  } catch (error) {
    log('yellow', `  ⚠️  Error procesando Ruff: ${error.message}`);
  }

  // Buscar reportes Semgrep
  try {
    const semgrepFiles = readdirSync(reportsDir).filter(f =>
      f.startsWith('semgrep-report')
    );
    if (semgrepFiles.length > 0) {
      const latestSemgrep = semgrepFiles.sort().pop();
      const semgrepData = JSON.parse(
        readFileSync(join(reportsDir, latestSemgrep), 'utf8')
      );
      runs.push(convertSemgrepToSarif(semgrepData));
      log('green', `  ✅ Semgrep report agregado: ${latestSemgrep}`);
    }
  } catch (error) {
    log('yellow', `  ⚠️  Error procesando Semgrep: ${error.message}`);
  }

  // Crear SARIF final
  const sarif = {
    ...sarifBase,
    runs
  };

  // Guardar SARIF
  const sarifFile = join(reportsDir, 'security.sarif');
  writeFileSync(sarifFile, JSON.stringify(sarif, null, 2));

  log('blue', `📊 SARIF guardado en: ${sarifFile}`);
  log('blue', `📈 Total de runs: ${runs.length}`);

  return sarif;
}

async function main() {
  try {
    const sarif = await aggregateReports();
    console.log(JSON.stringify(sarif, null, 2));
  } catch (error) {
    log('red', `💥 Error agregando reportes: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es el script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
