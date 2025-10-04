#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

import { execSync } from 'node:child_process';

function execCommand(cmd, args = []) {
  try {
    return execSync(cmd + (args.length ? ' ' + args.join(' ') : ''), { 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
  } catch (err) {
    return '';
  }
}

function main() {
  console.log('🔍 Verificando instrumentación TaskDB en funciones...\n');
  
  // Obtener archivos modificados
  const diff = execCommand('git diff --cached --name-only');
  if (!diff) {
    console.log('✅ No hay archivos staged, saltando verificación');
    process.exit(0);
  }
  
  const files = diff.split('\n').filter(f => f.trim());
  const targets = files.filter(f => /src\/functions\/.+\.(ts|js)$/.test(f));
  
  if (!targets.length) {
    console.log('✅ No hay funciones modificadas, saltando verificación');
    process.exit(0);
  }
  
  console.log(`📁 Archivos de funciones detectados: ${targets.length}`);
  targets.forEach(f => console.log(`  - ${f}`));
  
  // Verificar instrumentación
  const bad = targets.filter(f => {
    try {
      const content = execCommand(`head -n 200 "${f}"`);
      const hasWithTask = /withTask\s*\(/.test(content);
      const hasImport = /import.*withTask/.test(content);
      
      if (!hasWithTask && !hasImport) {
        console.log(`❌ ${f}: Falta withTask`);
        return true;
      }
      
      console.log(`✅ ${f}: Instrumentación detectada`);
      return false;
    } catch (err) {
      console.log(`⚠️ ${f}: Error leyendo archivo`);
      return true;
    }
  });
  
  if (bad.length) {
    console.log('\n❌ Falta instrumentación withTask en:');
    bad.forEach(f => console.log(`  - ${f}`));
    console.log('\n💡 Usa: npm run new-function <Name> para crear funciones con withTask');
    process.exit(2);
  }
  
  console.log('\n✅ Instrumentación detectada en todas las funciones nuevas/actualizadas');
  process.exit(0);
}

main();
