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
  runId: QnxId;
  taskId: QnxId;
  spanId: QnxId;
  parentSpanId?: QnxId;
  component: string;
  actor?: string;
}

export interface TaskEvent<T = any> {
  kind: EventKind;
  ctx: TaskContext;
  ts: number;
  status?: 'ok' | 'fail' | 'skip';
  durationMs?: number;
  details?: T;
}
