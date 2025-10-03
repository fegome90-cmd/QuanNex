import { execSync } from 'node:child_process';
import fs from 'fs';

function sh(c) {
  return execSync(c, { stdio: 'pipe' }).toString();
}

try {
  console.log('[E2E] 🚀 Iniciando E2E AutoFix rojo→verde...');

  // 1) Crear rama de prueba
  sh('git checkout -b e2e/autofix-simple');

  // 2) Simular problema: falta un script NPM
  const pkg = JSON.parse(sh('cat package.json'));
  delete pkg.scripts['test:autofix'];
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log('[E2E] ✅ Script test:autofix removido');

  // 3) Verificar que el script no existe
  try {
    sh('npm run test:autofix');
    console.error('[E2E] ❌ Script test:autofix aún existe');
    process.exit(1);
  } catch {
    console.log('[E2E] ✅ Script test:autofix no existe (correcto)');
  }

  // 4) AutoFix: agregar script faltante
  const payload = JSON.stringify({
    actions: [{ type: 'add_npm_script', key: 'test:autofix', value: 'echo autofix test' }],
    dryRun: false,
    branch: 'autofix/e2e-simple',
  });
  console.log('[E2E] 🔧 Aplicando AutoFix...');
  sh(`node scripts/autofix.mjs '${payload}'`);

  // 5) Verificar que el script ahora existe
  try {
    sh('npm run test:autofix');
    console.log('[E2E] ✅ Script test:autofix funciona correctamente');
  } catch {
    console.error('[E2E] ❌ Script test:autofix no funciona');
    process.exit(1);
  }

  console.log('[E2E] 🎉 OK: rojo → autofix → verde');
} catch (error) {
  console.error('[E2E] ❌ Error:', error.message);
  process.exit(1);
}
