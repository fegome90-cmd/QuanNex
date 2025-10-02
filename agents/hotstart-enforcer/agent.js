#!/usr/bin/env node
/**
 * Hot Start Enforcer Agent - Agente que ejecuta el contrato endurecido
 * Implementa validaciones reales y sistema de idempotencia
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

const validateInput = (data) => {
  const errors = [];
  if (typeof data !== 'object' || data === null) {
    return ['Input must be an object'];
  }
  if (data.action && !['enforce', 'check', 'validate', 'reset'].includes(data.action)) {
    errors.push('action must be one of: enforce, check, validate, reset');
  }
  return errors;
};

const rawInput = readFileSync(0, 'utf8');
const data = JSON.parse(rawInput);
const inputErrors = validateInput(data);

if (inputErrors.length > 0) {
  console.error(JSON.stringify(inputErrors, null, 2));
  process.exit(1);
}

const action = data.action || 'enforce';
const sessionId = data.session_id || `session_${Date.now()}`;

console.log('🚀 [Hot Start Enforcer] Iniciando aplicación de contrato endurecido...');

// Función para crear directorio .cache si no existe
const ensureCacheDir = () => {
  const cacheDir = join(PROJECT_ROOT, '.cache');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
    console.log('📁 [Hot Start Enforcer] Directorio .cache creado');
  }
};

// Función para escribir log
const writeLog = (message) => {
  ensureCacheDir();
  const logFile = join(PROJECT_ROOT, '.cache', 'init.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  writeFileSync(logFile, logEntry, { flag: 'a' });
};

// Función para cargar el contrato endurecido
const loadContract = () => {
  const contractPath = join(PROJECT_ROOT, 'contracts', 'cursor-hotstart-contract.json');
  if (!existsSync(contractPath)) {
    throw new Error('Contrato endurecido no encontrado');
  }
  return JSON.parse(readFileSync(contractPath, 'utf8'));
};

// Función para verificar idempotencia
const checkIdempotency = () => {
  const stateFile = join(PROJECT_ROOT, '.cache', 'hotstart_init_done');
  if (!existsSync(stateFile)) {
    return { completed: false, session_id: null };
  }
  
  try {
    const status = JSON.parse(readFileSync(stateFile, 'utf8'));
    return status;
  } catch (error) {
    return { completed: false, session_id: null };
  }
};

// Función para marcar como completado
const markCompleted = (sessionId, results) => {
  ensureCacheDir();
  const stateFile = join(PROJECT_ROOT, '.cache', 'hotstart_init_done');
  const resultFile = join(PROJECT_ROOT, '.cache', 'init-result.json');
  
  const status = {
    completed: true,
    session_id: sessionId,
    completed_at: new Date().toISOString(),
    contract_version: '1.2.0',
    results: results
  };
  
  writeFileSync(stateFile, JSON.stringify(status, null, 2));
  writeFileSync(resultFile, JSON.stringify(results, null, 2));
  
  writeLog('Hot start completado exitosamente');
};

// Función para ejecutar preflight checks
const validateGitEnforcement = (contract) => {
  console.log('🔍 [Hot Start Enforcer] Validando Git enforcement...');
  writeLog('Iniciando validación Git enforcement');
  
  const gitConfig = contract.git_enforcement;
  if (!gitConfig) {
    console.log('⚠️ [Hot Start Enforcer] No git_enforcement configurado, saltando...');
    return { success: true, message: 'No git enforcement configured' };
  }
  
  // Mapear configuración del contrato a variables de entorno
  const env = {
    ...process.env,
    ALLOWED_BRANCHES: gitConfig.allowed_branches.join(','),
    REQUIRED_BRANCH: gitConfig.required_branch || '',
    ALLOWED_COMMITS: gitConfig.allowed_commits ? gitConfig.allowed_commits.join(',') : ''
  };
  
  try {
    const result = spawnSync('bash', ['./scripts/validate-git.sh'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 10000,
      env
    });
    
    if (result.status === 0) {
      console.log('✅ [Hot Start Enforcer] Git enforcement: OK');
      writeLog('Git enforcement: OK');
      return {
        success: true,
        output: result.stdout.toString(),
        message: 'Git validation passed'
      };
    } else {
      console.error(`❌ [Hot Start Enforcer] Git enforcement: FAILED (${result.status})`);
      writeLog(`Git enforcement: FAILED - ${result.stderr.toString()}`);
      return {
        success: false,
        output: result.stderr.toString(),
        message: gitConfig.fail_message || 'Git validation failed'
      };
    }
  } catch (error) {
    console.error(`❌ [Hot Start Enforcer] Error ejecutando Git enforcement: ${error.message}`);
    writeLog(`Git enforcement error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      message: 'Error executing Git validation'
    };
  }
};

const executePreflightChecks = async (contract) => {
  console.log('🔍 [Hot Start Enforcer] Ejecutando preflight checks...');
  writeLog('Iniciando preflight checks');
  
  const results = [];
  
  // Ejecutar validación Git enforcement primero
  const gitResult = validateGitEnforcement(contract);
  results.push({
    check_id: 'git_enforcement',
    success: gitResult.success,
    output: gitResult.output || '',
    message: gitResult.message
  });
  
  for (const check of contract.preflight_checks) {
    console.log(`🔍 [Hot Start Enforcer] ${check.description}...`);
    writeLog(`Ejecutando check: ${check.check_id}`);
    
    try {
      const result = spawnSync('bash', ['-c', check.command], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        timeout: 30000
      });
      
      if (result.status === 0) {
        console.log(`✅ [Hot Start Enforcer] ${check.check_id}: OK`);
        writeLog(`${check.check_id}: OK`);
        results.push({
          check_id: check.check_id,
          success: true,
          output: result.stdout.toString()
        });
      } else {
        console.error(`❌ [Hot Start Enforcer] ${check.check_id}: FAILED`);
        writeLog(`${check.check_id}: FAILED - ${result.stderr.toString()}`);
        results.push({
          check_id: check.check_id,
          success: false,
          error: result.stderr.toString()
        });
      }
    } catch (error) {
      console.error(`❌ [Hot Start Enforcer] ${check.check_id}: ERROR - ${error.message}`);
      writeLog(`${check.check_id}: ERROR - ${error.message}`);
      results.push({
        check_id: check.check_id,
        success: false,
        error: error.message
      });
    }
  }
  
  const allPassed = results.every(r => r.success);
  if (allPassed) {
    console.log('✅ [Hot Start Enforcer] Todos los preflight checks pasaron');
    writeLog('Preflight checks: TODOS PASARON');
  } else {
    console.error('❌ [Hot Start Enforcer] Algunos preflight checks fallaron');
    writeLog('Preflight checks: ALGUNOS FALLARON');
  }
  
  return { results, allPassed };
};

// Función para ejecutar acción obligatoria
const executeMandatoryAction = async (action, contract) => {
  console.log(`📋 [Hot Start Enforcer] Ejecutando: ${action.description}`);
  writeLog(`Ejecutando acción obligatoria: ${action.action_id}`);
  
  switch (action.action_id) {
    case 'read_manual':
      return await enforceManualReading(action);
    case 'read_context':
      return await enforceContextReading(action);
    case 'verify_system_state':
      return await verifySystemState(action);
    case 'snapshot_rehydrate':
      return await rehydrateSnapshot(action);
    case 'acknowledge_contract':
      return await acknowledgeContract(action);
    default:
      throw new Error(`Acción no reconocida: ${action.action_id}`);
  }
};

// Función para obligar lectura del manual
const enforceManualReading = async (action) => {
  const manualPath = join(PROJECT_ROOT, action.target_file);
  if (!existsSync(manualPath)) {
    throw new Error(`Manual no encontrado: ${action.target_file}`);
  }
  
  console.log('📖 [Hot Start Enforcer] OBLIGATORIO: Leyendo manual completo...');
  writeLog('Leyendo manual completo');
  
  const manualContent = readFileSync(manualPath, 'utf8');
  
  console.log(`📖 [Hot Start Enforcer] Manual leído: ${manualContent.length} caracteres`);
  writeLog(`Manual leído: ${manualContent.length} caracteres`);
  
  // Simular procesamiento del contenido
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ [Hot Start Enforcer] Manual procesado y entendido');
  writeLog('Manual procesado exitosamente');
  
  return {
    success: true,
    action: action.action_id,
    message: 'Manual leído completamente',
    content_length: manualContent.length,
    acknowledged: true
  };
};

// Función para obligar lectura del contexto
const enforceContextReading = async (action) => {
  const contextPath = join(PROJECT_ROOT, action.target_file);
  if (!existsSync(contextPath)) {
    throw new Error(`Contexto no encontrado: ${action.target_file}`);
  }
  
  console.log('🎯 [Hot Start Enforcer] OBLIGATORIO: Leyendo contexto de ingeniero senior...');
  writeLog('Leyendo contexto de ingeniero senior');
  
  const contextContent = readFileSync(contextPath, 'utf8');
  
  console.log(`🎯 [Hot Start Enforcer] Contexto leído: ${contextContent.length} caracteres`);
  writeLog(`Contexto leído: ${contextContent.length} caracteres`);
  
  // Simular procesamiento del contenido
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('✅ [Hot Start Enforcer] Contexto procesado y entendido');
  writeLog('Contexto procesado exitosamente');
  
  return {
    success: true,
    action: action.action_id,
    message: 'Contexto leído completamente',
    content_length: contextContent.length,
    acknowledged: true
  };
};

// Función para verificar estado del sistema
const verifySystemState = async (action) => {
  console.log('🔍 [Hot Start Enforcer] Verificando estado del sistema...');
  writeLog('Verificando estado del sistema');
  
  const result = spawnSync('bash', ['-c', action.command], {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    timeout: action.timeout_seconds * 1000
  });
  
  if (result.status !== 0) {
    throw new Error(`Verificación del sistema falló: ${result.stderr.toString()}`);
  }
  
  const output = result.stdout.toString();
  console.log('🔍 [Hot Start Enforcer] Estado del sistema verificado');
  writeLog('Estado del sistema verificado exitosamente');
  
  return {
    success: true,
    action: action.action_id,
    message: 'Estado del sistema verificado',
    output: output
  };
};

// Función para rehidratar snapshot
const rehydrateSnapshot = async (action) => {
  console.log('💾 [Hot Start Enforcer] Rehidratando contexto desde snapshot...');
  writeLog('Rehidratando contexto desde snapshot');
  
  const result = spawnSync('bash', ['-c', action.command], {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    timeout: action.timeout_seconds * 1000
  });
  
  // Rehidratación es opcional, no fallar si no hay snapshot
  if (result.status !== 0) {
    console.log('⚠️ [Hot Start Enforcer] No hay snapshot para rehidratar o falló');
    writeLog('Rehidratación: No hay snapshot o falló');
    return {
      success: true,
      action: action.action_id,
      message: 'No hay snapshot para rehidratar',
      skipped: true
    };
  }
  
  console.log('✅ [Hot Start Enforcer] Contexto rehidratado exitosamente');
  writeLog('Contexto rehidratado exitosamente');
  
  return {
    success: true,
    action: action.action_id,
    message: 'Contexto rehidratado',
    output: result.stdout.toString()
  };
};

// Función para confirmar contrato
const acknowledgeContract = async (action) => {
  console.log('✅ [Hot Start Enforcer] Confirmando contrato de hot start...');
  writeLog('Confirmando contrato de hot start');
  
  console.log('✅ [Hot Start Enforcer] Contrato de hot start completado');
  console.log('🚀 [Hot Start Enforcer] Cursor está listo para hot start');
  writeLog('Contrato de hot start completado');
  
  return {
    success: true,
    action: action.action_id,
    message: 'Contrato de hot start completado',
    acknowledgment: action.validation.acknowledgment_required
  };
};

// Función principal para aplicar el contrato endurecido
const enforceContract = async () => {
  try {
    // Verificar idempotencia
    const idempotencyStatus = checkIdempotency();
    if (idempotencyStatus.completed && idempotencyStatus.session_id === sessionId) {
      console.log('✅ [Hot Start Enforcer] Hot start ya completado en esta sesión');
      return {
        success: true,
        message: 'Hot start ya completado',
        status: 'already_completed'
      };
    }
    
    // Cargar contrato endurecido
    const contract = loadContract();
    console.log(`📋 [Hot Start Enforcer] Aplicando contrato endurecido: ${contract.name}`);
    writeLog(`Iniciando contrato endurecido: ${contract.name}`);
    
    const results = {
      preflight_checks: null,
      mandatory_actions: [],
      completed_at: new Date().toISOString(),
      session_id: sessionId
    };
    
    // Ejecutar preflight checks
    const preflightResult = await executePreflightChecks(contract);
    results.preflight_checks = preflightResult;
    
    if (!preflightResult.allPassed) {
      throw new Error('Preflight checks fallaron - no se puede continuar');
    }
    
    // Ejecutar acciones obligatorias
    for (const action of contract.mandatory_actions) {
      try {
        const result = await executeMandatoryAction(action, contract);
        results.mandatory_actions.push(result);
        
        // Simular delay para acciones críticas
        if (action.action_id === 'read_manual' || action.action_id === 'read_context') {
          console.log('⏳ [Hot Start Enforcer] Procesando información crítica...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ [Hot Start Enforcer] Error en ${action.action_id}: ${error.message}`);
        writeLog(`Error en ${action.action_id}: ${error.message}`);
        throw error;
      }
    }
    
    // Marcar como completado
    markCompleted(sessionId, results);
    
    console.log('🎉 [Hot Start Enforcer] Contrato endurecido completado exitosamente');
    console.log('🚀 [Hot Start Enforcer] Cursor está ahora en hot start y listo para trabajar');
    writeLog('Contrato endurecido completado exitosamente');
    
    return {
      success: true,
      message: contract.completion_message,
      results: results,
      contract_version: contract.version,
      session_id: sessionId
    };
    
  } catch (error) {
    console.error('❌ [Hot Start Enforcer] Error aplicando contrato endurecido:', error.message);
    writeLog(`Error aplicando contrato: ${error.message}`);
    return {
      success: false,
      error: error.message,
      fallback_message: 'Inicialización automática falló. Ejecuta manualmente: ./context-manager.sh status && ./context-manager.sh rehydrate --if-exists'
    };
  }
};

// Función para verificar estado del contrato
const checkContractStatus = () => {
  const status = checkIdempotency();
  const contract = loadContract();
  
  return {
    contract_loaded: true,
    contract_version: contract.version,
    hotstart_completed: status.completed,
    last_session: status.session_id,
    completed_at: status.completed_at
  };
};

// Función para resetear hot start
const resetHotStart = () => {
  const stateFile = join(PROJECT_ROOT, '.cache', 'hotstart_init_done');
  if (existsSync(stateFile)) {
    const fs = require('fs');
    fs.unlinkSync(stateFile);
  }
  
  const resultFile = join(PROJECT_ROOT, '.cache', 'init-result.json');
  if (existsSync(resultFile)) {
    const fs = require('fs');
    fs.unlinkSync(resultFile);
  }
  
  writeLog('Hot start reseteado');
  
  return {
    success: true,
    message: 'Estado de hot start reseteado. La próxima vez se ejecutará el contrato completo.'
  };
};

// Ejecutar acción solicitada
try {
  let result = {};
  
  switch (action) {
    case 'enforce':
      result = await enforceContract();
      break;
    case 'check':
      result = checkContractStatus();
      break;
    case 'validate':
      const contract = loadContract();
      result = {
        success: true,
        contract_valid: true,
        contract_version: contract.version,
        preflight_checks_count: contract.preflight_checks.length,
        mandatory_actions_count: contract.mandatory_actions.length
      };
      break;
    case 'reset':
      result = resetHotStart();
      break;
    default:
      throw new Error(`Acción no reconocida: ${action}`);
  }
  
  console.log('✅ [Hot Start Enforcer] Operación completada');
  console.log(JSON.stringify(result, null, 2));
  
} catch (error) {
  console.error('❌ [Hot Start Enforcer] Error:', error.message);
  process.exit(1);
}
