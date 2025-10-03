import fs from 'fs';

/**
 * Handler para corregir scripts NPM inconsistentes
 * Detecta y corrige scripts que no siguen las convenciones del proyecto
 */
export async function updateScript({ scriptName, newValue, reason }) {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    if (!pkg.scripts) {
      pkg.scripts = {};
    }

    const oldValue = pkg.scripts[scriptName];
    pkg.scripts[scriptName] = newValue;

    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

    return {
      stdout: `Updated script '${scriptName}': '${oldValue}' → '${newValue}'`,
      script: scriptName,
      oldValue,
      newValue,
      reason,
    };
  } catch (error) {
    return {
      stdout: `Failed to update script '${scriptName}': ${error.message}`,
      error: error.message,
    };
  }
}

// Scripts estándar del proyecto
const STANDARD_SCRIPTS = {
  test: 'vitest run',
  'test:ci': 'vitest run --coverage',
  'test:watch': 'vitest',
  build: 'tsc -p tsconfig.json',
  typecheck: 'tsc --noEmit',
  lint: 'eslint . --ext .ts,.tsx,.js,.jsx',
  'lint:fix': 'eslint . --ext .ts,.tsx,.js,.jsx --fix',
  format: 'prettier --write .',
  'format:check': 'prettier --check .',
  verify: 'npm run build && npm run typecheck && npm run lint && npm run test:ci',
};

// Detectar scripts inconsistentes
export async function detectInconsistentScripts() {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = pkg.scripts || {};

    const inconsistencies = [];

    for (const [scriptName, expectedValue] of Object.entries(STANDARD_SCRIPTS)) {
      const currentValue = scripts[scriptName];

      if (currentValue && currentValue !== expectedValue) {
        inconsistencies.push({
          script: scriptName,
          current: currentValue,
          expected: expectedValue,
          reason: 'Non-standard script value',
        });
      }
    }

    return inconsistencies;
  } catch (error) {
    return [];
  }
}

// Auto-corregir scripts inconsistentes
export async function autoFixScripts() {
  const inconsistencies = await detectInconsistentScripts();
  const results = [];

  for (const issue of inconsistencies) {
    const result = await updateScript({
      scriptName: issue.script,
      newValue: issue.expected,
      reason: issue.reason,
    });
    results.push(result);
  }

  return results;
}
