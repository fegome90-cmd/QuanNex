import { AsyncLocalStorage } from 'node:async_hooks';
import type { TaskContext } from './types.ts';

const storage = new AsyncLocalStorage<TaskContext>();

function validate(ctx: TaskContext): void {
  if (!ctx.traceId) {
    throw new Error('TaskDB context missing traceId');
  }
  if (!ctx.spanId) {
    throw new Error('TaskDB context missing spanId');
  }
  if (!ctx.runId || !ctx.taskId) {
    throw new Error('TaskDB context missing runId/taskId');
  }
}

export function withContext<T>(ctx: TaskContext, fn: () => Promise<T> | T): Promise<T> | T {
  validate(ctx);
  return storage.run({ ...ctx }, fn);
}

export function getContext(): TaskContext | undefined {
  return storage.getStore();
}

export function setContext(ctx: TaskContext): void {
  validate(ctx);
  storage.enterWith({ ...ctx });
}

export function assertContext(): TaskContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error('TaskDB context not available: wrap the call with withContext()');
  }
  validate(ctx);
  return ctx;
}

export function forkContext(overrides: Partial<TaskContext> = {}): TaskContext {
  const parent = assertContext();
  const next = {
    ...parent,
    ...overrides,
    parentSpanId: overrides.parentSpanId ?? parent.spanId,
  };
  validate(next);
  return next;
}
