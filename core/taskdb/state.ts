import type { TaskDB } from './adapter.ts';

let current: TaskDB | null = null;

export function setCurrentTaskDB(db: TaskDB): void {
  current = db;
}

export function getCurrentTaskDB(): TaskDB | null {
  return current;
}
