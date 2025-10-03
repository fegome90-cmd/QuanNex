import type { TaskEvent } from './types';

export interface TaskDB {
  insert<T = any>(evt: TaskEvent<T>): Promise<void>;
  bulkInsert<T = any>(evts: TaskEvent<T>[]): Promise<void>;
  query(filter: Partial<TaskEvent>, limit?: number): Promise<TaskEvent[]>;
}
