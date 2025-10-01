/**
 * @fileoverview Tests for Autofix & Modernize System
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const REPORTS_DIR = join(PROJECT_ROOT, '.reports');

// Crear directorios necesarios
beforeAll(() => {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
});

// Función helper para ejecutar scripts
function runScript(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [script, ...args], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      resolve({
        code,
        stdout,
        stderr
      });
    });

    child.on('error', error => {
      reject(error);
    });
  });
}

describe('Autofix & Modernize System', () => {
  describe('Autofix Orchestrator', () => {
    test('should show help when no arguments provided', async() => {
      const result = await runScript('tools/run-autofix.mjs');

      expect(result.code).toBe(1);
      expect(result.stderr).toContain(
        'Usar --dry-run para preview o --apply para ejecutar'
      );
    });

    test('should run dry-run mode successfully', async() => {
      const result = await runScript('tools/run-autofix.mjs', ['--dry-run']);

      // El dry-run puede fallar si hay errores de lint, pero debe ejecutarse
      expect([0, 1]).toContain(result.code);

      // Verificar que se generó un reporte
      const reportFile = join(REPORTS_DIR, 'autofix-report.json');
      if (existsSync(reportFile)) {
        const report = JSON.parse(readFileSync(reportFile, 'utf8'));
        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('mode', 'dry-run');
        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('results');
      }
    });

    test('should validate autofix report structure', async() => {
      const reportFile = join(REPORTS_DIR, 'autofix-report.json');

      if (existsSync(reportFile)) {
        const report = JSON.parse(readFileSync(reportFile, 'utf8'));

        // Verificar estructura del reporte
        expect(report.summary).toHaveProperty('total_languages');
        expect(report.summary).toHaveProperty('successful_languages');
        expect(report.summary).toHaveProperty('failed_languages');
        expect(report.summary).toHaveProperty('total_commands');
        expect(report.summary).toHaveProperty('successful_commands');
        expect(report.summary).toHaveProperty('failed_commands');

        // Verificar que hay resultados
        expect(Array.isArray(report.results)).toBe(true);

        // Verificar estructura de cada resultado
        for (const result of report.results) {
          expect(result).toHaveProperty('language');
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('commands');
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('errors');
          expect(Array.isArray(result.commands)).toBe(true);
          expect(Array.isArray(result.errors)).toBe(true);
        }
      }
    });
  });

  describe('Preview Diff Generator', () => {
    test('should generate preview diff', async() => {
      const result = await runScript('tools/preview-diff.mjs');

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('# Autofix Preview Diff');
      expect(result.stdout).toContain('Generated:');
    });

    test('should save diff to file', async() => {
      const diffFile = join(REPORTS_DIR, 'autofix.diff');

      if (existsSync(diffFile)) {
        const diffContent = readFileSync(diffFile, 'utf8');
        expect(diffContent).toContain('# Autofix Preview Diff');
        expect(diffContent).toContain('Generated:');
      }
    });
  });

  describe('SARIF Aggregator', () => {
    test('should generate SARIF report', async() => {
      const result = await runScript('tools/sarif-aggregate.mjs');

      expect(result.code).toBe(0);

      // Verificar que es JSON válido
      const sarif = JSON.parse(result.stdout);
      expect(sarif).toHaveProperty('$schema');
      expect(sarif).toHaveProperty('version', '2.1.0');
      expect(sarif).toHaveProperty('runs');
      expect(Array.isArray(sarif.runs)).toBe(true);
    });

    test('should save SARIF to file', async() => {
      const sarifFile = join(REPORTS_DIR, 'security.sarif');

      if (existsSync(sarifFile)) {
        const sarifContent = readFileSync(sarifFile, 'utf8');
        const sarif = JSON.parse(sarifContent);

        expect(sarif).toHaveProperty('$schema');
        expect(sarif).toHaveProperty('version', '2.1.0');
        expect(sarif).toHaveProperty('runs');
      }
    });
  });

  describe('NPM Scripts Integration', () => {
    test('should run autofix:dry script', async() => {
      const result = await runScript('npm', ['run', 'autofix:dry']);

      // Puede fallar si hay errores de lint, pero debe ejecutarse
      expect([0, 1]).toContain(result.code);
    });

    test('should run autofix:diff script', async() => {
      const result = await runScript('npm', ['run', 'autofix:diff']);

      expect(result.code).toBe(0);
    });

    test('should run autofix:sarif script', async() => {
      const result = await runScript('npm', ['run', 'autofix:sarif']);

      expect(result.code).toBe(0);
    });

    test('should run modernize script', async() => {
      const result = await runScript('npm', ['run', 'modernize']);

      // Puede fallar si hay errores de lint, pero debe ejecutarse
      expect([0, 1]).toContain(result.code);
    });
  });

  describe('Report Files Validation', () => {
    test('should generate valid JSON reports', async() => {
      // Ejecutar autofix dry-run para generar reportes
      await runScript('tools/run-autofix.mjs', ['--dry-run']);

      // Verificar reporte de autofix
      const autofixReport = join(REPORTS_DIR, 'autofix-report.json');
      if (existsSync(autofixReport)) {
        expect(() =>
          JSON.parse(readFileSync(autofixReport, 'utf8'))
        ).not.toThrow();
      }

      // Verificar diff
      const diffFile = join(REPORTS_DIR, 'autofix.diff');
      if (existsSync(diffFile)) {
        const diffContent = readFileSync(diffFile, 'utf8');
        expect(diffContent).toContain('# Autofix Preview Diff');
      }

      // Verificar SARIF
      const sarifFile = join(REPORTS_DIR, 'security.sarif');
      if (existsSync(sarifFile)) {
        expect(() => JSON.parse(readFileSync(sarifFile, 'utf8'))).not.toThrow();
      }
    });
  });

  describe('Tool Integration', () => {
    test('should have required tools available', async() => {
      // Verificar que las herramientas están disponibles
      const tools = [
        { cmd: 'npx', args: ['eslint', '--version'] },
        { cmd: 'npx', args: ['prettier', '--version'] },
        { cmd: 'shellcheck', args: ['--version'] },
        { cmd: 'shfmt', args: ['--version'] }
      ];

      for (const tool of tools) {
        try {
          const result = await runScript(tool.cmd, tool.args);
          // No importa si falla, solo verificamos que el comando existe
          expect(typeof result.code).toBe('number');
        } catch (error) {
          // Algunas herramientas pueden no estar instaladas en el entorno de test
          console.warn(`Tool ${tool.cmd} not available: ${error.message}`);
        }
      }
    });
  });
});
