import { routePlaybook } from '../src/workflow/route.mjs';

const { profile, plan } = routePlaybook(process.cwd());
if (!Array.isArray(plan) || plan.length === 0) {
  console.error('[WORKFLOW-GATE] plan vacío para perfil:', profile);
  process.exit(1);
}
console.log(`[WORKFLOW-GATE] OK perfil=${profile} steps=${plan.length}`);
