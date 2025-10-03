import { getContext } from './context.js';
import type { TaskDB } from './adapter';
import type { TaskEvent, EventKind } from './types';

export const makeLogger = (queue: TaskDB) => ({
  log: (kind: EventKind, details?: any, status: 'ok' | 'fail' | 'skip' = 'ok') => {
    const ctx = getContext();
    if (!ctx) {
      throw new Error('No TaskContext available. Use withContext() to set context.');
    }

    const evt: TaskEvent = {
      kind,
      ctx,
      ts: Date.now(),
      status,
      details,
    };
    return queue.insert(evt);
  },
});
