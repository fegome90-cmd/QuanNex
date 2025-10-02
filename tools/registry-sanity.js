#!/usr/bin/env node
/**
 * Gate 0: Verificador de Registry Sanity
 * Valida que todas las rutas en config/agents.registry.json existen
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

console.log('🚦 Gate 0: Verificando Registry Sanity...');

let errors = 0;
let totalAgents = 0;

try {
    // Leer registry de agentes
    const registryPath = join(PROJECT_ROOT, 'config/agents.registry.json');
    
    if (!existsSync(registryPath)) {
        console.log('❌ config/agents.registry.json no encontrado');
        process.exit(1);
    }
    
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    
    console.log('📋 Verificando agentes en registry...');
    
    // Verificar cada agente
    for (const [agentName, agentConfig] of Object.entries(registry)) {
        totalAgents++;
        console.log(`  🔍 Verificando agente: ${agentName}`);
        
        // Verificar entry point
        if (agentConfig.entryPoint) {
            const entryPath = join(PROJECT_ROOT, agentConfig.entryPoint);
            if (!existsSync(entryPath)) {
                console.log(`    ❌ Entry point no existe: ${agentConfig.entryPoint}`);
                errors++;
            } else {
                console.log(`    ✅ Entry point OK: ${agentConfig.entryPoint}`);
            }
        }
        
        // Verificar dependencias
        if (agentConfig.dependencies) {
            for (const dep of agentConfig.dependencies) {
                const depPath = join(PROJECT_ROOT, dep);
                if (!existsSync(depPath)) {
                    console.log(`    ❌ Dependencia no existe: ${dep}`);
                    errors++;
                } else {
                    console.log(`    ✅ Dependencia OK: ${dep}`);
                }
            }
        }
        
        // Verificar configuración
        if (agentConfig.config) {
            const configPath = join(PROJECT_ROOT, agentConfig.config);
            if (!existsSync(configPath)) {
                console.log(`    ❌ Config no existe: ${agentConfig.config}`);
                errors++;
            } else {
                console.log(`    ✅ Config OK: ${agentConfig.config}`);
            }
        }
    }
    
    // Verificar que no hay agentes duplicados
    const agentNames = Object.keys(registry);
    const uniqueNames = new Set(agentNames);
    
    if (agentNames.length !== uniqueNames.size) {
        console.log('❌ Agentes duplicados encontrados en registry');
        errors++;
    } else {
        console.log('✅ No hay agentes duplicados');
    }
    
    // Verificar estructura mínima requerida
    const requiredFields = ['entryPoint', 'version', 'status'];
    for (const [agentName, agentConfig] of Object.entries(registry)) {
        for (const field of requiredFields) {
            if (!agentConfig[field]) {
                console.log(`❌ Agente ${agentName} falta campo requerido: ${field}`);
                errors++;
            }
        }
    }
    
} catch (error) {
    console.log(`❌ Error leyendo registry: ${error.message}`);
    errors++;
}

// Resumen
console.log('');
console.log('📊 Resumen Registry Sanity:');
console.log(`   Agentes verificados: ${totalAgents}`);
console.log(`   Errores encontrados: ${errors}`);

if (errors === 0) {
    console.log('🟢 Gate 0: REGISTRY SANITY - PASÓ');
    process.exit(0);
} else {
    console.log('🔴 Gate 0: REGISTRY SANITY - FALLÓ');
    process.exit(1);
}
