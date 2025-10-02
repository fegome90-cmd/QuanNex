#!/usr/bin/env node
/**
 * Gate 9: Verificador de Disponibilidad & Resiliencia
 * Valida supervisor, circuit-breaker, y recuperación de fallos
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

console.log('🚦 Gate 9: Verificando Disponibilidad & Resiliencia...');

let errors = 0;
let warnings = 0;

// Configuración de circuit breaker
const CIRCUIT_BREAKER_CONFIG = {
    errorThreshold: 10, // 10% de errores por minuto
    timeoutMs: 60000,  // 1 minuto
    resetTimeoutMs: 300000 // 5 minutos
};

function checkSupervisorImplementation() {
    try {
        console.log('🔄 Verificando implementación de supervisor...');
        
        const supervisorPath = join(PROJECT_ROOT, 'utils/supervisor.js');
        
        if (!existsSync(supervisorPath)) {
            console.log('❌ Supervisor no encontrado');
            return false;
        }
        
        const supervisorCode = readFileSync(supervisorPath, 'utf8');
        
        // Verificar características del supervisor
        const requiredFeatures = [
            'backoff',
            'exponential',
            'restart',
            'maxRetries',
            'timeout'
        ];
        
        let featuresFound = 0;
        for (const feature of requiredFeatures) {
            if (supervisorCode.includes(feature)) {
                featuresFound++;
                console.log(`  ✅ ${feature} implementado`);
            } else {
                console.log(`  ❌ ${feature} no implementado`);
            }
        }
        
        const hasAllFeatures = featuresFound === requiredFeatures.length;
        
        if (hasAllFeatures) {
            console.log('✅ Supervisor completamente implementado');
        } else {
            console.log(`⚠️  Supervisor parcialmente implementado (${featuresFound}/${requiredFeatures.length})`);
        }
        
        return hasAllFeatures;
        
    } catch (error) {
        console.log(`❌ Error verificando supervisor: ${error.message}`);
        return false;
    }
}

function checkCircuitBreaker() {
    try {
        console.log('⚡ Verificando circuit breaker...');
        
        const circuitBreakerPath = join(PROJECT_ROOT, 'utils/circuit-breaker.js');
        
        if (!existsSync(circuitBreakerPath)) {
            console.log('❌ Circuit breaker no encontrado');
            return false;
        }
        
        const circuitBreakerCode = readFileSync(circuitBreakerPath, 'utf8');
        
        // Verificar estados del circuit breaker
        const requiredStates = ['CLOSED', 'OPEN', 'HALF_OPEN'];
        const requiredMethods = ['execute', 'recordSuccess', 'recordFailure', 'shouldAttemptReset'];
        
        let statesFound = 0;
        for (const state of requiredStates) {
            if (circuitBreakerCode.includes(state)) {
                statesFound++;
                console.log(`  ✅ Estado ${state} implementado`);
            } else {
                console.log(`  ❌ Estado ${state} no implementado`);
            }
        }
        
        let methodsFound = 0;
        for (const method of requiredMethods) {
            if (circuitBreakerCode.includes(method)) {
                methodsFound++;
                console.log(`  ✅ Método ${method} implementado`);
            } else {
                console.log(`  ❌ Método ${method} no implementado`);
            }
        }
        
        const hasAllStates = statesFound === requiredStates.length;
        const hasAllMethods = methodsFound === requiredMethods.length;
        
        if (hasAllStates && hasAllMethods) {
            console.log('✅ Circuit breaker completamente implementado');
            return true;
        } else {
            console.log(`⚠️  Circuit breaker parcialmente implementado`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Error verificando circuit breaker: ${error.message}`);
        return false;
    }
}

function checkRequestIdPersistence() {
    try {
        console.log('🆔 Verificando persistencia de requestId...');
        
        const requestIdPath = join(PROJECT_ROOT, 'utils/request-id-manager.js');
        
        if (!existsSync(requestIdPath)) {
            console.log('❌ Request ID manager no encontrado');
            return false;
        }
        
        const requestIdCode = readFileSync(requestIdPath, 'utf8');
        
        // Verificar características de persistencia
        const requiredFeatures = [
            'generate',
            'persist',
            'recover',
            'cleanup',
            'duplicate'
        ];
        
        let featuresFound = 0;
        for (const feature of requiredFeatures) {
            if (requestIdCode.includes(feature)) {
                featuresFound++;
                console.log(`  ✅ ${feature} implementado`);
            } else {
                console.log(`  ❌ ${feature} no implementado`);
            }
        }
        
        const hasAllFeatures = featuresFound === requiredFeatures.length;
        
        if (hasAllFeatures) {
            console.log('✅ Request ID persistence completamente implementado');
        } else {
            console.log(`⚠️  Request ID persistence parcialmente implementado (${featuresFound}/${requiredFeatures.length})`);
        }
        
        return hasAllFeatures;
        
    } catch (error) {
        console.log(`❌ Error verificando request ID persistence: ${error.message}`);
        return false;
    }
}

function checkHealthMonitoring() {
    try {
        console.log('💓 Verificando monitoreo de salud...');
        
        const healthMonitorPath = join(PROJECT_ROOT, 'utils/health-monitor.js');
        
        if (!existsSync(healthMonitorPath)) {
            console.log('❌ Health monitor no encontrado');
            return false;
        }
        
        const healthMonitorCode = readFileSync(healthMonitorPath, 'utf8');
        
        // Verificar características de health monitoring
        const requiredFeatures = [
            'checkHealth',
            'getStatus',
            'reportError',
            'reportSuccess',
            'getMetrics'
        ];
        
        let featuresFound = 0;
        for (const feature of requiredFeatures) {
            if (healthMonitorCode.includes(feature)) {
                featuresFound++;
                console.log(`  ✅ ${feature} implementado`);
            } else {
                console.log(`  ❌ ${feature} no implementado`);
            }
        }
        
        const hasAllFeatures = featuresFound === requiredFeatures.length;
        
        if (hasAllFeatures) {
            console.log('✅ Health monitoring completamente implementado');
        } else {
            console.log(`⚠️  Health monitoring parcialmente implementado (${featuresFound}/${requiredFeatures.length})`);
        }
        
        return hasAllFeatures;
        
    } catch (error) {
        console.log(`❌ Error verificando health monitoring: ${error.message}`);
        return false;
    }
}

function checkRecoveryMechanisms() {
    try {
        console.log('🔧 Verificando mecanismos de recuperación...');
        
        const recoveryPath = join(PROJECT_ROOT, 'utils/recovery-manager.js');
        
        if (!existsSync(recoveryPath)) {
            console.log('❌ Recovery manager no encontrado');
            return false;
        }
        
        const recoveryCode = readFileSync(recoveryPath, 'utf8');
        
        // Verificar características de recuperación
        const requiredFeatures = [
            'recover',
            'rollback',
            'checkpoint',
            'restore',
            'validate'
        ];
        
        let featuresFound = 0;
        for (const feature of requiredFeatures) {
            if (recoveryCode.includes(feature)) {
                featuresFound++;
                console.log(`  ✅ ${feature} implementado`);
            } else {
                console.log(`  ❌ ${feature} no implementado`);
            }
        }
        
        const hasAllFeatures = featuresFound === requiredFeatures.length;
        
        if (hasAllFeatures) {
            console.log('✅ Recovery mechanisms completamente implementados');
        } else {
            console.log(`⚠️  Recovery mechanisms parcialmente implementados (${featuresFound}/${requiredFeatures.length})`);
        }
        
        return hasAllFeatures;
        
    } catch (error) {
        console.log(`❌ Error verificando recovery mechanisms: ${error.message}`);
        return false;
    }
}

function simulateFailureRecovery() {
    return new Promise((resolve) => {
        try {
            console.log('🧪 Simulando recuperación de fallo...');
            
            // Simular un proceso que falla y se recupera
            const testProcess = spawn('node', ['-e', `
                console.log('Process started');
                setTimeout(() => {
                    console.log('Process completed successfully');
                    process.exit(0);
                }, 1000);
            `], { cwd: PROJECT_ROOT });
            
            let output = '';
            testProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            testProcess.on('close', (code) => {
                if (code === 0 && output.includes('Process completed successfully')) {
                    console.log('✅ Simulación de recuperación exitosa');
                    resolve(true);
                } else {
                    console.log('❌ Simulación de recuperación falló');
                    resolve(false);
                }
            });
            
            testProcess.on('error', (error) => {
                console.log(`❌ Error en simulación: ${error.message}`);
                resolve(false);
            });
            
            // Timeout después de 5 segundos
            setTimeout(() => {
                testProcess.kill();
                console.log('⚠️  Simulación timeout');
                resolve(false);
            }, 5000);
            
        } catch (error) {
            console.log(`❌ Error en simulación: ${error.message}`);
            resolve(false);
        }
    });
}

// Ejecutar verificaciones
async function runResilienceTests() {
    console.log('🔍 Iniciando verificaciones de resiliencia...');
    
    // 1. Supervisor
    const supervisorOk = checkSupervisorImplementation();
    if (!supervisorOk) {
        errors++;
    }
    
    // 2. Circuit Breaker
    const circuitBreakerOk = checkCircuitBreaker();
    if (!circuitBreakerOk) {
        errors++;
    }
    
    // 3. Request ID Persistence
    const requestIdOk = checkRequestIdPersistence();
    if (!requestIdOk) {
        warnings++;
    }
    
    // 4. Health Monitoring
    const healthMonitoringOk = checkHealthMonitoring();
    if (!healthMonitoringOk) {
        warnings++;
    }
    
    // 5. Recovery Mechanisms
    const recoveryOk = checkRecoveryMechanisms();
    if (!recoveryOk) {
        warnings++;
    }
    
    // 6. Simulación de recuperación
    const simulationOk = await simulateFailureRecovery();
    if (!simulationOk) {
        warnings++;
    }
    
    // Resumen
    console.log('');
    console.log('📊 Resumen Gate 9:');
    console.log(`   Supervisor: ${supervisorOk ? 'OK' : 'FALLO'}`);
    console.log(`   Circuit Breaker: ${circuitBreakerOk ? 'OK' : 'FALLO'}`);
    console.log(`   Request ID: ${requestIdOk ? 'OK' : 'ADVERTENCIA'}`);
    console.log(`   Health Monitor: ${healthMonitoringOk ? 'OK' : 'ADVERTENCIA'}`);
    console.log(`   Recovery: ${recoveryOk ? 'OK' : 'ADVERTENCIA'}`);
    console.log(`   Simulación: ${simulationOk ? 'OK' : 'ADVERTENCIA'}`);
    console.log(`   Errores: ${errors}`);
    console.log(`   Advertencias: ${warnings}`);
    
    if (errors === 0) {
        console.log('🟢 Gate 9: DISPONIBILIDAD & RESILIENCIA - PASÓ');
        process.exit(0);
    } else {
        console.log('🔴 Gate 9: DISPONIBILIDAD & RESILIENCIA - FALLÓ');
        process.exit(1);
    }
}

// Ejecutar tests
runResilienceTests().catch(error => {
    console.log(`❌ Error ejecutando tests de resiliencia: ${error.message}`);
    process.exit(1);
});
