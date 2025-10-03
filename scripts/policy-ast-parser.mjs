import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';

/**
 * AST-based policy checker for detecting forbidden API calls
 * Replaces regex-based detection with proper AST parsing
 */

// Configuración de políticas desde archivo
const POLICY_CONFIG = JSON.parse(fs.readFileSync('config/policies.json', 'utf8'));

// Mapeo de APIs prohibidas a sus patrones AST
const FORBIDDEN_PATTERNS = {
  'child_process.exec': {
    type: 'MemberExpression',
    object: 'child_process',
    property: 'exec',
  },
  'child_process.execSync': {
    type: 'MemberExpression',
    object: 'child_process',
    property: 'execSync',
  },
  'fs.rmSync': {
    type: 'MemberExpression',
    object: 'fs',
    property: 'rmSync',
  },
  eval: {
    type: 'Identifier',
    name: 'eval',
  },
  Function: {
    type: 'NewExpression',
    callee: 'Function',
  },
  setTimeout: {
    type: 'Identifier',
    name: 'setTimeout',
  },
  setInterval: {
    type: 'Identifier',
    name: 'setInterval',
  },
};

// Rutas permitidas por defecto (whitelist)
const ALLOWED_PATHS = {
  'child_process.exec': [
    'scripts/autofix.mjs',
    'scripts/e2e-*.mjs',
    'src/workflow/run.mjs',
    'scripts/policy-check.mjs',
  ],
  'child_process.execSync': ['scripts/autofix.mjs', 'scripts/e2e-*.mjs', 'scripts/anti-tamper.mjs'],
};

export function findForbiddenAPIs(filePath, code) {
  const violations = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['importMeta', 'dynamicImport', 'typescript', 'jsx'],
    });

    const traverseFn = traverse.default || traverse;
    traverseFn(ast, {
      CallExpression(path) {
        const callee = path.get('callee');
        const location = path.node.loc;

        // Check MemberExpression calls (e.g., child_process.exec)
        if (callee.isMemberExpression()) {
          const object = callee.get('object');
          const property = callee.get('property');

          if (object.isIdentifier() && property.isIdentifier()) {
            const apiKey = `${object.node.name}.${property.node.name}`;
            const pattern = FORBIDDEN_PATTERNS[apiKey];

            if (pattern && !isPathAllowed(filePath, apiKey)) {
              violations.push({
                file: filePath,
                line: location?.start?.line || 0,
                column: location?.start?.column || 0,
                api: apiKey,
                type: 'MemberExpression',
                content: `${apiKey}()`,
                severity: 'error',
              });
            }
          }
        }

        // Check direct function calls (e.g., eval, setTimeout, imported functions)
        if (callee.isIdentifier()) {
          const functionName = callee.node.name;

          // Map imported function names to their full API keys
          const importedAPIs = {
            exec: 'child_process.exec',
            execSync: 'child_process.execSync',
            rmSync: 'fs.rmSync',
          };

          // Check if it's an imported forbidden API
          const importedApiKey = importedAPIs[functionName];
          if (importedApiKey && !isPathAllowed(filePath, importedApiKey)) {
            violations.push({
              file: filePath,
              line: location?.start?.line || 0,
              column: location?.start?.column || 0,
              api: importedApiKey,
              type: 'ImportedFunction',
              content: `${functionName}()`,
              severity: 'error',
            });
          }

          // Check if it's a direct forbidden API
          const pattern = FORBIDDEN_PATTERNS[functionName];
          if (pattern && !isPathAllowed(filePath, functionName)) {
            violations.push({
              file: filePath,
              line: location?.start?.line || 0,
              column: location?.start?.column || 0,
              api: functionName,
              type: 'Identifier',
              content: `${functionName}()`,
              severity: 'error',
            });
          }
        }
      },

      NewExpression(path) {
        const callee = path.get('callee');
        const location = path.node.loc;

        if (callee.isIdentifier()) {
          const apiKey = callee.node.name;
          const pattern = FORBIDDEN_PATTERNS[apiKey];

          if (pattern && !isPathAllowed(filePath, apiKey)) {
            violations.push({
              file: filePath,
              line: location?.start?.line || 0,
              column: location?.start?.column || 0,
              api: apiKey,
              type: 'NewExpression',
              content: `new ${apiKey}()`,
              severity: 'error',
            });
          }
        }
      },
    });
  } catch (error) {
    console.warn(`[POLICY-AST] Error parsing ${filePath}: ${error.message}`);
  }

  return violations;
}

function isPathAllowed(filePath, apiKey) {
  const allowedPaths = ALLOWED_PATHS[apiKey] || [];

  return allowedPaths.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

export function generateSARIFReport(violations) {
  const sarif = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'QuanNex Policy Checker',
            version: '1.0.0',
            informationUri: 'https://github.com/quannex/policy-checker',
          },
        },
        results: violations.map(violation => ({
          ruleId: `forbidden-api-${violation.api}`,
          level: violation.severity,
          message: {
            text: `Forbidden API usage: ${violation.api}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: violation.file,
                },
                region: {
                  startLine: violation.line,
                  startColumn: violation.column,
                },
              },
            },
          ],
        })),
      },
    ],
  };

  return sarif;
}

export async function scanFiles(filePatterns) {
  const { globby } = await import('globby');
  const files = await globby(filePatterns, { gitignore: true });
  const allViolations = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const violations = findForbiddenAPIs(file, content);
      allViolations.push(...violations);
    } catch (error) {
      console.warn(`[POLICY-AST] Error reading ${file}: ${error.message}`);
    }
  }

  return allViolations;
}
