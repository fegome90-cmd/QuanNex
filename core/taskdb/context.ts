import { AsyncLocalStorage } from 'node:async_hooks';
import type { TaskContext } from './types.js';

const asyncLocalStorage = new AsyncLocalStorage<TaskContext>();

export function withContext<T>(ctx: TaskContext, fn: () => T): T {
  return asyncLocalStorage.run(ctx, fn);
}

export function getContext(): TaskContext | undefined {
  return asyncLocalStorage.getStore();
}

export function setContext(ctx: TaskContext): void {
  asyncLocalStorage.enterWith(ctx);
}
