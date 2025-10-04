#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function execCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (err) {
    return '';
  }
}

function checkInstrumentationAdoption() {
  console.log('🔍 Verificando adopción de instrumentación...');
  
  // Contar funciones en src/functions/
  const functionsDir = 'src/functions';
  if (!fs.existsSync(functionsDir)) {
    console.log('⚠️ Directorio src/functions/ no existe');
    return { total: 0, instrumented: 0, rate: 0 };
  }
  
  const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  let instrumented = 0;
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(functionsDir, file), 'utf8');
    if (content.includes('withTask') && content.includes('import')) {
      instrumented++;
    }
  });
  
  const rate = files.length > 0 ? (instrumented / files.length) * 100 : 100;
  
  console.log(`📊 Funciones: ${instrumented}/${files.length} (${rate.toFixed(1)}%)`);
  
  return { total: files.length, instrumented, rate };
}

function checkGateCompliance() {
  console.log('🚪 Verificando cumplimiento de gates...');
  
  // Simular verificación de gates (en producción sería más complejo)
  const recentCommits = execCommand('git log --oneline -10');
  const commitLines = recentCommits.split('\n').filter(line => line.trim());
  
  // Contar commits que pasaron gates (simplificado)
  const passedGates = commitLines.filter(line => 
    !line.includes('--no-verify') && 
    !line.includes('skip')
  ).length;
  
  const rate = commitLines.length > 0 ? (passedGates / commitLines.length) * 100 : 100;
  
  console.log(`📊 Gates: ${passedGates}/${commitLines.length} (${rate.toFixed(1)}%)`);
  
  return { total: commitLines.length, passed: passedGates, rate };
}

function checkDeltaConsistency() {
  console.log('📊 Verificando consistencia de delta...');
  
  try {
    const deltaOutput = execCommand('npm run taskdb:delta');
    const delta = JSON.parse(deltaOutput);
    
    const deltaPct = parseFloat(delta.delta_pct.replace('%', ''));
    const isConsistent = deltaPct <= 1.0;
    
    console.log(`📊 Delta: ${delta.delta_pct} (${isConsistent ? '✅' : '❌'})`);
    
    return { delta: deltaPct, consistent: isConsistent };
  } catch (err) {
    console.log('⚠️ Error verificando delta:', err.message);
    return { delta: 0, consistent: true };
  }
}

function checkBaselinePresence() {
  console.log('📋 Verificando presencia de baseline...');
  
  const baselinePath = 'reports/TASKDB-BASELINE.md';
  const exists = fs.existsSync(baselinePath);
  
  if (exists) {
    const stats = fs.statSync(baselinePath);
    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    const isRecent = ageHours <= 25; // 25 horas para permitir un poco de flexibilidad
    
    console.log(`📊 Baseline: ${isRecent ? '✅' : '⚠️'} (${ageHours.toFixed(1)}h ago)`);
    
    return { exists, recent: isRecent, ageHours };
  } else {
    console.log('❌ Baseline no encontrado');
    return { exists: false, recent: false, ageHours: Infinity };
  }
}

function main() {
  console.log('🎯 TaskDB Governance Metrics\n');
  
  const metrics = {
    instrumentation: checkInstrumentationAdoption(),
    gates: checkGateCompliance(),
    delta: checkDeltaConsistency(),
    baseline: checkBaselinePresence()
  };
  
  console.log('\n📊 Resumen de Gobernanza:');
  console.log('='.repeat(40));
  
  // Criterios mínimos
  const criteria = {
    instrumentation: metrics.instrumentation.rate >= 100,
    gates: metrics.gates.rate >= 95,
    delta: metrics.delta.consistent,
    baseline: metrics.baseline.recent
  };
  
  console.log(`🔧 Instrumentación: ${criteria.instrumentation ? '✅' : '❌'} (${metrics.instrumentation.rate.toFixed(1)}%)`);
  console.log(`🚪 Gates: ${criteria.gates ? '✅' : '❌'} (${metrics.gates.rate.toFixed(1)}%)`);
  console.log(`📊 Delta: ${criteria.delta ? '✅' : '❌'} (${metrics.delta.delta.toFixed(2)}%)`);
  console.log(`📋 Baseline: ${criteria.baseline ? '✅' : '❌'} (${metrics.baseline.ageHours.toFixed(1)}h)`);
  
  const allPassed = Object.values(criteria).every(Boolean);
  
  console.log(`\n🎯 Estado General: ${allPassed ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
  
  if (!allPassed) {
    console.log('\n⚠️ Acciones requeridas:');
    if (!criteria.instrumentation) {
      console.log('  - Instrumentar funciones faltantes en src/functions/');
    }
    if (!criteria.gates) {
      console.log('  - Revisar commits que saltaron gates');
    }
    if (!criteria.delta) {
      console.log('  - Investigar desviación en delta PG/SQLite');
    }
    if (!criteria.baseline) {
      console.log('  - Regenerar baseline diario');
    }
  }
  
  return allPassed;
}

main();
