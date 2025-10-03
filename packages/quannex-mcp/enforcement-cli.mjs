#!/usr/bin/env node

/**
 * CLI para QuanNex Workflow Enforcement
 * Ejecuta verificaciones de compliance con las reglas obligatorias de QuanNex
 */

import QuanNexWorkflowEnforcement from './workflow-enforcement.mjs';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  console.log('🔍 QuanNex Workflow Enforcement CLI');
  console.log('=====================================\n');

  try {
    const enforcement = new QuanNexWorkflowEnforcement();

    switch (command) {
      case 'check':
        await runComplianceCheck(enforcement);
        break;

      case 'report':
        await generateReport(enforcement);
        break;

      case 'fix':
        await suggestFixes(enforcement);
        break;

      default:
        console.log('Comandos disponibles:');
        console.log('  check  - Verificar compliance (por defecto)');
        console.log('  report - Generar reporte detallado');
        console.log('  fix    - Sugerir correcciones');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error ejecutando enforcement:', error.message);
    process.exit(1);
  }
}

async function runComplianceCheck(enforcement) {
  console.log('🔍 Ejecutando verificación de compliance...\n');

  const report = await enforcement.checkCompliance();

  console.log('📊 RESULTADOS DE COMPLIANCE');
  console.log('============================');
  console.log(`Estado General: ${report.status === 'pass' ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Compliance: ${report.overall_compliance.toFixed(1)}%`);
  console.log(`Violaciones: ${report.violations.length}`);

  console.log('\n📈 MÉTRICAS:');
  console.log(`  Orchestrator Share: ${report.metrics.orchestrator_share.toFixed(1)}%`);
  console.log(`  Telemetría Coverage: ${report.metrics.telemetry_coverage.toFixed(1)}%`);
  console.log(`  Component Usage: ${report.metrics.component_usage.toFixed(1)}%`);
  console.log(`  Run Success Rate: ${report.metrics.run_success_rate.toFixed(1)}%`);

  if (report.violations.length > 0) {
    console.log('\n⚠️  VIOLACIONES:');
    report.violations.forEach((violation, index) => {
      console.log(`  ${index + 1}. [${violation.gate}] ${violation.message}`);
      console.log(`     Recomendación: ${violation.recommendation}`);
    });
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMENDACIONES:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
      console.log(`     Acción: ${rec.action}`);
    });
  }

  // Guardar reporte
  const reportPath = join(process.cwd(), '.reports/quannex-enforcement-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Reporte guardado: ${reportPath}`);

  // Exit code basado en resultado
  process.exit(report.status === 'pass' ? 0 : 1);
}

async function generateReport(enforcement) {
  console.log('📊 Generando reporte detallado...\n');

  const report = await enforcement.checkCompliance();

  // Generar reporte HTML
  const htmlReport = generateHTMLReport(report);
  const htmlPath = join(process.cwd(), '.reports/quannex-enforcement-report.html');
  writeFileSync(htmlPath, htmlReport);

  console.log('✅ Reporte HTML generado:', htmlPath);
  console.log('✅ Reporte JSON guardado: .reports/quannex-enforcement-report.json');
}

async function suggestFixes(enforcement) {
  console.log('🔧 Analizando y sugiriendo correcciones...\n');

  const report = await enforcement.checkCompliance();

  if (report.violations.length === 0) {
    console.log('✅ No se encontraron violaciones. El sistema está en compliance.');
    return;
  }

  console.log('🔧 CORRECCIONES SUGERIDAS:');
  console.log('==========================\n');

  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.recommendation}`);
    console.log(`   Prioridad: ${rec.priority.toUpperCase()}`);
    console.log(`   Acción: ${rec.action}`);
    console.log('');
  });

  console.log('📋 PASOS PARA IMPLEMENTAR:');
  console.log('==========================');
  console.log('1. Instrumentar todas las tareas con QuanNex:');
  console.log('   - Agregar qnxRunStart() al inicio');
  console.log('   - Agregar qnxUse() para componentes');
  console.log('   - Agregar qnxRunEnd() al final');
  console.log('');
  console.log('2. Asegurar eventos obligatorios:');
  console.log('   - run_start, run_end, component_used');
  console.log('   - gate_violation, tool_misfire');
  console.log('');
  console.log('3. Instrumentar componentes obligatorios:');
  console.log('   - orchestrator, validator, codegen');
  console.log('   - planner, router');
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuanNex Workflow Enforcement Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .status-pass { color: #28a745; font-weight: bold; }
        .status-fail { color: #dc3545; font-weight: bold; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #007acc; }
        .violation { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .recommendation { background: #d4edda; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 QuanNex Workflow Enforcement Report</h1>
        <p><strong>Timestamp:</strong> ${report.timestamp}</p>
        <p><strong>Run ID:</strong> ${report.run_id}</p>
        <p><strong>Estado:</strong> <span class="${report.status === 'pass' ? 'status-pass' : 'status-fail'}">${report.status === 'pass' ? '✅ PASS' : '❌ FAIL'}</span></p>
        <p><strong>Compliance:</strong> ${report.overall_compliance.toFixed(1)}%</p>
        
        <h2>📈 Métricas</h2>
        <div class="metric">
            <div class="metric-value">${report.metrics.orchestrator_share.toFixed(1)}%</div>
            <div>Orchestrator Share</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.metrics.telemetry_coverage.toFixed(1)}%</div>
            <div>Telemetría Coverage</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.metrics.component_usage.toFixed(1)}%</div>
            <div>Component Usage</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.metrics.run_success_rate.toFixed(1)}%</div>
            <div>Run Success Rate</div>
        </div>
        
        ${
          report.violations.length > 0
            ? `
        <h2>⚠️ Violaciones</h2>
        ${report.violations
          .map(
            violation => `
        <div class="violation">
            <strong>[${violation.gate}]</strong> ${violation.message}<br>
            <em>Recomendación:</em> ${violation.recommendation}
        </div>
        `
          )
          .join('')}
        `
            : ''
        }
        
        ${
          report.recommendations.length > 0
            ? `
        <h2>💡 Recomendaciones</h2>
        ${report.recommendations
          .map(
            rec => `
        <div class="recommendation priority-${rec.priority}">
            <strong>[${rec.priority.toUpperCase()}] ${rec.recommendation}</strong><br>
            <em>Acción:</em> ${rec.action}
        </div>
        `
          )
          .join('')}
        `
            : ''
        }
    </div>
</body>
</html>`;
}

// Ejecutar CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}
