#!/usr/bin/env node
/**
 * Gate 12: CI/CD Go/No-Go - Verificador agregador
 * Ejecuta pipeline completo y valida 3 corridas consecutivas
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

console.log('🚦 Gate 12: Verificando CI/CD Go/No-Go...');

// Configuración
const PIPELINE_STEPS = [
    { name: 'layout', script: 'bash tools/find-broken-imports.sh', timeout: 30000 },
    { name: 'contracts', script: 'npm run quannex:contracts', timeout: 60000 },
    { name: 'init', script: './scripts/mcp-autonomous-init.sh --verbose', timeout: 120000 },
    { name: 'e2e', script: 'npm run quannex:smoke', timeout: 180000 },
    { name: 'security', script: 'npm run test:security', timeout: 120000 },
    { name: 'resilience', script: 'npm run quannex:resilience', timeout: 120000 },
    { name: 'perf', script: 'node tools/verify-perf.js && node tools/snapshot-perf.js && npm run ci-quannex-perf', timeout: 180000 }
];

const REQUIRED_CONSECUTIVE_RUNS = 3;
const MAX_RUNS_IN_24H = 10;

let totalErrors = 0;
let totalWarnings = 0;
let successfulRuns = 0;
let failedRuns = 0;

function runPipelineStep(step) {
    return new Promise((resolve) => {
        try {
            console.log(`🔧 Ejecutando paso: ${step.name}`);
            console.log(`   Comando: ${step.script}`);
            
            const startTime = Date.now();
            
            execSync(step.script, {
                cwd: PROJECT_ROOT,
                timeout: step.timeout,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            const duration = Date.now() - startTime;
            console.log(`   ✅ ${step.name} completado en ${duration}ms`);
            
            resolve({ success: true, duration, step: step.name });
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`   ❌ ${step.name} falló en ${duration}ms`);
            console.log(`   Error: ${error.message}`);
            
            resolve({ success: false, duration, step: step.name, error: error.message });
        }
    });
}

function runFullPipeline() {
    return new Promise(async (resolve) => {
        console.log('🚀 Iniciando pipeline completo...');
        
        const results = [];
        let pipelineSuccess = true;
        
        for (const step of PIPELINE_STEPS) {
            const result = await runPipelineStep(step);
            results.push(result);
            
            if (!result.success) {
                pipelineSuccess = false;
                break; // Detener pipeline en primer fallo
            }
        }
        
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
        
        console.log(`📊 Pipeline completado en ${totalDuration}ms`);
        console.log(`   Resultado: ${pipelineSuccess ? '✅ ÉXITO' : '❌ FALLO'}`);
        
        resolve({
            success: pipelineSuccess,
            duration: totalDuration,
            results: results,
            timestamp: new Date().toISOString()
        });
    });
}

function checkConsecutiveRuns() {
    try {
        console.log('📈 Verificando corridas consecutivas...');
        
        const baselineDir = join(PROJECT_ROOT, '.quannex/baselines');
        
        if (!existsSync(baselineDir)) {
            console.log('❌ Directorio de baselines no encontrado');
            return false;
        }
        
        // Buscar baselines de las últimas 24 horas
        const baselineFiles = execSync(`find "${baselineDir}" -name "*-ok.json" -mtime -1`, { 
            encoding: 'utf8',
            cwd: PROJECT_ROOT 
        }).trim().split('\n').filter(f => f);
        
        console.log(`   Baselines encontrados: ${baselineFiles.length}`);
        
        if (baselineFiles.length < REQUIRED_CONSECUTIVE_RUNS) {
            console.log(`❌ Insuficientes corridas exitosas (${baselineFiles.length}/${REQUIRED_CONSECUTIVE_RUNS})`);
            return false;
        }
        
        // Verificar que las últimas N corridas fueron exitosas
        const recentBaselines = baselineFiles
            .sort()
            .slice(-REQUIRED_CONSECUTIVE_RUNS);
        
        let allRecentSuccessful = true;
        
        for (const baselineFile of recentBaselines) {
            try {
                const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
                
                if (!baseline.success) {
                    console.log(`❌ Baseline no exitoso: ${baselineFile}`);
                    allRecentSuccessful = false;
                    break;
                }
                
                console.log(`   ✅ Baseline exitoso: ${baseline.timestamp}`);
                
            } catch (error) {
                console.log(`❌ Error leyendo baseline: ${baselineFile}`);
                allRecentSuccessful = false;
                break;
            }
        }
        
        if (allRecentSuccessful) {
            console.log(`✅ ${REQUIRED_CONSECUTIVE_RUNS} corridas consecutivas exitosas`);
        } else {
            console.log(`❌ No todas las corridas recientes fueron exitosas`);
        }
        
        return allRecentSuccessful;
        
    } catch (error) {
        console.log(`❌ Error verificando corridas consecutivas: ${error.message}`);
        return false;
    }
}

function createBaseline(result) {
    try {
        console.log('📝 Creando baseline...');
        
        const baselineDir = join(PROJECT_ROOT, '.quannex/baselines');
        
        // Crear directorio si no existe
        if (!existsSync(baselineDir)) {
            execSync(`mkdir -p "${baselineDir}"`, { cwd: PROJECT_ROOT });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baselineFile = join(baselineDir, `${timestamp}-ok.json`);
        
        const baseline = {
            timestamp: result.timestamp,
            success: result.success,
            duration: result.duration,
            steps: result.results,
            version: '1.0.0',
            environment: {
                node: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };
        
        // Escribir baseline
        const fs = await import('node:fs');
        fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
        
        console.log(`✅ Baseline creado: ${baselineFile}`);
        
        return baselineFile;
        
    } catch (error) {
        console.log(`❌ Error creando baseline: ${error.message}`);
        return null;
    }
}

function checkRunFrequency() {
    try {
        console.log('⏰ Verificando frecuencia de ejecución...');
        
        const baselineDir = join(PROJECT_ROOT, '.quannex/baselines');
        
        if (!existsSync(baselineDir)) {
            console.log('⚠️  Directorio de baselines no encontrado');
            return true;
        }
        
        // Contar ejecuciones en las últimas 24 horas
        const recentRuns = execSync(`find "${baselineDir}" -name "*.json" -mtime -1 | wc -l`, { 
            encoding: 'utf8',
            cwd: PROJECT_ROOT 
        }).trim();
        
        const runCount = parseInt(recentRuns);
        
        console.log(`   Ejecuciones en 24h: ${runCount}`);
        
        if (runCount > MAX_RUNS_IN_24H) {
            console.log(`⚠️  Demasiadas ejecuciones en 24h (${runCount}/${MAX_RUNS_IN_24H})`);
            return false;
        }
        
        console.log('✅ Frecuencia de ejecución aceptable');
        return true;
        
    } catch (error) {
        console.log(`❌ Error verificando frecuencia: ${error.message}`);
        return false;
    }
}

function generateReport(result) {
    try {
        console.log('📊 Generando reporte...');
        
        const reportDir = join(PROJECT_ROOT, '.quannex/reports');
        
        // Crear directorio si no existe
        if (!existsSync(reportDir)) {
            execSync(`mkdir -p "${reportDir}"`, { cwd: PROJECT_ROOT });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = join(reportDir, `ci-gate-${timestamp}.json`);
        
        const report = {
            timestamp: result.timestamp,
            success: result.success,
            duration: result.duration,
            steps: result.results,
            summary: {
                totalSteps: PIPELINE_STEPS.length,
                successfulSteps: result.results.filter(r => r.success).length,
                failedSteps: result.results.filter(r => !r.success).length,
                averageStepDuration: result.results.reduce((sum, r) => sum + r.duration, 0) / result.results.length
            },
            environment: {
                node: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };
        
        // Escribir reporte
        const fs = await import('node:fs');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log(`✅ Reporte creado: ${reportFile}`);
        
        return reportFile;
        
    } catch (error) {
        console.log(`❌ Error generando reporte: ${error.message}`);
        return null;
    }
}

// Función principal
async function runCIGate() {
    try {
        console.log('🔍 Iniciando verificaciones de CI/CD Go/No-Go...');
        
        // 1. Verificar frecuencia de ejecución
        if (!checkRunFrequency()) {
            console.log('⚠️  Frecuencia de ejecución alta, continuando...');
        }
        
        // 2. Ejecutar pipeline completo
        const pipelineResult = await runFullPipeline();
        
        // 3. Crear baseline si fue exitoso
        if (pipelineResult.success) {
            await createBaseline(pipelineResult);
        }
        
        // 4. Generar reporte
        await generateReport(pipelineResult);
        
        // 5. Verificar corridas consecutivas
        const consecutiveOk = checkConsecutiveRuns();
        
        // Resumen final
        console.log('');
        console.log('📊 Resumen Gate 12:');
        console.log(`   Pipeline: ${pipelineResult.success ? '✅ ÉXITO' : '❌ FALLO'}`);
        console.log(`   Duración: ${pipelineResult.duration}ms`);
        console.log(`   Corridas consecutivas: ${consecutiveOk ? '✅ OK' : '❌ FALLO'}`);
        console.log(`   Pasos exitosos: ${pipelineResult.results.filter(r => r.success).length}/${PIPELINE_STEPS.length}`);
        
        if (pipelineResult.success && consecutiveOk) {
            console.log('🟢 Gate 12: CI/CD GO/NO-GO - GO');
            console.log('✅ Sistema listo para producción');
            process.exit(0);
        } else {
            console.log('🔴 Gate 12: CI/CD GO/NO-GO - NO-GO');
            console.log('❌ Sistema no listo para producción');
            process.exit(1);
        }
        
    } catch (error) {
        console.log(`❌ Error ejecutando CI Gate: ${error.message}`);
        process.exit(1);
    }
}

// Ejecutar
runCIGate();
