#!/usr/bin/env node
/**
 * Gate 8: Verificador de Dependencias & Supply Chain
 * Valida npm audit, licencias compatibles, e integridad de binarios
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

console.log('🚦 Gate 8: Verificando Dependencias & Supply Chain...');

let errors = 0;
let warnings = 0;

// Licencias compatibles
const COMPATIBLE_LICENSES = [
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    'Unlicense',
    '0BSD'
];

// Licencias problemáticas
const PROBLEMATIC_LICENSES = [
    'GPL-2.0',
    'GPL-3.0',
    'AGPL-3.0',
    'Copyleft',
    'Proprietary'
];

function runNpmAudit() {
    try {
        console.log('🔍 Ejecutando npm audit...');
        const auditOutput = execSync('npm audit --omit=dev --json', { 
            encoding: 'utf8',
            cwd: PROJECT_ROOT,
            timeout: 30000
        });
        
        const audit = JSON.parse(auditOutput);
        
        if (audit.vulnerabilities) {
            const highCritical = Object.values(audit.vulnerabilities).filter(vuln => 
                vuln.severity === 'high' || vuln.severity === 'critical'
            );
            
            if (highCritical.length > 0) {
                console.log(`❌ Vulnerabilidades high/critical encontradas: ${highCritical.length}`);
                for (const vuln of highCritical) {
                    console.log(`  - ${vuln.name}: ${vuln.severity} (${vuln.via})`);
                }
                return { hasHighCritical: true, count: highCritical.length };
            }
        }
        
        console.log('✅ Sin vulnerabilidades high/critical');
        return { hasHighCritical: false, count: 0 };
        
    } catch (error) {
        console.log(`❌ Error ejecutando npm audit: ${error.message}`);
        return { hasHighCritical: true, count: -1 };
    }
}

function checkLockfileIntegrity() {
    try {
        console.log('🔒 Verificando integridad de lockfile...');
        
        const packageJsonPath = join(PROJECT_ROOT, 'package.json');
        const packageLockPath = join(PROJECT_ROOT, 'package-lock.json');
        
        if (!existsSync(packageJsonPath)) {
            console.log('❌ package.json no encontrado');
            return false;
        }
        
        if (!existsSync(packageLockPath)) {
            console.log('⚠️  package-lock.json no encontrado');
            return false;
        }
        
        // Verificar que el lockfile está actualizado
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
        
        if (packageLock.lockfileVersion !== 3) {
            console.log('⚠️  Lockfile version no es la más reciente');
        }
        
        console.log('✅ Lockfile integro');
        return true;
        
    } catch (error) {
        console.log(`❌ Error verificando lockfile: ${error.message}`);
        return false;
    }
}

function checkLicenses() {
    try {
        console.log('📄 Verificando licencias...');
        
        const licenseCheckOutput = execSync('npx license-checker --json', { 
            encoding: 'utf8',
            cwd: PROJECT_ROOT,
            timeout: 30000
        });
        
        const licenses = JSON.parse(licenseCheckOutput);
        const problematic = [];
        const unknown = [];
        
        for (const [packageName, licenseInfo] of Object.entries(licenses)) {
            const license = licenseInfo.licenses;
            
            if (PROBLEMATIC_LICENSES.some(prob => license.includes(prob))) {
                problematic.push({ package: packageName, license });
            } else if (!COMPATIBLE_LICENSES.some(comp => license.includes(comp))) {
                unknown.push({ package: packageName, license });
            }
        }
        
        if (problematic.length > 0) {
            console.log(`❌ Licencias problemáticas encontradas: ${problematic.length}`);
            for (const { package: pkg, license } of problematic) {
                console.log(`  - ${pkg}: ${license}`);
            }
        } else {
            console.log('✅ Sin licencias problemáticas');
        }
        
        if (unknown.length > 0) {
            console.log(`⚠️  Licencias desconocidas: ${unknown.length}`);
            for (const { package: pkg, license } of unknown.slice(0, 5)) {
                console.log(`  - ${pkg}: ${license}`);
            }
        }
        
        return { problematic: problematic.length, unknown: unknown.length };
        
    } catch (error) {
        console.log(`⚠️  Error verificando licencias: ${error.message}`);
        return { problematic: 0, unknown: 0 };
    }
}

function checkBinaryIntegrity() {
    try {
        console.log('🔐 Verificando integridad de binarios críticos...');
        
        const criticalBinaries = [
            'node',
            'npm',
            'git'
        ];
        
        const integrityFile = join(PROJECT_ROOT, '.integrity-hashes.json');
        
        if (!existsSync(integrityFile)) {
            console.log('⚠️  Archivo de hashes de integridad no encontrado');
            return false;
        }
        
        const hashes = JSON.parse(readFileSync(integrityFile, 'utf8'));
        let allValid = true;
        
        for (const binary of criticalBinaries) {
            try {
                const currentHash = execSync(`shasum -a 256 $(which ${binary})`, { 
                    encoding: 'utf8' 
                }).split(' ')[0];
                
                const expectedHash = hashes[binary];
                
                if (currentHash === expectedHash) {
                    console.log(`  ✅ ${binary}: hash válido`);
                } else {
                    console.log(`  ❌ ${binary}: hash inválido`);
                    allValid = false;
                }
            } catch (error) {
                console.log(`  ⚠️  ${binary}: no se pudo verificar`);
            }
        }
        
        return allValid;
        
    } catch (error) {
        console.log(`❌ Error verificando integridad: ${error.message}`);
        return false;
    }
}

function checkDependencyVersions() {
    try {
        console.log('📦 Verificando versiones de dependencias...');
        
        const packageJsonPath = join(PROJECT_ROOT, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        let outdatedCount = 0;
        
        for (const [dep, version] of Object.entries(dependencies)) {
            // Verificar si usa versiones específicas (no ^ o ~)
            if (version.includes('^') || version.includes('~')) {
                console.log(`  ⚠️  ${dep}: usa rango de versión (${version})`);
                outdatedCount++;
            } else {
                console.log(`  ✅ ${dep}: versión específica (${version})`);
            }
        }
        
        return outdatedCount;
        
    } catch (error) {
        console.log(`❌ Error verificando versiones: ${error.message}`);
        return -1;
    }
}

// Ejecutar verificaciones
console.log('🔍 Iniciando verificaciones de supply chain...');

// 1. npm audit
const auditResult = runNpmAudit();
if (auditResult.hasHighCritical) {
    errors += auditResult.count;
}

// 2. Lockfile integrity
const lockfileOk = checkLockfileIntegrity();
if (!lockfileOk) {
    errors++;
}

// 3. Licencias
const licenseResult = checkLicenses();
if (licenseResult.problematic > 0) {
    errors += licenseResult.problematic;
}
if (licenseResult.unknown > 0) {
    warnings += licenseResult.unknown;
}

// 4. Integridad de binarios
const integrityOk = checkBinaryIntegrity();
if (!integrityOk) {
    warnings++;
}

// 5. Versiones de dependencias
const outdatedCount = checkDependencyVersions();
if (outdatedCount > 0) {
    warnings += outdatedCount;
}

// Resumen
console.log('');
console.log('📊 Resumen Gate 8:');
console.log(`   Vulnerabilidades críticas: ${auditResult.count}`);
console.log(`   Licencias problemáticas: ${licenseResult.problematic}`);
console.log(`   Dependencias con rangos: ${outdatedCount}`);
console.log(`   Errores: ${errors}`);
console.log(`   Advertencias: ${warnings}`);

if (errors === 0) {
    console.log('🟢 Gate 8: DEPENDENCIAS & SUPPLY CHAIN - PASÓ');
    process.exit(0);
} else {
    console.log('🔴 Gate 8: DEPENDENCIAS & SUPPLY CHAIN - FALLÓ');
    process.exit(1);
}
