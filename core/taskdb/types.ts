export type QnxId = string;

export type EventKind =
  | 'run.start'
  | 'run.finish'
  | 'run.error'
  | 'guardrail.input'
  | 'guardrail.output'
  | 'router.decision'
  | 'memory.inject'
  | 'memory.store'
  | 'tool.start'
  | 'tool.finish'
  | 'tool.error'
  | 'llm.call'
  | 'llm.result'
  | 'perf.benchmark'
  | 'gate.pass'
  | 'gate.fail';

export interface TaskContext {
  traceId: QnxId;
  spanId: QnxId;
  parentSpanId?: QnxId;
  runId: QnxId;
  taskId: QnxId;
  component: string;
  actor?: string;
}

export type TaskEventStatus = 'ok' | 'fail' | 'skip';

export type TaskEventPayload = Record<string, unknown>;

export interface TaskEvent<T extends TaskEventPayload = TaskEventPayload> {
  id?: QnxId;
  kind: EventKind;
  ctx: TaskContext;
  ts: number; // Unix epoch in milliseconds
  status?: TaskEventStatus;
  durationMs?: number;
  payload?: T;
  metadata?: Record<string, unknown>;
}

export type TaskEventFilter = Partial<{
  id: QnxId;
  traceId: QnxId;
  runId: QnxId;
  taskId: QnxId;
  spanId: QnxId;
  kind: EventKind;
  status: TaskEventStatus;
  component: string;
}>;
