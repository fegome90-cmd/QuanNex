import { AsyncLocalStorage } from 'node:async_hooks';
import { makeTaskDBFromEnv } from './index';
import type { TaskEvent } from './types';

const als = new AsyncLocalStorage<{ runId: string; meta?: any }>();
const taskdb = makeTaskDBFromEnv();

export function getCtx() { 
  return als.getStore(); 
}

export async function withTask<T>(
  runId: string,
  meta: any,
  fn: (ctx: { runId: string; meta: any }) => Promise<T> | T
): Promise<T> {
  const ctx = { runId, meta };
  return await als.run(ctx, async () => {
    await taskdb.insert({ 
      kind: 'run.start', 
      ts: Date.now(), 
      ctx, 
      data: { meta } 
    });
    
    try {
      const result = await fn(ctx);
      await taskdb.insert({ 
        kind: 'run.finish', 
        ts: Date.now(), 
        ctx, 
        data: { ok: true } 
      });
      return result;
    } catch (e: any) {
      await taskdb.insert({ 
        kind: 'run.error', 
        ts: Date.now(), 
        ctx, 
        data: { err: String(e?.message || e) } 
      });
      throw e;
    }
  });
}

// Helper para insertar eventos adicionales
export async function insertEvent(kind: string, data: any) {
  const ctx = getCtx();
  if (!ctx) {
    throw new Error('insertEvent debe llamarse dentro de withTask');
  }
  
  await taskdb.insert({
    kind,
    ts: Date.now(),
    ctx,
    data
  });
}
