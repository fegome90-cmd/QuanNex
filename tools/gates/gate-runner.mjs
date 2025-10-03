#!/usr/bin/env node
/**
 * 🚪 RUNNER DE GATES ANTI-ALUCINACIÓN
 *
 * Valida calidad, citas, trazas de herramientas y determinismo
 * para detectar alucinaciones y baja calidad en outputs de IA.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

class GateRunner {
  constructor() {
    this.configPath = 'tools/gates/gates.config.json';
    this.reportsDir = '.reports/gates';
    this.cacheDir = '.cache/gates';
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.reportsDir, this.cacheDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadConfig() {
    try {
      return JSON.parse(readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      console.error(`❌ Error cargando configuración: ${error.message}`);
      process.exit(1);
    }
  }

  loadReport(reportPath) {
    try {
      return JSON.parse(readFileSync(reportPath, 'utf8'));
    } catch (error) {
      console.error(`❌ Error cargando reporte: ${error.message}`);
      process.exit(1);
    }
  }

  // Helper functions
  hasCitations(text) {
    return /\b(cite:\[.*?\]|https?:\/\/\S+|referencia:|fuente:|según|según\s+el\s+documento)/i.test(
      text
    );
  }

  looksGeneric(text) {
    return /\b(como IA|no puedo acceder|no tengo acceso|no dispongo|no tengo información|no puedo verificar)\b/i.test(
      text
    );
  }

  percentDiff(a, b) {
    const al = a.split('\n');
    const bl = b.split('\n');
    const max = Math.max(al.length, bl.length);
    let diff = 0;

    for (let i = 0; i < max; i++) {
      if ((al[i] || '') !== (bl[i] || '')) diff++;
    }

    return max ? (diff / max) * 100 : 0;
  }

  sha256(text) {
    return createHash('sha256').update(text, 'utf8').digest('hex');
  }

  // Gate implementations
  checkCitationsGate(report, config) {
    if (!config.citations)
      return { name: 'CitationsGate', pass: true, level: 'SKIP', msg: 'Deshabilitado' };

    const hasCitations = this.hasCitations(report.output);
    const isGeneric = this.looksGeneric(report.output);
    const pass = hasCitations && !isGeneric;

    return {
      name: 'CitationsGate',
      pass,
      level: pass ? 'INFO' : 'ERROR',
      msg: pass ? 'OK' : 'Salida factual sin citas o con frases genéricas',
    };
  }

  checkToolTraceGate(report, config) {
    if (!config.toolTrace)
      return { name: 'ToolTraceGate', pass: true, level: 'SKIP', msg: 'Deshabilitado' };

    let pass = false;
    let msg = 'No se encontró traza de herramientas';

    try {
      const tracePath = join('.reports', 'tools', `${report.taskId}.json`);
      if (existsSync(tracePath)) {
        const trace = JSON.parse(readFileSync(tracePath, 'utf8'));
        pass = Array.isArray(trace.tools) && trace.tools.length > 0 && trace.tools.every(t => t.ok);
        msg = pass ? 'OK' : 'Trazas faltantes o con errores';
      }
    } catch (error) {
      msg = `Error leyendo traza: ${error.message}`;
    }

    return {
      name: 'ToolTraceGate',
      pass,
      level: pass ? 'INFO' : 'ERROR',
      msg,
    };
  }

  checkSchemaGate(report, config) {
    if (!config.schema)
      return { name: 'SchemaGate', pass: true, level: 'SKIP', msg: 'Deshabilitado' };

    const schemas = {
      research: ['summary', 'findings', 'limitations', 'citations'],
      'coding-plan': ['goal', 'steps', 'risks', 'tests'],
      'ops-runbook': ['context', 'steps', 'rollback', 'owner'],
      'linting-optimization': ['analysis', 'changes', 'metrics', 'recommendations'],
      'security-audit': ['vulnerabilities', 'recommendations', 'severity', 'remediation'],
    };

    const required = schemas[report.type] || [];
    const missing = required.filter(key => !new RegExp(`\\b(${key})\\b`, 'i').test(report.output));

    return {
      name: 'SchemaGate',
      pass: missing.length === 0,
      level: missing.length ? 'ERROR' : 'INFO',
      msg: missing.length ? `Faltan secciones: ${missing.join(', ')}` : 'OK',
    };
  }

  checkDeterminismGate(report, config) {
    if (!config.determinism && !report?.metadata?.deterministic) {
      return { name: 'DeterminismGate', pass: true, level: 'SKIP', msg: 'Deshabilitado' };
    }

    const cachePath = join(this.cacheDir, `${report.taskId}.hash`);
    const currentHash = this.sha256(report.output);

    let pass = true;
    let msg = 'OK';

    try {
      if (existsSync(cachePath)) {
        const previousOutput = readFileSync(cachePath, 'utf8');
        const drift = this.percentDiff(previousOutput, report.output);
        pass = drift <= 15; // <=15% líneas distintas
        msg = pass ? `Drift ${drift.toFixed(1)}%` : `Drift alto: ${drift.toFixed(1)}% (>15%)`;
      } else {
        msg = 'Baseline creado';
      }
    } catch (error) {
      msg = 'Primera ejecución';
    }

    // Guardar hash actual
    writeFileSync(cachePath, report.output, 'utf8');

    return {
      name: 'DeterminismGate',
      pass,
      level: pass ? 'INFO' : 'WARN',
      msg,
    };
  }

  checkQualityGate(report, config) {
    if (!config.quality)
      return { name: 'QualityGate', pass: true, level: 'SKIP', msg: 'Deshabilitado' };

    const text = report.output || '';
    const hasList = /(^|\n)\s*[-*]\s+\S+/.test(text) || /\n\d+\.\s+\S+/.test(text);
    const hasNumbers = /\b\d{1,4}(\.\d+)?\b/.test(text);
    const tooShort = text.trim().split(/\s+/).length < 60; // mínimo ~60 palabras
    const hasStructure = /#{1,6}\s+\S+/.test(text) || /\*\*.*?\*\*/.test(text);

    const pass = hasList && hasNumbers && !tooShort && hasStructure;
    const level = pass ? 'INFO' : report.type === 'research' ? 'ERROR' : 'WARN';

    return {
      name: 'QualityGate',
      pass,
      level,
      msg: pass
        ? 'OK'
        : 'Señales de baja calidad (sin listas/números/estructura o demasiado corto)',
    };
  }

  run(reportPath) {
    console.log('🚪 Ejecutando gates anti-alucinación...');

    const config = this.loadConfig();
    const report = this.loadReport(reportPath);

    const typeConfig = config[report.type] || config.default;

    console.log(`📋 Tipo de tarea: ${report.type}`);
    console.log(`🎯 Configuración: ${JSON.stringify(typeConfig, null, 2)}`);

    const results = [
      this.checkCitationsGate(report, typeConfig),
      this.checkToolTraceGate(report, typeConfig),
      this.checkSchemaGate(report, typeConfig),
      this.checkDeterminismGate(report, typeConfig),
      this.checkQualityGate(report, typeConfig),
    ];

    // Guardar resultados
    const outputPath = join(this.reportsDir, `${report.taskId}-gates.json`);
    const gateReport = {
      taskId: report.taskId,
      type: report.type,
      timestamp: new Date().toISOString(),
      results,
    };

    writeFileSync(outputPath, JSON.stringify(gateReport, null, 2));

    // Mostrar resultados
    console.log('\n🎯 RESULTADOS DE GATES:');
    results.forEach(result => {
      const icon = result.pass ? '✅' : result.level === 'ERROR' ? '❌' : '⚠️';
      console.log(`${icon} ${result.name}: ${result.msg}`);
    });

    // Determinar resultado final
    const failures = results.filter(r => r.level === 'ERROR' && !r.pass);
    const warnings = results.filter(r => r.level === 'WARN' && !r.pass);

    if (failures.length > 0) {
      console.log('\n❌ GATES FAIL: Errores críticos detectados');
      failures.forEach(f => console.log(`  - ${f.name}: ${f.msg}`));
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log('\n⚠️  GATES WARN: Advertencias detectadas');
      warnings.forEach(w => console.log(`  - ${w.name}: ${w.msg}`));
      process.exit(0); // Warnings no bloquean
    } else {
      console.log('\n✅ GATES PASS: Todos los gates pasaron');
      process.exit(0);
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const reportPath = process.argv[2];
  if (!reportPath) {
    console.error('Uso: node tools/gates/gate-runner.mjs <task-report.json>');
    process.exit(2);
  }

  const runner = new GateRunner();
  runner.run(reportPath);
}

export default GateRunner;
