import type { TaskDB } from './adapter';
import type { TaskEvent } from './types';

export class TaskDBQueue implements TaskDB {
  constructor(
    private adapter: TaskDB,
    private MAX_BATCH = 100,
    private MAX_QUEUE = 50_000,
    private FLUSH_MS = 250
  ) {}

  private q: TaskEvent[] = [];
  private timer?: NodeJS.Timeout;
  private flushing = false;

  insert(evt: TaskEvent) {
    if (this.q.length >= this.MAX_QUEUE) {
      this.q.shift(); // Remove oldest to prevent OOM
    }
    this.q.push(evt);
    this.arm();
    return Promise.resolve();
  }

  bulkInsert(evts: TaskEvent[]) {
    this.q.push(...evts);
    this.arm();
    return Promise.resolve();
  }

  private arm() {
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.FLUSH_MS);
    }
  }

  private async flush() {
    clearTimeout(this.timer!);
    this.timer = undefined;
    if (this.flushing) return;
    this.flushing = true;

    try {
      while (this.q.length) {
        const batch = this.q.splice(0, this.MAX_BATCH);
        await this.adapter.bulkInsert(batch);
      }
    } finally {
      this.flushing = false;
    }
  }

  async query(filter: Partial<TaskEvent>, limit?: number): Promise<TaskEvent[]> {
    return this.adapter.query(filter, limit);
  }
}
