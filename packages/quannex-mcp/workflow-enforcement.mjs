#!/usr/bin/env node

/**
 * QuanNex Workflow Enforcement Engine
 * Implementa reglas obligatorias para el uso de QuanNex en todas las tareas
 * Plan Maestro TaskDB - Integración QuanNex como estándar
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { qnxRunStart, qnxRunEnd, qnxUse, qnxFlag, COMPONENTS, ACTIONS } from './telemetry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class QuanNexWorkflowEnforcement {
  constructor(configPath = null) {
    this.config = this.loadConfig(configPath);
    this.violations = [];
    this.metrics = {
      orchestrator_share: 0,
      telemetry_coverage: 0,
      component_usage: 0,
      run_success_rate: 0,
    };

    // Iniciar run de enforcement
    this.runId = qnxRunStart('enforcement', 'quannex_workflow_enforcement_init');
  }

  /**
   * Cargar configuración desde YAML
   */
  loadConfig(configPath = null) {
    const defaultPath = path.join(__dirname, 'quannex-workflow-enforcement.yaml');
    const configFile = configPath || defaultPath;

    try {
      if (fs.existsSync(configFile)) {
        const configContent = fs.readFileSync(configFile, 'utf8');
        // Parsear YAML básico (en producción usar yaml parser)
        return this.parseYamlBasic(configContent);
      }
    } catch (error) {
      console.warn(
        '⚠️  No se pudo cargar configuración de enforcement, usando valores por defecto'
      );
    }

    // Configuración por defecto
    return {
      enforcement: {
        enabled: true,
        mode: 'mandatory',
        gates: ['orchestrator_usage', 'telemetry_tracking', 'component_instrumentation'],
      },
      thresholds: {
        orchestrator_share_min: 95,
        telemetry_coverage_min: 100,
        component_usage_min: 80,
        run_success_rate_min: 90,
      },
      mandatory_components: ['orchestrator', 'validator', 'codegen', 'planner', 'router'],
      mandatory_events: ['run_start', 'run_end', 'component_used'],
    };
  }

  /**
   * Parsear YAML básico (implementación simplificada)
   */
  parseYamlBasic(content) {
    // Implementación básica de parseo YAML
    // En producción usar una librería como js-yaml
    const config = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentKey = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#') || trimmed === '') continue;

      if (trimmed.endsWith(':')) {
        const sectionName = trimmed.slice(0, -1);
        config[sectionName] = {};
        currentSection = config[sectionName];
        currentKey = null;
      } else if (trimmed.includes(':') && currentSection) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();

        if (value === '') {
          currentKey = key.trim();
          currentSection[currentKey] = {};
        } else {
          // Parsear tipos básicos
          if (value === 'true') {
            currentSection[key.trim()] = true;
          } else if (value === 'false') {
            currentSection[key.trim()] = false;
          } else if (!isNaN(value)) {
            currentSection[key.trim()] = Number(value);
          } else {
            currentSection[key.trim()] = value;
          }
        }
      } else if (trimmed.startsWith('-') && currentSection && currentKey) {
        if (!Array.isArray(currentSection[currentKey])) {
          currentSection[currentKey] = [];
        }
        currentSection[currentKey].push(trimmed.slice(1).trim());
      }
    }

    return config;
  }

  /**
   * Verificar compliance con las reglas de QuanNex
   */
  async checkCompliance() {
    console.log('🔍 Verificando compliance con QuanNex Workflow Enforcement...');

    // Registrar inicio de verificación
    qnxUse(this.runId, COMPONENTS.VALIDATOR, ACTIONS.INVOKE, Date.now(), true, {
      operation: 'compliance_check',
    });

    const checks = [
      this.checkOrchestratorUsage(),
      this.checkTelemetryCoverage(),
      this.checkComponentInstrumentation(),
      this.checkRunLifecycle(),
    ];

    const results = await Promise.all(checks);

    // Calcular métricas generales
    this.calculateMetrics(results);

    // Verificar thresholds
    this.checkThresholds();

    // Generar reporte
    const report = this.generateReport();

    // Registrar finalización
    qnxUse(this.runId, COMPONENTS.VALIDATOR, ACTIONS.SUCCESS, Date.now(), true, {
      operation: 'compliance_check',
      violations_count: this.violations.length,
      overall_compliance: report.overall_compliance,
    });

    return report;
  }

  /**
   * Verificar uso del orchestrator
   */
  async checkOrchestratorUsage() {
    try {
      const telemetryFile = path.join(process.cwd(), '.reports/metrics/qnx-events.jsonl');

      if (!fs.existsSync(telemetryFile)) {
        this.violations.push({
          gate: 'orchestrator_usage',
          severity: 'error',
          message: 'No hay datos de telemetría disponibles',
          recommendation: 'Ejecutar tareas con QuanNex habilitado',
        });
        return { component: 'orchestrator', usage: 0, status: 'fail' };
      }

      const content = fs.readFileSync(telemetryFile, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      let orchestratorEvents = 0;
      let totalEvents = 0;

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          totalEvents++;

          if (event.event === 'component_used' && event.component === 'orchestrator') {
            orchestratorEvents++;
          }
        } catch (error) {
          continue;
        }
      }

      const orchestratorShare = totalEvents > 0 ? (orchestratorEvents / totalEvents) * 100 : 0;

      if (orchestratorShare < this.config.thresholds.orchestrator_share_min) {
        this.violations.push({
          gate: 'orchestrator_usage',
          severity: 'error',
          message: `Orchestrator share (${orchestratorShare.toFixed(1)}%) está por debajo del threshold (${this.config.thresholds.orchestrator_share_min}%)`,
          recommendation: 'Aumentar uso del orchestrator QuanNex en las tareas',
        });
      }

      return {
        component: 'orchestrator',
        usage: orchestratorShare,
        status:
          orchestratorShare >= this.config.thresholds.orchestrator_share_min ? 'pass' : 'fail',
      };
    } catch (error) {
      this.violations.push({
        gate: 'orchestrator_usage',
        severity: 'error',
        message: `Error verificando uso del orchestrator: ${error.message}`,
        recommendation: 'Revisar configuración de telemetría',
      });
      return { component: 'orchestrator', usage: 0, status: 'error' };
    }
  }

  /**
   * Verificar cobertura de telemetría
   */
  async checkTelemetryCoverage() {
    try {
      const telemetryFile = path.join(process.cwd(), '.reports/metrics/qnx-events.jsonl');

      if (!fs.existsSync(telemetryFile)) {
        this.violations.push({
          gate: 'telemetry_tracking',
          severity: 'error',
          message: 'No hay archivo de telemetría',
          recommendation: 'Habilitar telemetría QuanNex',
        });
        return { component: 'telemetry', coverage: 0, status: 'fail' };
      }

      const content = fs.readFileSync(telemetryFile, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      let mandatoryEvents = 0;
      const requiredEvents = new Set(
        this.config.mandatory_events || ['run_start', 'run_end', 'component_used']
      );

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          if (requiredEvents.has(event.event)) {
            mandatoryEvents++;
          }
        } catch (error) {
          continue;
        }
      }

      const coverage = lines.length > 0 ? (mandatoryEvents / lines.length) * 100 : 0;

      if (coverage < this.config.thresholds.telemetry_coverage_min) {
        this.violations.push({
          gate: 'telemetry_tracking',
          severity: 'error',
          message: `Cobertura de telemetría (${coverage.toFixed(1)}%) está por debajo del threshold (${this.config.thresholds.telemetry_coverage_min}%)`,
          recommendation: 'Aumentar instrumentación con eventos obligatorios',
        });
      }

      return {
        component: 'telemetry',
        coverage,
        status: coverage >= this.config.thresholds.telemetry_coverage_min ? 'pass' : 'fail',
      };
    } catch (error) {
      this.violations.push({
        gate: 'telemetry_tracking',
        severity: 'error',
        message: `Error verificando telemetría: ${error.message}`,
        recommendation: 'Revisar configuración de telemetría',
      });
      return { component: 'telemetry', coverage: 0, status: 'error' };
    }
  }

  /**
   * Verificar instrumentación de componentes
   */
  async checkComponentInstrumentation() {
    try {
      const telemetryFile = path.join(process.cwd(), '.reports/metrics/qnx-events.jsonl');

      if (!fs.existsSync(telemetryFile)) {
        this.violations.push({
          gate: 'component_instrumentation',
          severity: 'error',
          message: 'No hay datos de telemetría para verificar componentes',
          recommendation: 'Habilitar telemetría QuanNex',
        });
        return { component: 'instrumentation', coverage: 0, status: 'fail' };
      }

      const content = fs.readFileSync(telemetryFile, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      const usedComponents = new Set();
      const requiredComponents = new Set(this.config.mandatory_components);

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          if (event.event === 'component_used' && event.component) {
            usedComponents.add(event.component);
          }
        } catch (error) {
          continue;
        }
      }

      let instrumentedComponents = 0;
      for (const component of requiredComponents) {
        if (usedComponents.has(component)) {
          instrumentedComponents++;
        }
      }

      const coverage = (instrumentedComponents / requiredComponents.size) * 100;

      if (coverage < this.config.thresholds.component_usage_min) {
        this.violations.push({
          gate: 'component_instrumentation',
          severity: 'error',
          message: `Instrumentación de componentes (${coverage.toFixed(1)}%) está por debajo del threshold (${this.config.thresholds.component_usage_min}%)`,
          recommendation: 'Instrumentar todos los componentes obligatorios',
        });
      }

      return {
        component: 'instrumentation',
        coverage,
        status: coverage >= this.config.thresholds.component_usage_min ? 'pass' : 'fail',
      };
    } catch (error) {
      this.violations.push({
        gate: 'component_instrumentation',
        severity: 'error',
        message: `Error verificando instrumentación: ${error.message}`,
        recommendation: 'Revisar configuración de telemetría',
      });
      return { component: 'instrumentation', coverage: 0, status: 'error' };
    }
  }

  /**
   * Verificar ciclo de vida de runs
   */
  async checkRunLifecycle() {
    try {
      const telemetryFile = path.join(process.cwd(), '.reports/metrics/qnx-events.jsonl');

      if (!fs.existsSync(telemetryFile)) {
        this.violations.push({
          gate: 'run_lifecycle',
          severity: 'error',
          message: 'No hay datos de telemetría para verificar runs',
          recommendation: 'Habilitar telemetría QuanNex',
        });
        return { component: 'run_lifecycle', success_rate: 0, status: 'fail' };
      }

      const content = fs.readFileSync(telemetryFile, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      const runs = new Map();

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          if (!runs.has(event.run_id)) {
            runs.set(event.run_id, { start: false, end: false, success: false });
          }

          const run = runs.get(event.run_id);

          if (event.event === 'run_start') {
            run.start = true;
          } else if (event.event === 'run_end') {
            run.end = true;
            run.success = event.ok === true;
          }
        } catch (error) {
          continue;
        }
      }

      let successfulRuns = 0;
      let totalRuns = 0;

      for (const [runId, run] of runs) {
        if (run.start && run.end) {
          totalRuns++;
          if (run.success) {
            successfulRuns++;
          }
        }
      }

      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      if (successRate < this.config.thresholds.run_success_rate_min) {
        this.violations.push({
          gate: 'run_lifecycle',
          severity: 'error',
          message: `Tasa de éxito de runs (${successRate.toFixed(1)}%) está por debajo del threshold (${this.config.thresholds.run_success_rate_min}%)`,
          recommendation: 'Mejorar estabilidad de runs QuanNex',
        });
      }

      return {
        component: 'run_lifecycle',
        success_rate: successRate,
        status: successRate >= this.config.thresholds.run_success_rate_min ? 'pass' : 'fail',
      };
    } catch (error) {
      this.violations.push({
        gate: 'run_lifecycle',
        severity: 'error',
        message: `Error verificando ciclo de vida: ${error.message}`,
        recommendation: 'Revisar configuración de telemetría',
      });
      return { component: 'run_lifecycle', success_rate: 0, status: 'error' };
    }
  }

  /**
   * Calcular métricas generales
   */
  calculateMetrics(results) {
    this.metrics.orchestrator_share = results[0]?.usage || 0;
    this.metrics.telemetry_coverage = results[1]?.coverage || 0;
    this.metrics.component_usage = results[2]?.coverage || 0;
    this.metrics.run_success_rate = results[3]?.success_rate || 0;
  }

  /**
   * Verificar thresholds
   */
  checkThresholds() {
    const thresholds = this.config.thresholds;

    if (this.metrics.orchestrator_share < thresholds.orchestrator_share_min) {
      qnxFlag(this.runId, 'gate_violation', {
        gate: 'orchestrator_usage',
        metric: 'orchestrator_share',
        value: this.metrics.orchestrator_share,
        threshold: thresholds.orchestrator_share_min,
      });
    }

    if (this.metrics.telemetry_coverage < thresholds.telemetry_coverage_min) {
      qnxFlag(this.runId, 'gate_violation', {
        gate: 'telemetry_tracking',
        metric: 'telemetry_coverage',
        value: this.metrics.telemetry_coverage,
        threshold: thresholds.telemetry_coverage_min,
      });
    }
  }

  /**
   * Generar reporte de compliance
   */
  generateReport() {
    const overallCompliance =
      this.violations.length === 0 ? 100 : Math.max(0, 100 - this.violations.length * 20);

    const report = {
      timestamp: new Date().toISOString(),
      run_id: this.runId,
      overall_compliance: overallCompliance,
      metrics: this.metrics,
      violations: this.violations,
      recommendations: this.generateRecommendations(),
      status: overallCompliance >= 80 ? 'pass' : 'fail',
    };

    // Finalizar run de enforcement
    qnxRunEnd(this.runId, report.status === 'pass', {
      overall_compliance: overallCompliance,
      violations_count: this.violations.length,
      metrics: this.metrics,
    });

    return report;
  }

  /**
   * Generar recomendaciones basadas en violaciones
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.orchestrator_share < this.config.thresholds.orchestrator_share_min) {
      recommendations.push({
        priority: 'high',
        category: 'orchestrator_usage',
        recommendation: 'Instrumentar todas las tareas con QuanNex Orchestrator',
        action: 'Agregar qnxRunStart(), qnxUse(), qnxRunEnd() a todas las tareas',
      });
    }

    if (this.metrics.telemetry_coverage < this.config.thresholds.telemetry_coverage_min) {
      recommendations.push({
        priority: 'high',
        category: 'telemetry_tracking',
        recommendation: 'Aumentar cobertura de telemetría',
        action: 'Agregar eventos obligatorios a todas las operaciones',
      });
    }

    if (this.metrics.component_usage < this.config.thresholds.component_usage_min) {
      recommendations.push({
        priority: 'medium',
        category: 'component_instrumentation',
        recommendation: 'Instrumentar componentes obligatorios',
        action: 'Agregar qnxUse() para todos los componentes requeridos',
      });
    }

    return recommendations;
  }
}

export default QuanNexWorkflowEnforcement;
