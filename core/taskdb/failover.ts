import type { TaskDB } from './adapter.ts';
import type { TaskEvent, TaskEventFilter } from './types.ts';
import { JsonlTaskDB } from './jsonl.ts';

export class FailoverTaskDB implements TaskDB {
  private failureCount = 0;
  private readonly maxFailures = 3;
  private isUsingFallback = false;

  constructor(private primary: TaskDB, fallbackPattern: string = './logs/taskdb-failover-%Y-%m-%d.jsonl') {
    this.fallback = new JsonlTaskDB(fallbackPattern);
  }

  private fallback: JsonlTaskDB;

  async insert(evt: TaskEvent): Promise<void> {
    if (this.isUsingFallback) {
      await this.fallback.insert(evt);
      return;
    }

    try {
      await this.primary.insert(evt);
      this.failureCount = 0;
    } catch (error) {
      this.handleFailure(error);
      await this.fallback.insert(evt);
    }
  }

  async bulkInsert(evts: TaskEvent[]): Promise<void> {
    if (!evts.length) return;
    if (this.isUsingFallback) {
      await this.fallback.bulkInsert(evts);
      return;
    }

    try {
      await this.primary.bulkInsert(evts);
      this.failureCount = 0;
    } catch (error) {
      this.handleFailure(error);
      await this.fallback.bulkInsert(evts);
    }
  }

  async query(filter: TaskEventFilter, limit?: number): Promise<TaskEvent[]> {
    if (!this.isUsingFallback) {
      try {
        return await this.primary.query(filter, limit);
      } catch (error) {
        console.warn('TaskDB primary query failed, using fallback:', error);
      }
    }
    return this.fallback.query(filter, limit);
  }

  private handleFailure(error: unknown): void {
    this.failureCount += 1;
    console.error(`TaskDB primary failure #${this.failureCount}:`, error);

    if (this.failureCount >= this.maxFailures && !this.isUsingFallback) {
      this.isUsingFallback = true;
      console.warn('⚠️ TaskDB: switching to fallback JSONL storage');
    }
  }

  async attemptRecovery(): Promise<boolean> {
    if (!this.isUsingFallback) return true;

    try {
      await this.primary.query({ kind: 'gate.pass' }, 1);
      console.log('✅ TaskDB: primary recovered, switching back');
      this.isUsingFallback = false;
      this.failureCount = 0;
      return true;
    } catch (error) {
      console.warn('TaskDB: primary still unavailable:', error);
      return false;
    }
  }

  getStatus() {
    return {
      isUsingFallback: this.isUsingFallback,
      failureCount: this.failureCount,
      primaryAvailable: !this.isUsingFallback,
    };
  }
}
