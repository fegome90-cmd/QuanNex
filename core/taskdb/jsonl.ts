import { writeFileSync, appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { TaskDB } from './adapter';
import type { TaskEvent } from './types';

export class JSONLTaskDB implements TaskDB {
  private logDir: string;
  private currentFile: string;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    this.currentFile = this.getCurrentLogFile();
  }

  private getCurrentLogFile(): string {
    const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
    return join(this.logDir, `taskdb-${today}.jsonl`);
  }

  private rotateIfNeeded() {
    const newFile = this.getCurrentLogFile();
    if (newFile !== this.currentFile) {
      this.currentFile = newFile;
    }
  }

  async insert<T = any>(evt: TaskEvent<T>): Promise<void> {
    this.rotateIfNeeded();
    const line = JSON.stringify(evt) + '\n';
    appendFileSync(this.currentFile, line, 'utf8');
  }

  async bulkInsert<T = any>(evts: TaskEvent<T>[]): Promise<void> {
    this.rotateIfNeeded();
    const lines = evts.map(evt => JSON.stringify(evt)).join('\n') + '\n';
    appendFileSync(this.currentFile, lines, 'utf8');
  }

  async query(filter: Partial<TaskEvent>, limit: number = 1000): Promise<TaskEvent[]> {
    const results: TaskEvent[] = [];
    const files = this.getLogFiles();

    for (const file of files) {
      if (!existsSync(file)) continue;

      const content = readFileSync(file, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      for (const line of lines) {
        try {
          const evt: TaskEvent = JSON.parse(line);
          if (this.matchesFilter(evt, filter)) {
            results.push(evt);
            if (results.length >= limit) {
              return results.sort((a, b) => b.ts - a.ts);
            }
          }
        } catch (e) {
          // Skip malformed lines
          continue;
        }
      }
    }

    return results.sort((a, b) => b.ts - a.ts);
  }

  private getLogFiles(): string[] {
    const files: string[] = [];
    const today = new Date();

    // Include last 7 days of logs
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const file = join(this.logDir, `taskdb-${dateStr}.jsonl`);
      files.push(file);
    }

    return files;
  }

  private matchesFilter(evt: TaskEvent, filter: Partial<TaskEvent>): boolean {
    if (filter.kind && evt.kind !== filter.kind) return false;
    if (filter.status && evt.status !== filter.status) return false;
    if (filter.ctx?.runId && evt.ctx.runId !== filter.ctx.runId) return false;
    if (filter.ctx?.taskId && evt.ctx.taskId !== filter.ctx.taskId) return false;
    if (filter.ctx?.component && evt.ctx.component !== filter.ctx.component) return false;
    return true;
  }
}
