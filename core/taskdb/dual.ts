import type { TaskDB } from './adapter.ts';
import type { TaskEvent, TaskEventFilter, TaskEventPayload } from './types.ts';

type Method = 'insert' | 'bulkInsert' | 'query';

export class DualTaskDB implements TaskDB {
  constructor(
    private primary: TaskDB,
    private secondary: TaskDB,
    private strict = false,
    private logMismatch = true,
    private log: Console = console
  ) {}

  private async dispatch(method: Method, ...args: any[]): Promise<any> {
    const p = (this.primary as any)[method](...args)
      .then((value: unknown) => ({ ok: true, value }))
      .catch((error: unknown) => ({ ok: false, error }));
    const s = (this.secondary as any)[method](...args)
      .then((value: unknown) => ({ ok: true, value }))
      .catch((error: unknown) => ({ ok: false, error }));

    const [pr, sr] = await Promise.all([p, s]);

    if (!pr.ok || !sr.ok) {
      if (this.logMismatch) {
        this.log.warn(
          `⚠️ TaskDB dual mismatch on ${method}: primary=${pr.ok ? 'ok' : 'fail'} secondary=${
            sr.ok ? 'ok' : 'fail'
          }`
        );
      }
      if (this.strict) {
        throw (pr.ok ? sr.error : pr.error) as Error;
      }
    }

    return pr.ok ? pr.value : sr.value;
  }

  insert<T extends TaskEventPayload>(evt: TaskEvent<T>): Promise<void> {
    return this.dispatch('insert', evt);
  }

  bulkInsert<T extends TaskEventPayload>(evts: TaskEvent<T>[]): Promise<void> {
    return this.dispatch('bulkInsert', evts);
  }

  query(filter: TaskEventFilter, limit?: number): Promise<TaskEvent[]> {
    return this.dispatch('query', filter, limit);
  }
}
