import type { TaskDB } from './adapter';
import type { TaskEvent } from './types';

type Cnt = { ok: number; fail: number };

export class DualTaskDB implements TaskDB {
  constructor(
    private primary: TaskDB,   // ej: Postgres
    private secondary: TaskDB, // ej: SQLite
    private strict = false,
    private logMismatch = true,
    private log = console
  ) {}

  private async do<T extends keyof TaskDB>(
    fn: T,
    ...args: Parameters<TaskDB[T]>
  ): Promise<ReturnType<TaskDB[T]>> {
    const p = (this.primary[fn] as any)(...args)
      .then((x: any) => ({ ok: true, x }))
      .catch((e: any) => ({ ok: false, e }));
    const s = (this.secondary[fn] as any)(...args)
      .then((x: any) => ({ ok: true, x }))
      .catch((e: any) => ({ ok: false, e }));

    const [pr, sr] = await Promise.all([p, s]);

    if (!pr.ok || !sr.ok) {
      if (this.strict) {
        throw pr.ok ? sr.e : pr.e;
      } else {
        this.log.warn(`[dual:${String(fn)}] primary=${pr.ok} secondary=${sr.ok}`);
      }
    }
    // Para insert/bulkInsert devolvemos void; para query preferimos primary
    return (pr.ok ? pr.x : (sr.x as any)) as any;
  }

  insert<T=any>(evt: TaskEvent<T>): Promise<void> {
    return this.do('insert', evt);
  }
  
  bulkInsert<T=any>(evts: TaskEvent<T>[]): Promise<void> {
    return this.do('bulkInsert', evts);
  }
  
  query(filter: Partial<TaskEvent>, limit?: number): Promise<TaskEvent[]> {
    return this.do('query', filter, limit);
  }
}
