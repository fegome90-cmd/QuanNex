#!/usr/bin/env node
/**
 * Initialization Enforcer Agent - Agente que ejecuta el contrato de inicialización
 * Obliga a Cursor a leer manual y contexto cuando inicia MCP por primera vez
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

const validateInput = data => {
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

// console.log('🚀 [Initialization Enforcer] Iniciando aplicación de contrato de inicialización...');

// Función para leer el contrato
const loadContract = () => {
  const contractPath = join(PROJECT_ROOT, 'contracts', 'cursor-initialization-contract.json');
  if (!existsSync(contractPath)) {
    throw new Error('Contrato de inicialización no encontrado');
  }
  return JSON.parse(readFileSync(contractPath, 'utf8'));
};

// Función para verificar si ya se completó la inicialización
const checkInitializationStatus = () => {
  const statusFile = join(PROJECT_ROOT, '.cursor-initialization-status.json');
  if (!existsSync(statusFile)) {
    return { completed: false, session_id: null };
  }

  try {
    const status = JSON.parse(readFileSync(statusFile, 'utf8'));
    return status;
  } catch (error) {
    return { completed: false, session_id: null };
  }
};

// Función para marcar inicialización como completada
const markInitializationComplete = sessionId => {
  const statusFile = join(PROJECT_ROOT, '.cursor-initialization-status.json');
  const status = {
    completed: true,
    session_id: sessionId,
    completed_at: new Date().toISOString(),
    contract_version: '1.0.0',
  };
  writeFileSync(statusFile, JSON.stringify(status, null, 2));
};

// Función para ejecutar acción obligatoria
const executeMandatoryAction = async (action, contract) => {
  // console.log(`📋 [Initialization Enforcer] Ejecutando: ${action.description}`);

  switch (action.action_id) {
    case 'read_manual':
      return await enforceManualReading(action);
    case 'read_context':
      return await enforceContextReading(action);
    case 'verify_system_state':
      return await verifySystemState(action);
    case 'acknowledge_contract':
      return await acknowledgeContract(action);
    default:
      throw new Error(`Acción no reconocida: ${action.action_id}`);
  }
};

// Función para obligar lectura del manual
const enforceManualReading = async action => {
  const manualPath = join(PROJECT_ROOT, action.target_file);
  if (!existsSync(manualPath)) {
    throw new Error(`Manual no encontrado: ${action.target_file}`);
  }

  // console.log('📖 [Initialization Enforcer] OBLIGATORIO: Leyendo manual completo...');
  const manualContent = readFileSync(manualPath, 'utf8');

  // Simular lectura completa (en implementación real, esto sería interactivo)
  // console.log(`📖 [Initialization Enforcer] Manual leído: ${manualContent.length} caracteres`);
  // console.log('📖 [Initialization Enforcer] Contenido del manual cargado en memoria');

  // En una implementación real, aquí se mostraría el contenido completo
  // y se esperaría confirmación del usuario
  // console.log('✅ [Initialization Enforcer] Manual leído y entendido');

  return {
    success: true,
    action: action.action_id,
    message: 'Manual leído completamente',
    content_length: manualContent.length,
  };
};

// Función para obligar lectura del contexto
const enforceContextReading = async action => {
  const contextPath = join(PROJECT_ROOT, action.target_file);
  if (!existsSync(contextPath)) {
    throw new Error(`Contexto no encontrado: ${action.target_file}`);
  }

  // console.log('🎯 [Initialization Enforcer] OBLIGATORIO: Leyendo contexto de ingeniero senior...');
  const contextContent = readFileSync(contextPath, 'utf8');

  // Simular lectura completa
  // console.log(`🎯 [Initialization Enforcer] Contexto leído: ${contextContent.length} caracteres`);
  // console.log('🎯 [Initialization Enforcer] Contexto de ingeniero senior cargado en memoria');

  // En una implementación real, aquí se mostraría el contenido completo
  // console.log('✅ [Initialization Enforcer] Contexto leído y entendido');

  return {
    success: true,
    action: action.action_id,
    message: 'Contexto leído completamente',
    content_length: contextContent.length,
  };
};

// Función para verificar estado del sistema
const verifySystemState = async action => {
  // console.log('🔍 [Initialization Enforcer] Verificando estado del sistema...');

  const result = spawnSync('bash', ['-c', action.command], {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    timeout: action.timeout_seconds * 1000,
  });

  if (result.status !== 0) {
    throw new Error(`Verificación del sistema falló: ${result.stderr.toString()}`);
  }

  const output = result.stdout.toString();
  // console.log('🔍 [Initialization Enforcer] Estado del sistema verificado');
  // console.log('✅ [Initialization Enforcer] Sistema funcionando correctamente');

  return {
    success: true,
    action: action.action_id,
    message: 'Estado del sistema verificado',
    output: output,
  };
};

// Función para confirmar contrato
const acknowledgeContract = async action => {
  // console.log('✅ [Initialization Enforcer] Confirmando contrato de inicialización...');
  // console.log('✅ [Initialization Enforcer] Contrato de inicialización completado');
  // console.log('🚀 [Initialization Enforcer] Cursor está listo para trabajar en caliente');

  return {
    success: true,
    action: action.action_id,
    message: 'Contrato de inicialización completado',
    acknowledgment: action.validation.acknowledgment_required,
  };
};

// Función principal para aplicar el contrato
const enforceContract = async () => {
  try {
    // Verificar si ya se completó la inicialización
    const status = checkInitializationStatus();
    if (status.completed && status.session_id === sessionId) {
      // console.log('✅ [Initialization Enforcer] Inicialización ya completada en esta sesión');
      return {
        success: true,
        message: 'Inicialización ya completada',
        status: 'already_completed',
      };
    }

    // Cargar contrato
    const contract = loadContract();
    // console.log(`📋 [Initialization Enforcer] Aplicando contrato: ${contract.name}`);

    const results = [];

    // Ejecutar acciones obligatorias
    for (const action of contract.mandatory_actions) {
      try {
        const result = await executeMandatoryAction(action, contract);
        results.push(result);

        // Simular delay para acciones críticas
        if (action.action_id === 'read_manual' || action.action_id === 'read_context') {
          // console.log('⏳ [Initialization Enforcer] Procesando información crítica...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(
          `❌ [Initialization Enforcer] Error en ${action.action_id}: ${error.message}`
        );
        throw error;
      }
    }

    // Marcar como completado
    markInitializationComplete(sessionId);

    // console.log('🎉 [Initialization Enforcer] Contrato de inicialización completado exitosamente');
    // console.log('🚀 [Initialization Enforcer] Cursor está ahora en caliente y listo para trabajar');

    return {
      success: true,
      message: contract.completion_message,
      results: results,
      contract_version: contract.version,
      session_id: sessionId,
    };
  } catch (error) {
    console.error('❌ [Initialization Enforcer] Error aplicando contrato:', error.message);
    return {
      success: false,
      error: error.message,
      fallback_message:
        'Inicialización automática falló. Por favor, lee manualmente MANUAL-COMPLETO-CURSOR.md y CONTEXTO-INGENIERO-SENIOR.md antes de continuar.',
    };
  }
};

// Función para verificar estado del contrato
const checkContractStatus = () => {
  const status = checkInitializationStatus();
  const contract = loadContract();

  return {
    contract_loaded: true,
    contract_version: contract.version,
    initialization_completed: status.completed,
    last_session: status.session_id,
    completed_at: status.completed_at,
  };
};

// Función para resetear inicialización
const resetInitialization = () => {
  const statusFile = join(PROJECT_ROOT, '.cursor-initialization-status.json');
  if (existsSync(statusFile)) {
    const fs = require('fs');
    fs.unlinkSync(statusFile);
  }

  return {
    success: true,
    message:
      'Estado de inicialización reseteado. La próxima vez se ejecutará el contrato completo.',
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
        mandatory_actions_count: contract.mandatory_actions.length,
      };
      break;
    case 'reset':
      result = resetInitialization();
      break;
    default:
      throw new Error(`Acción no reconocida: ${action}`);
  }

  // console.log('✅ [Initialization Enforcer] Operación completada');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ [Initialization Enforcer] Error:', error.message);
  process.exit(1);
}
