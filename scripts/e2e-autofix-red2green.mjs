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

  // 2) Verify debe fallar
  let failed = false;
  try {
    sh('npm run verify');
  } catch {
    failed = true;
  }
  if (!failed) {
    console.error('[E2E] Esperábamos verify rojo');
    process.exit(1);
  }

  // 3) AutoFix (apply) — instalar supertest dev
  const payload = JSON.stringify({
    actions: [{ type: 'install_missing_dep', name: 'supertest', dev: true }],
    dryRun: false,
    branch: 'autofix/e2e-demo',
  });
  sh(`node scripts/autofix.mjs '${payload}'`);

  // 4) Verify ahora debe pasar
  sh('npm run verify');
  console.log('[E2E] OK: rojo → autofix → verde');
} catch (error) {
  console.error('[E2E] Error:', error.message);
  process.exit(1);
}
