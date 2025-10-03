import { execSync } from 'node:child_process';

const out = execSync('git status --porcelain', { stdio: 'pipe' }).toString().trim();
if (out) {
  console.error('[ANTI-TAMPER] El árbol quedó sucio tras la ejecución:\n' + out);
  process.exit(1);
}
console.log('[ANTI-TAMPER] OK');
