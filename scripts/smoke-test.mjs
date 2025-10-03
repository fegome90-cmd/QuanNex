#!/usr/bin/env node

/**
 * QuanNex Smoke Test
 * Ejecuta verificaciones básicas del sistema cada mañana
 */

import { execSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n${colors.bold}${description}${colors.reset}`);
    log(`Running: ${command}`, 'blue');
    
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log(`✅ ${description} - PASSED`, 'green');
    return { success: true, output: result };
  } catch (error) {
    log(`❌ ${description} - FAILED`, 'red');
    log(`Error: ${error.message}`, 'red');
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description} - EXISTS`, 'green');
    return true;
  } else {
    log(`❌ ${description} - MISSING`, 'red');
    return false;
  }
}

async function smokeTest() {
  log(`${colors.bold}🚀 QuanNex Smoke Test${colors.reset}`, 'blue');
  log('='.repeat(50), 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // 1. Verificar archivos críticos
  log(`\n${colors.bold}📁 Checking Critical Files${colors.reset}`, 'blue');
  const criticalFiles = [
    ['config/profiles.yaml', 'Profiles Configuration'],
    ['config/playbooks.yaml', 'Playbooks Configuration'],
    ['config/fixes.json', 'AutoFix Configuration'],
    ['config/policies.json', 'Security Policies'],
    ['src/workflow/detect.mjs', 'Profile Detection'],
    ['src/workflow/route.mjs', 'Playbook Routing'],
    ['src/workflow/run.mjs', 'Workflow Runner'],
    ['scripts/autofix.mjs', 'AutoFix Engine'],
    ['scripts/policy-check.mjs', 'Policy Checker'],
    ['USAGE.md', 'Usage Documentation'],
    ['TROUBLESHOOTING.md', 'Troubleshooting Guide']
  ];

  for (const [file, description] of criticalFiles) {
    results.total++;
    if (checkFileExists(file, description)) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 2. Verificar gates básicos
  log(`\n${colors.bold}🚪 Checking Basic Gates${colors.reset}`, 'blue');
  const gates = [
    ['npm run gate:dirty', 'Anti-tamper Gate'],
    ['npm run gate:workflow', 'Workflow Gate'],
    ['npm run gate:policy', 'Policy Gate']
  ];

  for (const [command, description] of gates) {
    results.total++;
    const result = runCommand(command, description);
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 3. Verificar workflow adaptativo
  log(`\n${colors.bold}🔄 Testing Adaptive Workflow${colors.reset}`, 'blue');
  results.total++;
  const workflowResult = runCommand('npm run workflow:adaptive', 'Adaptive Workflow');
  if (workflowResult.success) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 4. Verificar verify
  log(`\n${colors.bold}✅ Testing Verify${colors.reset}`, 'blue');
  results.total++;
  const verifyResult = runCommand('npm run verify', 'Verify Command');
  if (verifyResult.success) {
    results.passed++;
  } else {
    results.failed++;
    
    // Si verify falla, probar autofix dry-run
    log(`\n${colors.bold}🔧 Testing AutoFix Dry-Run${colors.reset}`, 'yellow');
    results.total++;
    const autofixResult = runCommand(
      'node scripts/autofix.mjs \'{"actions":[{"type":"install_missing_dep","name":"supertest","dev":true}],"dryRun":true,"branch":"autofix/smoke-test"}\'',
      'AutoFix Dry-Run'
    );
    
    if (autofixResult.success) {
      results.passed++;
      log(`\n${colors.bold}💡 Suggestion${colors.reset}`, 'yellow');
      log('Verify failed but AutoFix dry-run passed. Consider applying the fix:', 'yellow');
      log('node scripts/autofix.mjs \'{"actions":[{"type":"install_missing_dep","name":"supertest","dev":true}],"dryRun":false,"branch":"autofix/smoke-test"}\'', 'blue');
      log('npm run verify', 'blue');
    } else {
      results.failed++;
    }
  }

  // 5. Verificar métricas
  log(`\n${colors.bold}📊 Checking Metrics${colors.reset}`, 'blue');
  results.total++;
  const metricsResult = runCommand('npm run dashboard', 'Metrics Dashboard');
  if (metricsResult.success) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 6. Verificar artefactos
  log(`\n${colors.bold}📦 Checking Artifacts${colors.reset}`, 'blue');
  const artifactsDir = 'artifacts/autofix';
  if (fs.existsSync(artifactsDir)) {
    const artifacts = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.json'));
    if (artifacts.length > 0) {
      log(`✅ Found ${artifacts.length} AutoFix artifacts`, 'green');
      results.passed++;
    } else {
      log('⚠️  Artifacts directory exists but is empty', 'yellow');
      results.passed++;
    }
  } else {
    log('⚠️  No artifacts directory found (this is normal for first run)', 'yellow');
    results.passed++;
  }
  results.total++;

  // Resumen final
  log(`\n${colors.bold}📋 Smoke Test Summary${colors.reset}`, 'blue');
  log('='.repeat(50), 'blue');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

  if (results.failed === 0) {
    log(`\n🎉 All smoke tests passed! System is healthy.`, 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  ${results.failed} test(s) failed. Check the output above for details.`, 'yellow');
    log('Refer to TROUBLESHOOTING.md for help.', 'blue');
    process.exit(1);
  }
}

// Ejecutar smoke test
smokeTest().catch(error => {
  log(`\n💥 Smoke test crashed: ${error.message}`, 'red');
  process.exit(1);
});
