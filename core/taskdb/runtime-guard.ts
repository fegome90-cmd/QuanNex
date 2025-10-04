import { getCtx } from './withTask';

export function requireTaskContext() {
  if (process.env.TASKDB_ENFORCE_RUNTIME === 'true' && !getCtx()) {
    throw new Error('TaskDB runtime guard: función sin contexto TaskDB (usa withTask)');
  }
}

// Helper para verificar contexto en funciones críticas
export function assertTaskContext(functionName: string) {
  const ctx = getCtx();
  if (!ctx) {
    throw new Error(`TaskDB runtime guard: ${functionName} debe ejecutarse dentro de withTask`);
  }
  return ctx;
}
