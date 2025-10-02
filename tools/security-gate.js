#!/usr/bin/env node
/**
 * Gate 7: Verificador de Seguridad & Exfil
 * Valida secret-scan, redacción, allow/deny lists, y PolicyGate
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

console.log('🚦 Gate 7: Verificando Seguridad & Exfil...');

let errors = 0;
let warnings = 0;

// Patrones de secretos a detectar
const SECRET_PATTERNS = [
    { pattern: /password\s*[:=]\s*["']?[^"'\s]+["']?/gi, name: 'password', severity: 'critical' },
    { pattern: /secret\s*[:=]\s*["']?[^"'\s]+["']?/gi, name: 'secret', severity: 'critical' },
    { pattern: /key\s*[:=]\s*["']?[^"'\s]+["']?/gi, name: 'key', severity: 'critical' },
    { pattern: /token\s*[:=]\s*["']?[^"'\s]+["']?/gi, name: 'token', severity: 'critical' },
    { pattern: /api[_-]?key\s*[:=]\s*["']?[^"'\s]+["']?/gi, name: 'api_key', severity: 'critical' },
    { pattern: /private[_-]?key\s*[:=]\s*["']?[^"'\s]+["']?/gi, name: 'private_key', severity: 'critical' },
    { pattern: /https?:\/\/[^:]+:[^@]+@/gi, name: 'url_with_credentials', severity: 'critical' }
];

// Dominios permitidos
const ALLOWED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'github.com',
    'npmjs.com',
    'nodejs.org',
    'quannex.dev'
];

// Comandos permitidos
const ALLOWED_COMMANDS = [
    'npm', 'node', 'git', 'ls', 'cat', 'echo', 'mkdir', 'cp', 'mv', 'rm',
    'eslint', 'prettier', 'shellcheck', 'jq', 'curl', 'wget'
];

function scanForSecrets(filePath) {
    try {
        const content = readFileSync(filePath, 'utf8');
        const findings = [];
        
        for (const { pattern, name, severity } of SECRET_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    findings.push({
                        type: name,
                        severity,
                        match: match.substring(0, 50) + '...',
                        line: content.substring(0, content.indexOf(match)).split('\n').length
                    });
                }
            }
        }
        
        return findings;
    } catch (error) {
        return [];
    }
}

function checkRedaction(filePath) {
    try {
        const content = readFileSync(filePath, 'utf8');
        
        // Verificar que usa funciones de redacción
        const redactionPatterns = [
            /safeErrorLog/,
            /safeOutputLog/,
            /sanitizeLogObject/,
            /REDACTED/,
            /\*\*\*REDACTED\*\*\*/
        ];
        
        let hasRedaction = false;
        for (const pattern of redactionPatterns) {
            if (pattern.test(content)) {
                hasRedaction = true;
                break;
            }
        }
        
        return hasRedaction;
    } catch (error) {
        return false;
    }
}

function checkDomainAllowlist(filePath) {
    try {
        const content = readFileSync(filePath, 'utf8');
        
        // Buscar URLs HTTP/HTTPS
        const urlPattern = /https?:\/\/([^\/\s"']+)/g;
        const matches = content.match(urlPattern) || [];
        
        const violations = [];
        for (const match of matches) {
            const domain = match.replace(/https?:\/\//, '').split('/')[0];
            if (!ALLOWED_DOMAINS.some(allowed => domain.includes(allowed))) {
                violations.push(domain);
            }
        }
        
        return violations;
    } catch (error) {
        return [];
    }
}

function checkCommandAllowlist(filePath) {
    try {
        const content = readFileSync(filePath, 'utf8');
        
        // Buscar comandos ejecutados
        const commandPatterns = [
            /exec\(['"]([^'"]+)['"]/g,
            /spawn\(['"]([^'"]+)['"]/g,
            /execSync\(['"]([^'"]+)['"]/g,
            /spawnSync\(['"]([^'"]+)['"]/g
        ];
        
        const violations = [];
        for (const pattern of commandPatterns) {
            const matches = content.match(pattern) || [];
            for (const match of matches) {
                const command = match.match(/['"]([^'"]+)['"]/)?.[1]?.split(' ')[0];
                if (command && !ALLOWED_COMMANDS.includes(command)) {
                    violations.push(command);
                }
            }
        }
        
        return violations;
    } catch (error) {
        return [];
    }
}

// Verificar archivos críticos
const criticalFiles = [
    'agents/context/agent.js',
    'agents/security/agent.js',
    'agents/prompting/agent.js',
    'agents/rules/agent.js',
    'orchestration/orchestrator.js',
    'utils/jwt-auth.js',
    'utils/secure-secrets-manager.js'
];

console.log('🔍 Escaneando archivos críticos para secretos...');

for (const file of criticalFiles) {
    const filePath = join(PROJECT_ROOT, file);
    
    if (!existsSync(filePath)) {
        console.log(`⚠️  Archivo no encontrado: ${file}`);
        warnings++;
        continue;
    }
    
    console.log(`  📁 Verificando: ${file}`);
    
    // Verificar secretos
    const secretFindings = scanForSecrets(filePath);
    if (secretFindings.length > 0) {
        console.log(`    ❌ Secretos encontrados en ${file}:`);
        for (const finding of secretFindings) {
            console.log(`      - ${finding.severity.toUpperCase()}: ${finding.type} (línea ${finding.line})`);
            if (finding.severity === 'critical') {
                errors++;
            }
        }
    } else {
        console.log(`    ✅ Sin secretos expuestos`);
    }
    
    // Verificar redacción
    const hasRedaction = checkRedaction(filePath);
    if (!hasRedaction) {
        console.log(`    ⚠️  Sin funciones de redacción en ${file}`);
        warnings++;
    } else {
        console.log(`    ✅ Redacción implementada`);
    }
    
    // Verificar dominios
    const domainViolations = checkDomainAllowlist(filePath);
    if (domainViolations.length > 0) {
        console.log(`    ❌ Dominios no permitidos en ${file}: ${domainViolations.join(', ')}`);
        errors++;
    } else {
        console.log(`    ✅ Dominios permitidos`);
    }
    
    // Verificar comandos
    const commandViolations = checkCommandAllowlist(filePath);
    if (commandViolations.length > 0) {
        console.log(`    ❌ Comandos no permitidos en ${file}: ${commandViolations.join(', ')}`);
        errors++;
    } else {
        console.log(`    ✅ Comandos permitidos`);
    }
}

// Verificar PolicyGate
console.log('🛡️  Verificando PolicyGate...');
const policyGatePath = join(PROJECT_ROOT, 'utils/policy-gate.js');
if (existsSync(policyGatePath)) {
    console.log('  ✅ PolicyGate encontrado');
} else {
    console.log('  ❌ PolicyGate no encontrado');
    errors++;
}

// Verificar perfiles de seguridad
console.log('🔐 Verificando perfiles de seguridad...');
const securityProfiles = ['dev', 'staging', 'prod'];
for (const profile of securityProfiles) {
    const profilePath = join(PROJECT_ROOT, `config/security-${profile}.json`);
    if (existsSync(profilePath)) {
        console.log(`  ✅ Perfil ${profile} encontrado`);
    } else {
        console.log(`  ⚠️  Perfil ${profile} no encontrado`);
        warnings++;
    }
}

// Resumen
console.log('');
console.log('📊 Resumen Gate 7:');
console.log(`   Archivos verificados: ${criticalFiles.length}`);
console.log(`   Errores críticos: ${errors}`);
console.log(`   Advertencias: ${warnings}`);

if (errors === 0) {
    console.log('🟢 Gate 7: SEGURIDAD & EXFIL - PASÓ');
    process.exit(0);
} else {
    console.log('🔴 Gate 7: SEGURIDAD & EXFIL - FALLÓ');
    process.exit(1);
}
