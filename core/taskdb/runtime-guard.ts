import { getCtx } from './withTask.ts';

export function requireTaskContext() {
  if (process.env.TASKDB_ENFORCE_RUNTIME === 'true' && !getCtx()) {
    throw new Error('TaskDB runtime guard: función sin contexto TaskDB (usa withTask)');
  }
}

export function assertTaskContext(functionName: string) {
  const ctx = getCtx();
  if (!ctx) {
    throw new Error(`TaskDB runtime guard: ${functionName} debe ejecutarse dentro de withTask`);
  }
  return ctx;
}
