import { EventEmitter } from 'node:events';
import type { TaskDB } from './adapter.ts';
import type { TaskEvent, TaskEventFilter } from './types.ts';

export class TaskDBQueue extends EventEmitter implements TaskDB {
  private queue: TaskEvent[] = [];
  private timer?: NodeJS.Timeout;
  private flushing = false;

  constructor(
    private adapter: TaskDB,
    private maxBatch = 100,
    private maxQueue = 50_000,
    private flushIntervalMs = 250
  ) {
    super();
  }

  async insert(evt: TaskEvent): Promise<void> {
    if (this.queue.length >= this.maxQueue) {
      this.queue.shift();
    }
    this.queue.push(evt);
    this.emit('enqueue', this.queue.length);
    this.arm();
  }

  async bulkInsert(evts: TaskEvent[]): Promise<void> {
    if (!evts.length) return;
    this.queue.push(...evts);
    this.emit('enqueue', this.queue.length);
    this.arm();
  }

  async query(filter: TaskEventFilter, limit?: number): Promise<TaskEvent[]> {
    await this.flush();
    return this.adapter.query(filter, limit);
  }

  depth(): number {
    return this.queue.length;
  }

  private arm(): void {
    if (!this.timer) {
      this.timer = setTimeout(() => void this.flush(), this.flushIntervalMs);
    }
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.flushing) return;
    this.flushing = true;

    try {
      if (this.queue.length) {
        this.emit('flush:start', this.queue.length);
      }
      while (this.queue.length) {
        const batch = this.queue.splice(0, this.maxBatch);
        const start = Date.now();
        await this.adapter.bulkInsert(batch);
        const duration = Date.now() - start;
        this.emit('flush:batch', duration, batch, this.queue.length);
      }
      this.emit('flush:idle', this.queue.length);
    } finally {
      this.flushing = false;
    }
  }
}
