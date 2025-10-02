#!/usr/bin/env node
/**
 * fsm-v2.js
 * FSM corto + checkpoints para reproducibilidad
 * PLAN→EXEC→CRITIC?→POLICY→DONE
 * Meta: reproducibilidad (re-run = mismo resultado ±1 token)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'node:path';
import { createHandoff, ROLES } from './handoff-consolidated.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FSMV2 {
  constructor() {
    this.featureFlag = process.env.FEATURE_FSM_V2 === '1';
    this.canaryPercentage = parseInt(process.env.CANARY_PERCENTAGE) || 20;
    this.checkpointsDir = path.join(__dirname, '..', '.quannex', 'checkpoints');
    this.ensureCheckpointsDir();
    
    this.states = {
      PLAN: 'plan',
      EXEC: 'exec',
      CRITIC: 'critic',
      POLICY: 'policy',
      DONE: 'done',
      ROLLBACK: 'rollback'
    };
    
    this.currentState = this.states.PLAN;
    this.executionId = null;
    this.checkpoints = new Map();
    this.performanceBaseline = null;
  }

  ensureCheckpointsDir() {
    if (!fs.existsSync(this.checkpointsDir)) {
      fs.mkdirSync(this.checkpointsDir, { recursive: true });
    }
  }

  async execute(request) {
    if (!this.featureFlag) {
      console.log('⚠️  FSM v2 deshabilitado - usando FSM v1');
      return await this.executeV1(request);
    }

    // Verificar si es canary
    const isCanary = this.shouldUseCanary(request);
    if (isCanary) {
      console.log(`🎯 Canary ${this.canaryPercentage}% - usando FSM v2`);
    } else {
      console.log('📊 Control group - usando FSM v1');
      return await this.executeV1(request);
    }

    this.executionId = this.generateExecutionId();
    console.log(`🚀 Iniciando FSM v2 - Execution ID: ${this.executionId}`);

    try {
      // Estado PLAN
      const planResult = await this.executePlan(request);
      await this.createCheckpoint('plan', planResult);

      // Estado EXEC
      const execResult = await this.executeExec(request, planResult);
      await this.createCheckpoint('exec', execResult);

      // Estado CRITIC (condicional)
      let criticResult = null;
      if (this.needsCritic(execResult)) {
        criticResult = await this.executeCritic(request, execResult);
        await this.createCheckpoint('critic', criticResult);
      }

      // Estado POLICY
      const policyResult = await this.executePolicy(request, execResult, criticResult);
      await this.createCheckpoint('policy', policyResult);

      // Verificar performance antes de DONE
      const performanceCheck = await this.checkPerformance();
      if (!performanceCheck.passed) {
        console.log('⚠️  Performance degradada - iniciando rollback');
        return await this.executeRollback(request, performanceCheck);
      }

      // Estado DONE
      const doneResult = await this.executeDone(request, policyResult);
      await this.createCheckpoint('done', doneResult);

      console.log('✅ FSM v2 completado exitosamente');
      return doneResult;

    } catch (error) {
      console.error('❌ Error en FSM v2:', error.message);
      return await this.executeRollback(request, { error: error.message });
    }
  }

  async executePlan(request) {
    console.log('📋 PLAN: Generando plan de ejecución...');
    
    // SEMANA 2: Handoff a engineer (planner)
    const env = { requestId: this.executionId, payload: request };
    const handoffResult = handoff(env, {
      to: ROLES.ENGINEER,
      gate: 'planner',
      reason: 'build-plan',
      wants: ['plan'],
      ttl_ms: 15000
    });
    
    const plan = {
      id: this.executionId,
      timestamp: new Date().toISOString(),
      request: this.sanitizeRequest(request),
      steps: this.generatePlanSteps(request),
      estimatedTokens: this.estimateTokens(request),
      checkpoints: [],
      handoff: handoffResult
    };

    // Simular planificación
    await this.simulateWork(200);
    
    console.log(`✅ Plan generado: ${plan.steps.length} pasos, ~${plan.estimatedTokens} tokens`);
    return plan;
  }

  async executeExec(request, plan) {
    console.log('⚡ EXEC: Ejecutando plan...');
    
    const results = [];
    let totalTokens = 0;
    
    for (const step of plan.steps) {
      console.log(`  🔧 Ejecutando: ${step.name}`);
      
      const stepResult = await this.executeStep(step, request);
      results.push(stepResult);
      totalTokens += stepResult.tokens || 0;
      
      // Checkpoint intermedio
      await this.createCheckpoint(`exec_step_${step.id}`, stepResult);
    }

    const execResult = {
      id: this.executionId,
      timestamp: new Date().toISOString(),
      steps: results,
      totalTokens,
      actualTokens: totalTokens,
      tokenVariance: Math.abs(totalTokens - plan.estimatedTokens),
      success: results.every(r => r.success)
    };

    console.log(`✅ Ejecución completada: ${totalTokens} tokens (varianza: ${execResult.tokenVariance})`);
    return execResult;
  }

  async executeCritic(request, execResult) {
    console.log('🔍 CRITIC: Analizando resultados...');
    
    // SEMANA 2: Handoff a teacher (critic)
    const env = { requestId: this.executionId, payload: request };
    const handoffResult = handoff(env, {
      to: ROLES.TEACHER,
      gate: 'critic',
      reason: 'review-patch',
      wants: ['critique'],
      ttl_ms: 15000
    });
    
    const criticResult = {
      id: this.executionId,
      timestamp: new Date().toISOString(),
      analysis: this.analyzeExecution(execResult),
      recommendations: this.generateRecommendations(execResult),
      needsRerun: this.needsRerun(execResult),
      confidence: this.calculateConfidence(execResult),
      handoff: handoffResult
    };

    // Simular análisis
    await this.simulateWork(300);
    
    console.log(`✅ Análisis completado: confianza ${criticResult.confidence}%, rerun=${criticResult.needsRerun}`);
    return criticResult;
  }

  async executePolicy(request, execResult, criticResult) {
    console.log('🛡️ POLICY: Aplicando políticas...');
    
    // SEMANA 2: Handoff a rules (policy)
    const env = { requestId: this.executionId, payload: request };
    const handoffResult = handoff(env, {
      to: ROLES.RULES,
      gate: 'policy_gate',
      reason: 'guardrails',
      wants: ['policy_ok'],
      ttl_ms: 10000
    });
    
    const policyResult = {
      id: this.executionId,
      timestamp: new Date().toISOString(),
      policies: this.applyPolicies(execResult, criticResult),
      approved: this.isApproved(execResult, criticResult),
      riskLevel: this.calculateRiskLevel(execResult, criticResult),
      rollbackTriggers: this.getRollbackTriggers(execResult, criticResult),
      handoff: handoffResult
    };

    // Simular validación de políticas
    await this.simulateWork(150);
    
    console.log(`✅ Políticas aplicadas: aprobado=${policyResult.approved}, riesgo=${policyResult.riskLevel}`);
    return policyResult;
  }

  async executeDone(request, policyResult) {
    console.log('🎉 DONE: Finalizando ejecución...');
    
    const doneResult = {
      id: this.executionId,
      timestamp: new Date().toISOString(),
      success: policyResult.approved,
      finalState: this.states.DONE,
      performance: await this.getPerformanceMetrics(),
      reproducibility: this.calculateReproducibility(),
      summary: this.generateSummary(policyResult)
    };

    // Guardar resultado final
    await this.saveFinalResult(doneResult);
    
    console.log('✅ FSM v2 finalizado exitosamente');
    return doneResult;
  }

  async executeRollback(request, reason) {
    console.log('🔄 ROLLBACK: Revirtiendo cambios...');
    
    const rollbackResult = {
      id: this.executionId,
      timestamp: new Date().toISOString(),
      reason: reason,
      rollbackSteps: await this.performRollback(),
      success: true,
      finalState: this.states.ROLLBACK
    };

    console.log('✅ Rollback completado');
    return rollbackResult;
  }

  // Métodos de utilidad
  shouldUseCanary(request) {
    // Usar hash determinístico para canary
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex');
    
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const percentage = (hashValue % 100) + 1;
    
    return percentage <= this.canaryPercentage;
  }

  generateExecutionId() {
    return `fsm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  sanitizeRequest(request) {
    // Remover datos sensibles para checkpoints
    const sanitized = { ...request };
    delete sanitized.tokens;
    delete sanitized.sensitive;
    return sanitized;
  }

  generatePlanSteps(request) {
    // Generar pasos determinísticos basados en request
    const steps = [
      { id: 'step_1', name: 'analyze_request', type: 'analysis' },
      { id: 'step_2', name: 'prepare_context', type: 'preparation' },
      { id: 'step_3', name: 'execute_action', type: 'execution' },
      { id: 'step_4', name: 'validate_result', type: 'validation' }
    ];
    
    return steps;
  }

  estimateTokens(request) {
    // Estimación determinística de tokens
    const baseTokens = 1000;
    const complexityMultiplier = request.complexity || 1;
    return Math.floor(baseTokens * complexityMultiplier);
  }

  async executeStep(step, request) {
    // Simular ejecución de paso
    await this.simulateWork(100 + Math.random() * 200);
    
    return {
      id: step.id,
      name: step.name,
      success: true,
      tokens: Math.floor(50 + Math.random() * 100),
      timestamp: new Date().toISOString()
    };
  }

  analyzeExecution(execResult) {
    return {
      tokenAccuracy: execResult.tokenVariance < 10 ? 'high' : 'medium',
      executionTime: 'normal',
      quality: 'good',
      issues: []
    };
  }

  generateRecommendations(execResult) {
    return [
      'Optimizar token usage',
      'Mejorar precisión de estimación'
    ];
  }

  needsRerun(execResult) {
    return execResult.tokenVariance > 50;
  }

  calculateConfidence(execResult) {
    const baseConfidence = 85;
    const tokenPenalty = Math.min(execResult.tokenVariance / 10, 20);
    return Math.max(baseConfidence - tokenPenalty, 50);
  }

  applyPolicies(execResult, criticResult) {
    return {
      tokenPolicy: execResult.totalTokens < 5000,
      qualityPolicy: criticResult.confidence > 70,
      performancePolicy: true
    };
  }

  isApproved(execResult, criticResult) {
    const policies = this.applyPolicies(execResult, criticResult);
    return Object.values(policies).every(p => p === true);
  }

  calculateRiskLevel(execResult, criticResult) {
    if (criticResult.confidence > 80) return 'low';
    if (criticResult.confidence > 60) return 'medium';
    return 'high';
  }

  getRollbackTriggers(execResult, criticResult) {
    return [
      'performance_degradation',
      'high_token_variance',
      'low_confidence'
    ];
  }

  needsCritic(execResult) {
    return execResult.tokenVariance > 20 || !execResult.success;
  }

  async checkPerformance() {
    // Verificar performance contra baseline
    const currentMetrics = await this.getPerformanceMetrics();
    
    if (!this.performanceBaseline) {
      this.performanceBaseline = currentMetrics;
      return { passed: true, reason: 'baseline_established' };
    }

    const p95Increase = ((currentMetrics.p95 - this.performanceBaseline.p95) / this.performanceBaseline.p95) * 100;
    const errorIncrease = currentMetrics.errorRate - this.performanceBaseline.errorRate;

    if (p95Increase > 15 || errorIncrease > 1) {
      return { 
        passed: false, 
        reason: 'performance_degraded',
        p95Increase,
        errorIncrease
      };
    }

    return { passed: true, reason: 'performance_ok' };
  }

  async getPerformanceMetrics() {
    // Simular métricas de performance
    return {
      p95: 1200 + Math.random() * 200,
      errorRate: Math.random() * 2,
      throughput: 50 + Math.random() * 20
    };
  }

  calculateReproducibility() {
    // Calcular reproducibilidad basada en checkpoints
    const checkpointCount = this.checkpoints.size;
    return Math.min(checkpointCount * 20, 100);
  }

  generateSummary(policyResult) {
    return {
      executionId: this.executionId,
      approved: policyResult.approved,
      riskLevel: policyResult.riskLevel,
      reproducibility: this.calculateReproducibility(),
      timestamp: new Date().toISOString()
    };
  }

  async createCheckpoint(name, data) {
    const checkpoint = {
      id: `${this.executionId}_${name}`,
      timestamp: new Date().toISOString(),
      data: data,
      hash: crypto.createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex')
    };

    this.checkpoints.set(name, checkpoint);
    
    // Guardar en disco
    const filePath = path.join(this.checkpointsDir, `${checkpoint.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
    
    console.log(`💾 Checkpoint creado: ${name}`);
  }

  async performRollback() {
    const rollbackSteps = [];
    
    // Simular pasos de rollback
    for (const [name, checkpoint] of this.checkpoints) {
      rollbackSteps.push({
        checkpoint: name,
        action: 'restore',
        success: true
      });
    }
    
    return rollbackSteps;
  }

  async saveFinalResult(result) {
    const filePath = path.join(this.checkpointsDir, `${this.executionId}_final.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  }

  async simulateWork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeV1(request) {
    // Simular FSM v1
    console.log('🔄 Ejecutando FSM v1 (fallback)');
    await this.simulateWork(1000);
    
    return {
      success: true,
      version: 'v1',
      timestamp: new Date().toISOString()
    };
  }

  getMetrics() {
    return {
      featureEnabled: this.featureFlag,
      canaryPercentage: this.canaryPercentage,
      checkpointsCount: this.checkpoints.size,
      currentState: this.currentState,
      executionId: this.executionId
    };
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const fsm = new FSMV2();
  
  // Test con request de ejemplo
  const testRequest = {
    intent: 'refactor',
    complexity: 1.5,
    artifacts: ['src/core/utils.js']
  };
  
  console.log('🧪 Probando FSM v2...');
  fsm.execute(testRequest).then(result => {
    console.log('✅ Resultado:', result);
    console.log('📊 Métricas:', fsm.getMetrics());
  }).catch(error => {
    console.error('❌ Error:', error);
  });
}

export default FSMV2;
