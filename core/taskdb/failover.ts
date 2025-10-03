import type { TaskDB } from './adapter';
import type { TaskEvent } from './types';
import { JSONLTaskDB } from './jsonl';

export class FailoverTaskDB implements TaskDB {
  private primary: TaskDB;
  private fallback: JSONLTaskDB;
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;
  private isUsingFallback = false;

  constructor(primary: TaskDB, fallbackDir: string = './logs') {
    this.primary = primary;
    this.fallback = new JSONLTaskDB(fallbackDir);
  }

  async insert<T = any>(evt: TaskEvent<T>): Promise<void> {
    if (this.isUsingFallback) {
      return this.fallback.insert(evt);
    }

    try {
      await this.primary.insert(evt);
      this.failureCount = 0; // Reset on success
    } catch (error) {
      this.handleFailure(error);
      return this.fallback.insert(evt);
    }
  }

  async bulkInsert<T = any>(evts: TaskEvent<T>[]): Promise<void> {
    if (this.isUsingFallback) {
      return this.fallback.bulkInsert(evts);
    }

    try {
      await this.primary.bulkInsert(evts);
      this.failureCount = 0; // Reset on success
    } catch (error) {
      this.handleFailure(error);
      return this.fallback.bulkInsert(evts);
    }
  }

  async query(filter: Partial<TaskEvent>, limit?: number): Promise<TaskEvent[]> {
    // Always query from primary if available, fallback otherwise
    if (!this.isUsingFallback) {
      try {
        return await this.primary.query(filter, limit);
      } catch (error) {
        console.warn('Primary query failed, using fallback:', error);
      }
    }
    return this.fallback.query(filter, limit);
  }

  private handleFailure(error: any) {
    this.failureCount++;
    console.error(`TaskDB primary failure #${this.failureCount}:`, error);

    if (this.failureCount >= this.MAX_FAILURES && !this.isUsingFallback) {
      this.isUsingFallback = true;
      console.warn('⚠️ TaskDB: Switching to fallback mode (JSONL)');
      // TODO: Send alert to monitoring system
    }
  }

  // Method to attempt recovery
  async attemptRecovery(): Promise<boolean> {
    if (!this.isUsingFallback) return true;

    try {
      // Test primary with a simple operation
      await this.primary.insert({
        kind: 'gate.pass',
        ctx: {
          runId: 'recovery-test',
          taskId: 'recovery-test',
          spanId: 'recovery-test',
          component: 'failover',
        },
        ts: Date.now(),
        status: 'ok',
        details: { test: true },
      });

      console.log('✅ TaskDB: Primary recovered, switching back');
      this.isUsingFallback = false;
      this.failureCount = 0;
      return true;
    } catch (error) {
      console.warn('TaskDB: Primary still unavailable:', error);
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
