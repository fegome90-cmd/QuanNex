import { assertContext } from './context.ts';
import type { TaskDB } from './adapter.ts';
import type { EventKind, TaskEventPayload, TaskEventStatus } from './types.ts';

export interface LogOptions {
  status?: TaskEventStatus;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export const makeLogger = (queue: TaskDB) => ({
  async log<T extends TaskEventPayload = TaskEventPayload>(
    kind: EventKind,
    payload: T | undefined = undefined,
    status: TaskEventStatus = 'ok',
    options: LogOptions = {}
  ): Promise<void> {
    const ctx = assertContext();
    if (!ctx.traceId) {
      throw new Error(`TaskDB logger: traceId is mandatory (kind=${kind})`);
    }

    await queue.insert({
      kind,
      ctx: { ...ctx },
      ts: Date.now(),
      status: options.status ?? status,
      durationMs: options.durationMs,
      payload,
      metadata: options.metadata,
    });
  },
});
