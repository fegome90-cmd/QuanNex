import { createWriteStream, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import type { TaskDB } from './adapter.ts';
import type { TaskEvent, TaskEventFilter, TaskEventPayload } from './types.ts';

function validateEvent(evt: TaskEvent): void {
  if (!evt.ctx.traceId) throw new Error('TaskDB event missing traceId');
  if (!evt.ctx.spanId) throw new Error('TaskDB event missing spanId');
  if (!evt.ctx.runId || !evt.ctx.taskId) {
    throw new Error('TaskDB event missing runId/taskId');
  }
}

function matchesFilter(evt: TaskEvent, filter: TaskEventFilter): boolean {
  if (filter.id && evt.id !== filter.id) return false;
  if (filter.traceId && evt.ctx.traceId !== filter.traceId) return false;
  if (filter.spanId && evt.ctx.spanId !== filter.spanId) return false;
  if (filter.runId && evt.ctx.runId !== filter.runId) return false;
  if (filter.taskId && evt.ctx.taskId !== filter.taskId) return false;
  if (filter.kind && evt.kind !== filter.kind) return false;
  if (filter.status && evt.status !== filter.status) return false;
  if (filter.component && evt.ctx.component !== filter.component) return false;
  return true;
}

export class JsonlTaskDB implements TaskDB {
  private stream: ReturnType<typeof createWriteStream>;
  private file: string;

  constructor(pathPattern: string = './logs/taskdb-%Y-%m-%d.jsonl') {
    const date = new Date();
    const formatted = pathPattern
      .replace('%Y', String(date.getUTCFullYear()))
      .replace('%m', String(date.getUTCMonth() + 1).padStart(2, '0'))
      .replace('%d', String(date.getUTCDate()).padStart(2, '0'));
    this.file = resolve(formatted);
    this.stream = createWriteStream(this.file, { flags: 'a' });
  }

  async insert<T extends TaskEventPayload>(evt: TaskEvent<T>): Promise<void> {
    validateEvent(evt);
    this.stream.write(`${JSON.stringify(evt)}\n`);
  }

  async bulkInsert<T extends TaskEventPayload>(evts: TaskEvent<T>[]): Promise<void> {
    for (const evt of evts) {
      await this.insert(evt);
    }
  }

  async query(filter: TaskEventFilter, limit = 1000): Promise<TaskEvent[]> {
    const content = await fs.readFile(this.file, 'utf8');
    const lines = content.split('\n').filter(Boolean).reverse();
    const results: TaskEvent[] = [];

    for (const line of lines) {
      const evt: TaskEvent = JSON.parse(line);
      if (matchesFilter(evt, filter)) {
        results.push(evt);
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}

export function makeJsonlTaskDB(pattern?: string): JsonlTaskDB {
  return new JsonlTaskDB(pattern);
}
