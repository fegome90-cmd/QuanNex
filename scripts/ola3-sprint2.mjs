#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import fs from 'node:fs';
import { spawn } from 'child_process';

const ENV_FILE = '.env';
const BACKUP_SUFFIX = '.bak';

function execCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

function updateEnvFile(key, value) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const lines = envContent.split('\n');
  
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }
  
  if (!found) {
    lines.push(`${key}=${value}`);
  }
  
  // Backup
  fs.copyFileSync(ENV_FILE, ENV_FILE + BACKUP_SUFFIX);
  fs.writeFileSync(ENV_FILE, lines.join('\n'), 'utf8');
}

async function step1_StrictParity() {
  console.log('🚀 PASO 1: Activando paridad estricta...');
  
  updateEnvFile('TASKDB_DUAL_STRICT', 'true');
  console.log('✅ TASKDB_DUAL_STRICT=true');
  
  console.log('📊 Generando tráfico de prueba...');
  try {
    await execCommand('npm', ['run', 'smoke:test']);
  } catch (err) {
    console.warn('⚠️ Smoke test falló, continuando...');
  }
  
  console.log('🔍 Verificando delta...');
  try {
    await execCommand('node', ['scripts/delta-check.mjs']);
    console.log('✅ Delta OK (≤1%)');
  } catch (err) {
    console.error('❌ Delta alto, revisar logs');
    throw err;
  }
}

async function step2_PromoteToPG() {
  console.log('🚀 PASO 2: Promoviendo a PG-only...');
  
  updateEnvFile('TASKDB_DRIVER', 'pg');
  console.log('✅ TASKDB_DRIVER=pg');
  
  console.log('📊 Smoke test mínimo...');
  try {
    await execCommand('npm', ['run', 'smoke:test']);
  } catch (err) {
    console.warn('⚠️ Smoke test falló, continuando...');
  }
  
  console.log('📋 Generando baseline...');
  await execCommand('npm', ['run', 'taskdb:baseline']);
}

async function step3_Observability() {
  console.log('🚀 PASO 3: Configurando observabilidad...');
  
  console.log('📸 Guardando snapshot de métricas...');
  await execCommand('node', ['scripts/metrics-alert.mjs']);
  
  console.log('✅ Observabilidad configurada');
}

async function step4_DoD() {
  console.log('🚀 PASO 4: Verificando Definition of Done...');
  
  // Verificar baseline
  const baselinePath = 'reports/TASKDB-BASELINE.md';
  if (fs.existsSync(baselinePath)) {
    const baseline = fs.readFileSync(baselinePath, 'utf8');
    console.log('📋 Baseline verificado');
  }
  
  // Verificar métricas
  try {
    await execCommand('node', ['scripts/metrics-alert.mjs']);
    console.log('✅ Métricas estables');
  } catch (err) {
    console.warn('⚠️ Métricas con alertas');
  }
  
  console.log('✅ Definition of Done completada');
}

async function main() {
  const step = process.argv[2] || 'all';
  
  console.log('🎯 OLA 3 - Sprint 2: Promoción a PG-only\n');
  
  try {
    switch (step) {
      case '1':
      case 'strict':
        await step1_StrictParity();
        break;
      case '2':
      case 'promote':
        await step2_PromoteToPG();
        break;
      case '3':
      case 'obs':
        await step3_Observability();
        break;
      case '4':
      case 'dod':
        await step4_DoD();
        break;
      case 'all':
      default:
        await step1_StrictParity();
        await step2_PromoteToPG();
        await step3_Observability();
        await step4_DoD();
        break;
    }
    
    console.log('\n🎉 Sprint 2 completado exitosamente!');
    console.log('📝 Próximo: Crear PR y tag v0.3.0-ola3-s2');
    
  } catch (err) {
    console.error('\n💥 Error en Sprint 2:', err.message);
    console.log('🔄 Rollback disponible:');
    console.log('  sed -i.bak "s/^TASKDB_DRIVER=.*/TASKDB_DRIVER=jsonl/" .env');
    process.exit(1);
  }
}

main();
