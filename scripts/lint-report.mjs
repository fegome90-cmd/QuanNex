#!/usr/bin/env node
/**
 * 📊 GENERADOR DE REPORTE DE LINTING POR NIVELES
 *
 * Genera lint-report.json con métricas por nivel (L1-L4) y por directorio
 * para establecer baseline y detectar regresiones.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

class LintReporter {
  constructor() {
    this.reportsDir = '.reports/lint';
    this.ensureReportsDir();
  }

  ensureReportsDir() {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  runLinting() {
    console.log('🔍 Ejecutando linting...');
    try {
      const output = execSync('npm run lint', {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return { success: true, output, errors: 0, warnings: 0 };
    } catch (error) {
      // ESLint retorna exit code 1 cuando hay problemas, pero no errores fatales
      const output = error.stdout || '';
      const stderr = error.stderr || '';

      // Parsear problemas del output
      const problems = this.parseLintOutput(output + stderr);

      return {
        success: false,
        output: output + stderr,
        errors: problems.errors,
        warnings: problems.warnings,
        problems: problems.details,
      };
    }
  }

  parseLintOutput(output) {
    const lines = output.split('\n');
    let errors = 0;
    let warnings = 0;
    const details = [];

    for (const line of lines) {
      if (line.includes('error')) {
        errors++;
        details.push({ type: 'error', line: line.trim() });
      } else if (line.includes('warning')) {
        warnings++;
        details.push({ type: 'warning', line: line.trim() });
      }
    }

    return { errors, warnings, details };
  }

  classifyProblems(problems) {
    const byLevel = {
      L1: { errors: 0, warnings: 0, files: new Set() },
      L2: { errors: 0, warnings: 0, files: new Set() },
      L3: { errors: 0, warnings: 0, files: new Set() },
      L4: { errors: 0, warnings: 0, files: new Set() },
    };

    const byDirectory = {};

    for (const problem of problems) {
      const fileMatch = problem.line.match(/^([^(]+)/);
      if (!fileMatch) continue;

      const filePath = fileMatch[1];
      const level = this.classifyFile(filePath);
      const directory = this.getDirectory(filePath);

      // Clasificar por nivel
      if (problem.type === 'error') {
        byLevel[level].errors++;
      } else {
        byLevel[level].warnings++;
      }
      byLevel[level].files.add(filePath);

      // Clasificar por directorio
      if (!byDirectory[directory]) {
        byDirectory[directory] = { errors: 0, warnings: 0, files: new Set() };
      }
      if (problem.type === 'error') {
        byDirectory[directory].errors++;
      } else {
        byDirectory[directory].warnings++;
      }
      byDirectory[directory].files.add(filePath);
    }

    // Convertir Sets a números
    for (const level of Object.keys(byLevel)) {
      byLevel[level].files = byLevel[level].files.size;
    }
    for (const dir of Object.keys(byDirectory)) {
      byDirectory[dir].files = byDirectory[dir].files.size;
    }

    return { byLevel, byDirectory };
  }

  classifyFile(filePath) {
    // Nivel 1: Crítico
    if (
      filePath.includes('package.json') ||
      filePath.includes('tsconfig.json') ||
      filePath.includes('eslint.config.js') ||
      filePath.includes('claude-project-init.sh') ||
      filePath.includes('core/security/') ||
      filePath.includes('core/rules-') ||
      filePath.includes('core/integrity-validator.js') ||
      filePath.includes('scripts/audit-git-bypasses.mjs') ||
      filePath.includes('config/') ||
      filePath.includes('contracts/') ||
      filePath.includes('schemas/') ||
      filePath.includes('policies/') ||
      filePath.includes('orchestrator.js') ||
      filePath.includes('src/') ||
      filePath.includes('packages/quannex-mcp/')
    ) {
      return 'L1';
    }

    // Nivel 2: Alto
    if (
      filePath.includes('agents/') ||
      filePath.includes('core/attribution-manager.js') ||
      filePath.includes('core/centralized-logger.js') ||
      filePath.includes('core/auto-rules-hook.js') ||
      filePath.includes('core/taskdb-protection.js') ||
      filePath.includes('scripts/quality-gate.mjs') ||
      filePath.includes('scripts/scan-gate.mjs') ||
      filePath.includes('scripts/policy-check.mjs') ||
      filePath.includes('scripts/report-validate.mjs') ||
      filePath.includes('tests/contracts/') ||
      filePath.includes('tests/security/') ||
      filePath.includes('tests/integration/')
    ) {
      return 'L2';
    }

    // Nivel 3: Medio
    if (
      filePath.includes('scripts/') ||
      filePath.includes('tools/') ||
      filePath.includes('utils/') ||
      filePath.includes('examples/') ||
      filePath.includes('templates/') ||
      filePath.includes('docs/') ||
      filePath.includes('ops/') ||
      filePath.includes('quality-tests/') ||
      filePath.includes('experiments/') ||
      filePath.includes('shared/') ||
      filePath.includes('apps/') ||
      filePath.includes('tests/')
    ) {
      return 'L3';
    }

    // Nivel 4: Bajo (legacy)
    return 'L4';
  }

  getDirectory(filePath) {
    const parts = filePath.split('/');
    if (parts.length <= 1) return 'root';
    return parts[0];
  }

  generateReport() {
    console.log('📊 Generando reporte de linting...');

    const startTime = Date.now();
    const lintResult = this.runLinting();
    const endTime = Date.now();

    const classification = this.classifyProblems(lintResult.problems || []);

    const report = {
      timestamp: new Date().toISOString(),
      duration: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
        durationMin: Math.round(((endTime - startTime) / 60000) * 100) / 100,
      },
      summary: {
        success: lintResult.success,
        totalErrors: lintResult.errors,
        totalWarnings: lintResult.warnings,
        totalProblems: lintResult.errors + lintResult.warnings,
      },
      byLevel: classification.byLevel,
      byDirectory: classification.byDirectory,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // Guardar reporte
    const reportPath = join(this.reportsDir, 'lint-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Guardar baseline si no existe
    const baselinePath = join(this.reportsDir, 'baseline.json');
    if (!existsSync(baselinePath)) {
      writeFileSync(baselinePath, JSON.stringify(report, null, 2));
      console.log('📌 Baseline creado');
    }

    console.log(`📊 Reporte generado: ${reportPath}`);
    console.log(`⏱️  Duración: ${report.duration.durationMin} min`);
    console.log(
      `📈 Problemas: ${report.summary.totalErrors} errores, ${report.summary.totalWarnings} warnings`
    );

    return report;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const reporter = new LintReporter();
  reporter.generateReport();
}

export default LintReporter;
