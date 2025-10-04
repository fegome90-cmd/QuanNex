import { randomUUID } from 'node:crypto';
import { makeTaskDBFromEnv } from './index.ts';
import { assertContext, getContext, withContext } from './context.ts';
import type { EventKind, TaskContext, TaskEventPayload } from './types.ts';

const taskdb = makeTaskDBFromEnv();

export interface WithTaskMeta extends TaskEventPayload {
  component?: string;
  actor?: string;
  taskId?: string;
}

export interface WithTaskExecutionContext extends TaskContext {
  meta: WithTaskMeta;
}

export async function withTask<T>(
  runId: string,
  meta: WithTaskMeta,
  fn: (ctx: WithTaskExecutionContext) => Promise<T> | T
): Promise<T> {
  const traceId = typeof meta.traceId === 'string' ? meta.traceId : randomUUID();
  const spanId = randomUUID();
  const taskId = meta.taskId ?? runId;
  const component = meta.component ?? 'withTask';
  const actor = meta.actor;

  const ctx: TaskContext = {
    traceId,
    spanId,
    parentSpanId: undefined,
    runId,
    taskId,
    component,
    actor,
  };

  const executionCtx: WithTaskExecutionContext = { ...ctx, meta };
  const startTs = Date.now();

  return withContext(ctx, async () => {
    await taskdb.insert({
      kind: 'run.start',
      ctx,
      ts: startTs,
      status: 'ok',
      payload: { meta },
    });

    try {
      const result = await fn(executionCtx);
      await taskdb.insert({
        kind: 'run.finish',
        ctx,
        ts: Date.now(),
        status: 'ok',
        durationMs: Date.now() - startTs,
        payload: { meta },
      });
      return result;
    } catch (error: unknown) {
      await taskdb.insert({
        kind: 'run.error',
        ctx,
        ts: Date.now(),
        status: 'fail',
        payload: {
          meta,
          message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  });
}

export async function insertEvent<T extends TaskEventPayload>(
  kind: EventKind,
  payload: T,
  options: { status?: 'ok' | 'fail' | 'skip'; durationMs?: number } = {}
): Promise<void> {
  const ctx = assertContext();
  await taskdb.insert({
    kind,
    ctx: { ...ctx },
    ts: Date.now(),
    status: options.status ?? 'ok',
    durationMs: options.durationMs,
    payload,
  });
}

export function getCtx(): WithTaskExecutionContext | undefined {
  const ctx = getContext();
  if (!ctx) return undefined;
  return { ...ctx, meta: {} } as WithTaskExecutionContext;
}
