import { execSync } from 'node:child_process';

const diff = execSync('git diff --name-only HEAD~1..HEAD').toString().trim().split('\n');
const allowed = [
  /^src\//,
  /^config\//,
  /^package\.json$/,
  /^pnpm-lock\.yaml$|^package-lock\.json$/,
];
const bad = diff.filter(f => f && !allowed.some(rx => rx.test(f)));
if (bad.length) {
  console.error('[DIFF-GATE] Cambios fuera de zonas permitidas:\n - ' + bad.join('\n - '));
  process.exit(1);
}
console.log('[DIFF-GATE] OK');
