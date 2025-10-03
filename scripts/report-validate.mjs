#!/usr/bin/env node
/**
 * Report Validation Gate Anti-Manipulación
 * Valida que los reportes cumplan el esquema JSON estricto
 * Previene manipulación de datos de reportes
 */

import fs from 'fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function fail(msg) {
  console.error(`❌ [REPORT-VALIDATE] ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`🔍 [REPORT-VALIDATE] ${msg}`);
}

async function validateReportSchema(reportPath, schemaPath) {
  try {
    // Cargar esquema
    if (!fs.existsSync(schemaPath)) {
      fail(`Esquema no encontrado: ${schemaPath}`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // Cargar reporte
    if (!fs.existsSync(reportPath)) {
      fail(`Reporte no encontrado: ${reportPath}`);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    // Configurar validador
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      verbose: true,
    });

    addFormats(ajv);

    const validate = ajv.compile(schema);

    // Validar reporte
    const isValid = validate(report);

    if (!isValid) {
      const errors = validate.errors
        .map(err => {
          const path = err.instancePath || err.schemaPath;
          return `  ${path}: ${err.message}`;
        })
        .join('\n');

      fail(`Reporte no cumple esquema:\n${errors}`);
    }

    log(`✅ Reporte válido: ${reportPath}`);
    return report;
  } catch (error) {
    fail(`Error validando reporte: ${error.message}`);
  }
}

function validateReportIntegrity(report) {
  log('Validando integridad de datos del reporte...');

  // Validar que los números sean consistentes
  if (report.summary) {
    const { total_tests, passed, failed } = report.summary;

    if (passed + failed !== total_tests) {
      fail(`Inconsistencia en summary: ${passed} + ${failed} ≠ ${total_tests}`);
    }

    const expectedSuccessRate = Math.round((passed / total_tests) * 100);
    const actualSuccessRate = parseInt(report.summary.success_rate.replace('%', ''));

    if (expectedSuccessRate !== actualSuccessRate) {
      fail(
        `Inconsistencia en success_rate: esperado ${expectedSuccessRate}%, actual ${actualSuccessRate}%`
      );
    }
  }

  // Validar que el timestamp sea reciente (no más de 1 hora)
  if (report.timestamp) {
    const reportTime = new Date(report.timestamp);
    const now = new Date();
    const diffHours = (now - reportTime) / (1000 * 60 * 60);

    if (diffHours > 1) {
      fail(`Timestamp muy antiguo: ${report.timestamp} (${diffHours.toFixed(1)} horas atrás)`);
    }
  }

  // Validar que los tests booleanos sean consistentes
  if (report.tests) {
    const testValues = Object.values(report.tests);
    const passedTests = testValues.filter(Boolean).length;
    const totalTests = testValues.length;

    if (report.summary && passedTests !== report.summary.passed) {
      fail(
        `Inconsistencia en tests: ${passedTests} tests pasaron pero summary dice ${report.summary.passed}`
      );
    }
  }

  // Validar rangos de métricas
  if (report.performance) {
    const perf = report.performance;

    if (perf.response_time_p50_ms && perf.response_time_p95_ms && perf.response_time_p99_ms) {
      if (
        perf.response_time_p50_ms > perf.response_time_p95_ms ||
        perf.response_time_p95_ms > perf.response_time_p99_ms
      ) {
        fail('Percentiles de latencia inconsistentes: p50 > p95 o p95 > p99');
      }
    }

    if (perf.response_time_p95_ms && perf.response_time_p95_ms > 10000) {
      log(`⚠️ Latencia p95 muy alta: ${perf.response_time_p95_ms}ms`);
    }
  }

  // Validar métricas de seguridad
  if (report.security) {
    const sec = report.security;

    if (sec.files_scanned === 0 && sec.status === 'ok') {
      fail('Inconsistencia: 0 archivos escaneados pero status OK');
    }

    if (sec.vulnerabilities_found > 0 && sec.status === 'ok') {
      log(`⚠️ Vulnerabilidades encontradas pero status OK: ${sec.vulnerabilities_found}`);
    }
  }

  log('✅ Integridad de datos validada');
}

function validateReportCompleteness(report) {
  log('Validando completitud del reporte...');

  const requiredSections = ['performance', 'security', 'reliability', 'maintainability'];

  for (const section of requiredSections) {
    if (!report[section]) {
      fail(`Sección requerida faltante: ${section}`);
    }

    if (!report[section].status) {
      fail(`Status faltante en sección: ${section}`);
    }

    if (!['ok', 'warn', 'crit'].includes(report[section].status)) {
      fail(`Status inválido en ${section}: ${report[section].status}`);
    }
  }

  // Validar que al menos una sección tenga datos detallados
  const sectionsWithData = requiredSections.filter(section => {
    const data = report[section];
    return Object.keys(data).length > 1; // Más que solo 'status'
  });

  if (sectionsWithData.length === 0) {
    fail('Reporte incompleto: todas las secciones solo tienen status');
  }

  log(
    `✅ Completitud validada: ${sectionsWithData.length}/${requiredSections.length} secciones con datos`
  );
}

async function main() {
  try {
    log('🚀 Iniciando validación de reportes...');

    // Buscar reportes recientes
    const reportPaths = [
      'reports/e2e-test-report.json',
      'reports/last-report.json',
      'artifacts/last-report.json',
    ];

    const schemaPath = 'scripts/report-schema.json';

    let reportFound = false;

    for (const reportPath of reportPaths) {
      if (fs.existsSync(reportPath)) {
        log(`Validando reporte: ${reportPath}`);

        const report = await validateReportSchema(reportPath, schemaPath);
        validateReportIntegrity(report);
        validateReportCompleteness(report);

        reportFound = true;
        break;
      }
    }

    if (!reportFound) {
      fail(`No se encontraron reportes en: ${reportPaths.join(', ')}`);
    }

    log('🎉 Validación de reportes completada exitosamente');
    log('✅ Reporte cumple esquema estricto y datos son consistentes');
  } catch (error) {
    fail(`Error durante validación: ${error.message}`);
  }
}

main();
