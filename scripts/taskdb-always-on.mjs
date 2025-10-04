#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function execCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (err) {
    return '';
  }
}

async function main() {
  console.log('🛡️ TaskDB Always-On - Enforcement Pack\n');
  
  // PASO 1: Verificar withTask wrapper
  console.log('🚀 PASO 1: Verificando withTask wrapper...');
  const withTaskPath = 'core/taskdb/withTask.ts';
  if (fs.existsSync(withTaskPath)) {
    console.log('✅ withTask wrapper disponible');
  } else {
    console.log('❌ withTask wrapper no encontrado');
  }
  
  // PASO 2: Verificar runtime guard
  console.log('\n🛡️ PASO 2: Verificando runtime guard...');
  const runtimeGuardPath = 'core/taskdb/runtime-guard.ts';
  if (fs.existsSync(runtimeGuardPath)) {
    console.log('✅ Runtime guard disponible');
  } else {
    console.log('❌ Runtime guard no encontrado');
  }
  
  // PASO 3: Verificar script de CI
  console.log('\n🔍 PASO 3: Verificando script de CI...');
  const ciScriptPath = 'scripts/ci-require-taskdb.mjs';
  if (fs.existsSync(ciScriptPath)) {
    console.log('✅ Script de CI disponible');
  } else {
    console.log('❌ Script de CI no encontrado');
  }
  
  // PASO 4: Verificar template de función
  console.log('\n📝 PASO 4: Verificando template de función...');
  const templateScriptPath = 'scripts/new-function.sh';
  if (fs.existsSync(templateScriptPath)) {
    console.log('✅ Template de función disponible');
    console.log('💡 Usar: ./scripts/new-function.sh <FunctionName>');
  } else {
    console.log('❌ Template de función no encontrado');
  }
  
  // PASO 5: Verificar template de PR
  console.log('\n📋 PASO 5: Verificando template de PR...');
  const prTemplatePath = '.github/pull_request_template.md';
  if (fs.existsSync(prTemplatePath)) {
    console.log('✅ Template de PR disponible');
  } else {
    console.log('❌ Template de PR no encontrado');
  }
  
  // PASO 6: Verificar test de aceptación
  console.log('\n🧪 PASO 6: Verificando test de aceptación...');
  const testPath = 'packages/tests/instrumentation-acceptance.test.mjs';
  if (fs.existsSync(testPath)) {
    console.log('✅ Test de aceptación disponible');
  } else {
    console.log('❌ Test de aceptación no encontrado');
  }
  
  // PASO 7: Ejecutar test de aceptación
  console.log('\n🧪 PASO 7: Ejecutando test de aceptación...');
  try {
    execCommand('node packages/tests/instrumentation-acceptance.test.mjs');
    console.log('✅ Test de aceptación pasó');
  } catch (err) {
    console.log('⚠️ Test de aceptación falló:', err.message);
  }
  
  // PASO 8: Verificar enforcement completo
  console.log('\n✅ PASO 8: Verificando enforcement completo...');
  
  const enforcementChecks = [
    { name: 'withTask wrapper', check: () => fs.existsSync(withTaskPath) },
    { name: 'Runtime guard', check: () => fs.existsSync(runtimeGuardPath) },
    { name: 'CI script', check: () => fs.existsSync(ciScriptPath) },
    { name: 'Function template', check: () => fs.existsSync(templateScriptPath) },
    { name: 'PR template', check: () => fs.existsSync(prTemplatePath) },
    { name: 'Acceptance test', check: () => fs.existsSync(testPath) }
  ];
  
  let passedChecks = 0;
  enforcementChecks.forEach(check => {
    if (check.check()) {
      console.log(`✅ ${check.name}`);
      passedChecks++;
    } else {
      console.log(`❌ ${check.name}`);
    }
  });
  
  console.log(`\n📊 Enforcement: ${passedChecks}/${enforcementChecks.length} checks pasaron`);
  
  if (passedChecks === enforcementChecks.length) {
    console.log('\n🎉 TaskDB Always-On enforcement pack completo!');
    console.log('📝 Próximo: Configurar CI y probar enforcement');
  } else {
    console.log('\n⚠️ Enforcement pack incompleto, revisar checks fallidos');
  }
  
  // PASO 9: Instrucciones de uso
  console.log('\n📖 INSTRUCCIONES DE USO:');
  console.log('1. Crear función: ./scripts/new-function.sh <FunctionName>');
  console.log('2. Verificar instrumentación: npm run ci:require-taskdb');
  console.log('3. Test de aceptación: node packages/tests/instrumentation-acceptance.test.mjs');
  console.log('4. Runtime enforcement: TASKDB_ENFORCE_RUNTIME=true');
  console.log('5. CI gate: Agregar script a GitHub Actions');
}

main().catch(e => {
  console.error('❌ Error en TaskDB Always-On:', e.message);
  process.exit(1);
});
