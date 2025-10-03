#!/usr/bin/env node
/**
 * 🛡️ GUARDIÁN ANTI-REGRESIÓN DE LINTING
 *
 * Compara el reporte actual con el baseline y aplica gates suaves
 * para detectar regresiones sin bloquear el desarrollo.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

class LintGuard {
  constructor() {
    this.reportsDir = '.reports/lint';
    this.baselinePath = join(this.reportsDir, 'baseline.json');
    this.currentPath = join(this.reportsDir, 'lint-report.json');
  }

  loadBaseline() {
    if (!existsSync(this.baselinePath)) {
      console.log('⚠️  No se encontró baseline. Ejecuta primero: npm run lint:report');
      process.exit(1);
    }
    return JSON.parse(readFileSync(this.baselinePath, 'utf8'));
  }

  loadCurrent() {
    if (!existsSync(this.currentPath)) {
      console.log('⚠️  No se encontró reporte actual. Ejecuta primero: npm run lint:report');
      process.exit(1);
    }
    return JSON.parse(readFileSync(this.currentPath, 'utf8'));
  }

  compareReports(baseline, current) {
    const comparison = {
      timestamp: new Date().toISOString(),
      baseline: baseline.timestamp,
      current: current.timestamp,
      changes: {
        L1: this.compareLevel(baseline.byLevel.L1, current.byLevel.L1),
        L2: this.compareLevel(baseline.byLevel.L2, current.byLevel.L2),
        L3: this.compareLevel(baseline.byLevel.L3, current.byLevel.L3),
        L4: this.compareLevel(baseline.byLevel.L4, current.byLevel.L4),
      },
      summary: {
        totalErrorsChange: current.summary.totalErrors - baseline.summary.totalErrors,
        totalWarningsChange: current.summary.totalWarnings - baseline.summary.totalWarnings,
        durationChange: current.duration.durationMs - baseline.duration.durationMs,
      },
    };

    return comparison;
  }

  compareLevel(baseline, current) {
    return {
      errors: {
        baseline: baseline.errors,
        current: current.errors,
        change: current.errors - baseline.errors,
        changePercent:
          baseline.errors > 0
            ? Math.round(((current.errors - baseline.errors) / baseline.errors) * 100)
            : 0,
      },
      warnings: {
        baseline: baseline.warnings,
        current: current.warnings,
        change: current.warnings - baseline.warnings,
        changePercent:
          baseline.warnings > 0
            ? Math.round(((current.warnings - baseline.warnings) / baseline.warnings) * 100)
            : 0,
      },
      files: {
        baseline: baseline.files,
        current: current.files,
        change: current.files - baseline.files,
      },
    };
  }

  applyGates(comparison) {
    const gates = {
      L1: this.checkL1Gate(comparison.changes.L1),
      L2: this.checkL2Gate(comparison.changes.L2),
      L3: this.checkL3Gate(comparison.changes.L3),
      L4: this.checkL4Gate(comparison.changes.L4),
      performance: this.checkPerformanceGate(comparison.summary),
    };

    return gates;
  }

  checkL1Gate(levelChange) {
    // L1: Estricto - no se permiten errores adicionales
    const hasNewErrors = levelChange.errors.change > 0;
    const hasNewWarnings = levelChange.warnings.change > 0;

    return {
      name: 'L1-Strict',
      pass: !hasNewErrors && !hasNewWarnings,
      level: hasNewErrors ? 'ERROR' : hasNewWarnings ? 'WARN' : 'PASS',
      message: hasNewErrors
        ? `❌ L1: +${levelChange.errors.change} errores críticos`
        : hasNewWarnings
          ? `⚠️  L1: +${levelChange.warnings.change} warnings críticos`
          : '✅ L1: Sin regresiones',
    };
  }

  checkL2Gate(levelChange) {
    // L2: Tolerancia del 20% en warnings
    const hasNewErrors = levelChange.errors.change > 0;
    const warningsIncrease = levelChange.warnings.changePercent > 20;

    return {
      name: 'L2-Moderate',
      pass: !hasNewErrors && !warningsIncrease,
      level: hasNewErrors ? 'ERROR' : warningsIncrease ? 'WARN' : 'PASS',
      message: hasNewErrors
        ? `❌ L2: +${levelChange.errors.change} errores`
        : warningsIncrease
          ? `⚠️  L2: +${levelChange.warnings.changePercent}% warnings (>20%)`
          : '✅ L2: Dentro de tolerancia',
    };
  }

  checkL3Gate(levelChange) {
    // L3: Tolerancia del 30% en warnings
    const hasNewErrors = levelChange.errors.change > 0;
    const warningsIncrease = levelChange.warnings.changePercent > 30;

    return {
      name: 'L3-Flexible',
      pass: !hasNewErrors && !warningsIncrease,
      level: hasNewErrors ? 'ERROR' : warningsIncrease ? 'WARN' : 'PASS',
      message: hasNewErrors
        ? `❌ L3: +${levelChange.errors.change} errores`
        : warningsIncrease
          ? `⚠️  L3: +${levelChange.warnings.changePercent}% warnings (>30%)`
          : '✅ L3: Dentro de tolerancia',
    };
  }

  checkL4Gate(levelChange) {
    // L4: Solo reporta, no bloquea
    return {
      name: 'L4-Info',
      pass: true,
      level: 'INFO',
      message: `ℹ️  L4: ${levelChange.errors.change} errores, ${levelChange.warnings.change} warnings`,
    };
  }

  checkPerformanceGate(summary) {
    // Performance: Aumento > 20% en tiempo de ejecución
    const performanceIncrease = summary.durationChange > summary.durationChange * 0.2;

    return {
      name: 'Performance',
      pass: !performanceIncrease,
      level: performanceIncrease ? 'WARN' : 'PASS',
      message: performanceIncrease
        ? `⚠️  Performance: +${Math.round(summary.durationChange / 1000)}s ejecución`
        : '✅ Performance: Dentro de límites',
    };
  }

  run() {
    console.log('🛡️  Ejecutando guardián anti-regresión...');

    const baseline = this.loadBaseline();
    const current = this.loadCurrent();

    const comparison = this.compareReports(baseline, current);
    const gates = this.applyGates(comparison);

    // Mostrar resultados
    console.log('\n📊 COMPARACIÓN CON BASELINE:');
    console.log(`Baseline: ${baseline.timestamp}`);
    console.log(`Actual:   ${current.timestamp}`);
    console.log(
      `Duración: ${comparison.summary.durationChange > 0 ? '+' : ''}${Math.round(comparison.summary.durationChange / 1000)}s`
    );

    console.log('\n🎯 GATES POR NIVEL:');
    for (const [level, gate] of Object.entries(gates)) {
      console.log(`${gate.message}`);
    }

    // Determinar resultado final
    const criticalFailures = Object.values(gates).filter(g => g.level === 'ERROR' && !g.pass);

    const warnings = Object.values(gates).filter(g => g.level === 'WARN' && !g.pass);

    if (criticalFailures.length > 0) {
      console.log('\n❌ GUARDIÁN FALLÓ: Regresiones críticas detectadas');
      criticalFailures.forEach(f => console.log(`  - ${f.message}`));
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log('\n⚠️  GUARDIÁN WARN: Regresiones menores detectadas');
      warnings.forEach(w => console.log(`  - ${w.message}`));
      process.exit(0); // Warnings no bloquean
    } else {
      console.log('\n✅ GUARDIÁN PASS: Sin regresiones detectadas');
      process.exit(0);
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const guard = new LintGuard();
  guard.run();
}

export default LintGuard;
