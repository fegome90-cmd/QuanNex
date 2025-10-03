import { routePlaybook } from './route.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const steps = {
  'context:compact': () => exec('npm', ['run', 'context:compact']),
  'deps:ensure-node': () => exec('npm', ['run', 'deps:ensure-node']),
  'deps:ensure-py': () => exec('npm', ['run', 'deps:ensure-py']),
  'deps:baseline': () => exec('npm', ['run', 'deps:baseline']),
  'ui:scaffold': () => exec('npm', ['run', 'scaffold:ui']),
  'api:scaffold': () => exec('npm', ['run', 'scaffold:api']),
  'tests:rtl': () => exec('npm', ['run', 'test:rtl:setup']),
  'tests:supertest': () => exec('npm', ['run', 'test:api:setup']),
  'tests:pytest': () => exec('npm', ['run', 'test:py:setup']),
  'gates:verify': () => exec('npm', ['run', 'verify']),
};

export async function runAdaptive(cwd = process.cwd()) {
  const { profile, plan } = routePlaybook(cwd);
  if (!Array.isArray(plan) || plan.length === 0) throw new Error('Adaptive plan vacío');

  console.log(`🚀 [WORKFLOW] Iniciando workflow adaptativo para perfil: ${profile}`);
  console.log(`📋 [WORKFLOW] Plan: ${plan.join(' → ')}`);

  const results = [];
  for (const step of plan) {
    console.log(`⚡ [WORKFLOW] Ejecutando: ${step}`);
    const fn = steps[step];
    if (!fn) throw new Error(`Paso desconocido: ${step}`);
    const r = await fn();
    results.push({ step, ok: true, out: r.stdout });
    console.log(`✅ [WORKFLOW] Completado: ${step}`);
  }

  console.log(`🎉 [WORKFLOW] Workflow completado exitosamente para perfil: ${profile}`);
  return { profile, steps: plan, results };
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAdaptive().catch(console.error);
}
