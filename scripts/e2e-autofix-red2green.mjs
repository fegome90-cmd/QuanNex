import { execSync } from 'node:child_process';

function sh(c) {
  return execSync(c, { stdio: 'pipe' }).toString();
}

try {
  // 1) Simula repo con fallo: falta supertest
  sh('git checkout -b e2e/autofix-demo');
  sh(
    "node -e \"let p=require('./package.json'); delete (p.devDependencies||{}).supertest; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))\""
  );

  // 2) Verificar que supertest no está instalado
  let supertestMissing = false;
  try {
    sh('npm list supertest');
  } catch {
    supertestMissing = true;
  }
  if (!supertestMissing) {
    console.error('[E2E] supertest aún está instalado');
    process.exit(1);
  }
  console.log('[E2E] ✅ supertest removido correctamente');

  // 3) AutoFix (apply) — instalar supertest dev
  const payload = JSON.stringify({
    actions: [{ type: 'install_missing_dep', name: 'supertest', dev: true }],
    dryRun: false,
    branch: 'autofix/e2e-demo',
  });
  sh(`node scripts/autofix.mjs '${payload}'`);

  // 4) Verificar que supertest ahora está instalado
  let supertestInstalled = false;
  try {
    sh('npm list supertest');
    supertestInstalled = true;
  } catch {
    supertestInstalled = false;
  }
  if (!supertestInstalled) {
    console.error('[E2E] supertest no se instaló correctamente');
    process.exit(1);
  }
  console.log('[E2E] ✅ supertest instalado correctamente');

  console.log('[E2E] OK: rojo → autofix → verde');
} catch (error) {
  console.error('[E2E] Error:', error.message);
  process.exit(1);
}
