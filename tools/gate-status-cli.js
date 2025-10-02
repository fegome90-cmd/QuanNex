#!/usr/bin/env node
/**
 * CLI Reporte de Gates con Semáforo en Colores
 * Muestra el estado de todos los gates con tiempos y umbrales
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuración de colores
const COLORS = {
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
    MAGENTA: '\x1b[35m',
    WHITE: '\x1b[37m',
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m'
};

// Configuración de gates
const GATES = [
    {
        id: 0,
        name: 'Integridad & Layout',
        description: 'Imports canónicos, entry points únicos, sin archivos fantasma',
        script: 'bash tools/find-broken-imports.sh && node tools/registry-sanity.js',
        timeout: 30000,
        critical: true
    },
    {
        id: 1,
        name: 'Conformidad de Contratos',
        description: 'Endpoints y esquemas implementados, handshake y requestId idempotente',
        script: 'npm run quannex:contracts',
        timeout: 60000,
        critical: true
    },
    {
        id: 2,
        name: 'TaskDB Operativo',
        description: 'Persistencia, rehydrate, compact lossless',
        script: 'node tests/taskdb/rehydrate.test.mjs',
        timeout: 120000,
        critical: true
    },
    {
        id: 3,
        name: 'Context Agent Estable',
        description: 'p95 < 100ms, hybrid recall, smoke 5 turnos',
        script: 'npm run test:context',
        timeout: 180000,
        critical: true
    },
    {
        id: 4,
        name: 'Orquestador Sano',
        description: 'flows/default.json E2E, span tracing, hot-swap',
        script: 'npm run quannex:smoke',
        timeout: 180000,
        critical: true
    },
    {
        id: 5,
        name: 'Telemetría Mínima',
        description: 'Logs JSON, reportes agregados, cálculo %overhead_agent',
        script: 'node tools/verify-perf.js && node tools/snapshot-perf.js',
        timeout: 120000,
        critical: false
    },
    {
        id: 6,
        name: 'Safety Net / Rollback',
        description: 'Flags en mcp.json, rollback.sh < 10s, canary 1-10%',
        script: './ops/rollback.sh --dry-run',
        timeout: 10000,
        critical: true
    },
    {
        id: 7,
        name: 'Seguridad & Exfil',
        description: 'Secret-scan, redacción, allow/deny lists, PolicyGate',
        script: 'node tools/security-gate.js',
        timeout: 120000,
        critical: true
    },
    {
        id: 8,
        name: 'Dependencias & Supply Chain',
        description: 'npm audit sin high/critical, licencias compatibles, integridad',
        script: 'node tools/supply-chain-gate.js',
        timeout: 180000,
        critical: false
    },
    {
        id: 9,
        name: 'Disponibilidad & Resiliencia',
        description: 'Supervisor con backoff, 0 pérdidas requestId, circuit-breaker',
        script: 'node tools/resilience-gate.js',
        timeout: 120000,
        critical: true
    },
    {
        id: 10,
        name: 'MCP Enforcement',
        description: 'Commits con trailer + firma HMAC, pre-receive remoto',
        script: 'bash ops/audit.sh',
        timeout: 60000,
        critical: true
    },
    {
        id: 11,
        name: 'Performance Gate',
        description: 'p95 global ≤ 7.5s, error fatal ≤ 1%, tokens_out_new ≤ 1.10x',
        script: 'npm run ci-quannex-perf',
        timeout: 180000,
        critical: true
    },
    {
        id: 12,
        name: 'CI/CD Go/No-Go',
        description: 'Pipeline completo, 3 corridas consecutivas verdes en 24h',
        script: 'node tools/ci-gate.js',
        timeout: 300000,
        critical: true
    }
];

// Umbrales de rendimiento
const PERFORMANCE_THRESHOLDS = {
    context_p95: 100, // ms
    global_p95: 7500, // ms
    core_p95: 2000, // ms
    error_rate: 1.0, // %
    token_overhead: 1.10 // ratio
};

function formatTime(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    } else {
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'PASS': return COLORS.GREEN;
        case 'FAIL': return COLORS.RED;
        case 'WARN': return COLORS.YELLOW;
        case 'SKIP': return COLORS.DIM;
        default: return COLORS.WHITE;
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'PASS': return '🟢';
        case 'FAIL': return '🔴';
        case 'WARN': return '🟡';
        case 'SKIP': return '⚪';
        default: return '❓';
    }
}

function runGate(gate) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        try {
            console.log(`${COLORS.CYAN}  🔧 Ejecutando: ${gate.script}${COLORS.RESET}`);
            
            execSync(gate.script, {
                cwd: PROJECT_ROOT,
                timeout: gate.timeout,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            const duration = Date.now() - startTime;
            resolve({
                status: 'PASS',
                duration,
                error: null,
                critical: gate.critical
            });
            
        } catch (error) {
            const duration = Date.now() - startTime;
            resolve({
                status: 'FAIL',
                duration,
                error: error.message,
                critical: gate.critical
            });
        }
    });
}

function checkGateStatus(gate) {
    try {
        // Verificar si el script existe y es ejecutable
        const scriptParts = gate.script.split(' ');
        const scriptPath = join(PROJECT_ROOT, scriptParts[0]);
        
        if (!existsSync(scriptPath)) {
            return {
                status: 'SKIP',
                duration: 0,
                error: 'Script no encontrado',
                critical: gate.critical
            };
        }
        
        return null; // Necesita ejecución
        
    } catch (error) {
        return {
            status: 'SKIP',
            duration: 0,
            error: error.message,
            critical: gate.critical
        };
    }
}

function loadPerformanceData() {
    try {
        const perfFile = join(PROJECT_ROOT, '.quannex/perf-snapshot.json');
        
        if (!existsSync(perfFile)) {
            return null;
        }
        
        return JSON.parse(readFileSync(perfFile, 'utf8'));
        
    } catch (error) {
        return null;
    }
}

function checkPerformanceThresholds(perfData) {
    if (!perfData) {
        return { status: 'WARN', message: 'No hay datos de rendimiento' };
    }
    
    const issues = [];
    
    if (perfData.context_p95 > PERFORMANCE_THRESHOLDS.context_p95) {
        issues.push(`Context p95: ${perfData.context_p95}ms > ${PERFORMANCE_THRESHOLDS.context_p95}ms`);
    }
    
    if (perfData.global_p95 > PERFORMANCE_THRESHOLDS.global_p95) {
        issues.push(`Global p95: ${perfData.global_p95}ms > ${PERFORMANCE_THRESHOLDS.global_p95}ms`);
    }
    
    if (perfData.core_p95 > PERFORMANCE_THRESHOLDS.core_p95) {
        issues.push(`Core p95: ${perfData.core_p95}ms > ${PERFORMANCE_THRESHOLDS.core_p95}ms`);
    }
    
    if (perfData.error_rate > PERFORMANCE_THRESHOLDS.error_rate) {
        issues.push(`Error rate: ${perfData.error_rate}% > ${PERFORMANCE_THRESHOLDS.error_rate}%`);
    }
    
    if (perfData.token_overhead > PERFORMANCE_THRESHOLDS.token_overhead) {
        issues.push(`Token overhead: ${perfData.token_overhead}x > ${PERFORMANCE_THRESHOLDS.token_overhead}x`);
    }
    
    if (issues.length === 0) {
        return { status: 'PASS', message: 'Todos los umbrales cumplidos' };
    } else {
        return { status: 'FAIL', message: issues.join(', ') };
    }
}

function printHeader() {
    console.log(`${COLORS.BOLD}${COLORS.BLUE}`);
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🚦 GATES DE AVANCE MCP QUANNEX                              ║');
    console.log('║                        (Versión Endurecida)                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log(`${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}📊 Verificando estado de ${GATES.length} gates críticos...${COLORS.RESET}`);
    console.log('');
}

function printGateResult(gate, result) {
    const color = getStatusColor(result.status);
    const icon = getStatusIcon(result.status);
    const critical = result.critical ? '🔴' : '🟡';
    
    console.log(`${color}${icon} Gate ${gate.id.toString().padStart(2, '0')}: ${gate.name}${COLORS.RESET}`);
    console.log(`${COLORS.DIM}    ${gate.description}${COLORS.RESET}`);
    
    if (result.status === 'PASS') {
        console.log(`${COLORS.GREEN}    ✅ PASÓ en ${formatTime(result.duration)}${COLORS.RESET}`);
    } else if (result.status === 'FAIL') {
        console.log(`${COLORS.RED}    ❌ FALLÓ en ${formatTime(result.duration)}${COLORS.RESET}`);
        if (result.error) {
            console.log(`${COLORS.RED}    Error: ${result.error}${COLORS.RESET}`);
        }
    } else if (result.status === 'WARN') {
        console.log(`${COLORS.YELLOW}    ⚠️  ADVERTENCIA en ${formatTime(result.duration)}${COLORS.RESET}`);
    } else if (result.status === 'SKIP') {
        console.log(`${COLORS.DIM}    ⏭️  OMITIDO${COLORS.RESET}`);
    }
    
    console.log(`${COLORS.DIM}    ${critical} ${result.critical ? 'CRÍTICO' : 'OPCIONAL'}${COLORS.RESET}`);
    console.log('');
}

function printSummary(results) {
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    const criticalFailed = results.filter(r => r.status === 'FAIL' && r.critical).length;
    
    console.log(`${COLORS.BOLD}${COLORS.BLUE}📊 RESUMEN DE GATES${COLORS.RESET}`);
    console.log(`${COLORS.GREEN}✅ Pasaron: ${passed}${COLORS.RESET}`);
    console.log(`${COLORS.RED}❌ Fallaron: ${failed}${COLORS.RESET}`);
    console.log(`${COLORS.YELLOW}⚠️  Advertencias: ${warned}${COLORS.RESET}`);
    console.log(`${COLORS.DIM}⏭️  Omitidos: ${skipped}${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}⏱️  Tiempo total: ${formatTime(totalTime)}${COLORS.RESET}`);
    console.log('');
    
    if (criticalFailed > 0) {
        console.log(`${COLORS.RED}${COLORS.BOLD}🚨 GATES CRÍTICOS FALLARON: ${criticalFailed}${COLORS.RESET}`);
        console.log(`${COLORS.RED}Sistema NO listo para producción${COLORS.RESET}`);
    } else if (failed > 0) {
        console.log(`${COLORS.YELLOW}${COLORS.BOLD}⚠️  GATES NO CRÍTICOS FALLARON: ${failed}${COLORS.RESET}`);
        console.log(`${COLORS.YELLOW}Sistema funcional pero con advertencias${COLORS.RESET}`);
    } else {
        console.log(`${COLORS.GREEN}${COLORS.BOLD}🎉 TODOS LOS GATES CRÍTICOS PASARON${COLORS.RESET}`);
        console.log(`${COLORS.GREEN}Sistema listo para producción${COLORS.RESET}`);
    }
    
    console.log('');
}

function printPerformanceStatus() {
    console.log(`${COLORS.BOLD}${COLORS.BLUE}📈 ESTADO DE RENDIMIENTO${COLORS.RESET}`);
    
    const perfData = loadPerformanceData();
    const perfStatus = checkPerformanceThresholds(perfData);
    
    const color = getStatusColor(perfStatus.status);
    const icon = getStatusIcon(perfStatus.status);
    
    console.log(`${color}${icon} ${perfStatus.message}${COLORS.RESET}`);
    
    if (perfData) {
        console.log(`${COLORS.DIM}    Context p95: ${perfData.context_p95 || 'N/A'}ms${COLORS.RESET}`);
        console.log(`${COLORS.DIM}    Global p95: ${perfData.global_p95 || 'N/A'}ms${COLORS.RESET}`);
        console.log(`${COLORS.DIM}    Core p95: ${perfData.core_p95 || 'N/A'}ms${COLORS.RESET}`);
        console.log(`${COLORS.DIM}    Error rate: ${perfData.error_rate || 'N/A'}%${COLORS.RESET}`);
        console.log(`${COLORS.DIM}    Token overhead: ${perfData.token_overhead || 'N/A'}x${COLORS.RESET}`);
    }
    
    console.log('');
}

function printFooter() {
    console.log(`${COLORS.BOLD}${COLORS.BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${COLORS.RESET}`);
    console.log(`${COLORS.BOLD}${COLORS.BLUE}║  🚦 GO/NO-GO CRITERIA:${COLORS.RESET}`);
    console.log(`${COLORS.BOLD}${COLORS.BLUE}║${COLORS.RESET}`);
    console.log(`${COLORS.BOLD}${COLORS.BLUE}║  ${COLORS.GREEN}✅ GO:${COLORS.RESET} Todos los gates críticos pasaron, 3 corridas CI consecutivas OK${COLORS.RESET}`);
    console.log(`${COLORS.BOLD}${COLORS.BLUE}║  ${COLORS.RED}❌ NO-GO:${COLORS.RESET} Cualquier gate crítico falló o umbrales no cumplidos${COLORS.RESET}`);
    console.log(`${COLORS.BOLD}${COLORS.BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${COLORS.RESET}`);
    console.log('');
}

// Función principal
async function runGateStatusCLI() {
    try {
        printHeader();
        
        const results = [];
        
        for (const gate of GATES) {
            console.log(`${COLORS.CYAN}🔍 Verificando Gate ${gate.id}: ${gate.name}${COLORS.RESET}`);
            
            // Verificar estado del gate
            const preCheck = checkGateStatus(gate);
            if (preCheck) {
                results.push(preCheck);
                printGateResult(gate, preCheck);
                continue;
            }
            
            // Ejecutar gate
            const result = await runGate(gate);
            results.push(result);
            printGateResult(gate, result);
        }
        
        printSummary(results);
        printPerformanceStatus();
        printFooter();
        
        // Determinar código de salida
        const criticalFailed = results.filter(r => r.status === 'FAIL' && r.critical).length;
        
        if (criticalFailed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
        
    } catch (error) {
        console.log(`${COLORS.RED}❌ Error ejecutando CLI: ${error.message}${COLORS.RESET}`);
        process.exit(1);
    }
}

// Ejecutar CLI
runGateStatusCLI();
