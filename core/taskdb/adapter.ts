import type { TaskEvent, TaskEventFilter, TaskEventPayload } from './types.ts';

export interface TaskDB {
  insert<T extends TaskEventPayload = TaskEventPayload>(evt: TaskEvent<T>): Promise<void>;
  bulkInsert<T extends TaskEventPayload = TaskEventPayload>(evts: TaskEvent<T>[]): Promise<void>;
  query(filter: TaskEventFilter, limit?: number): Promise<TaskEvent[]>;
  close?(): Promise<void>;
}
