import { InputGuardrails } from '../core/guardrails/input';
import { OutputGuardrails } from '../core/guardrails/output';
import { pickModel } from '../core/model-router/router';
import { Memory } from '../core/memory';
import { withContext } from '../core/taskdb/context';
import { makeLogger } from '../core/taskdb/logger';
import { TaskDBQueue } from '../core/taskdb/queue';
import { SQLiteTaskDB } from '../core/taskdb/sqlite';
import { FailoverTaskDB } from '../core/taskdb/failover';
import { v4 as uuid } from 'uuid';

const inG = new InputGuardrails();
const outG = new OutputGuardrails(20_000);

// TODO: inyecta tu LongAdapter real aquí
const memory = new Memory({
  store: async () => {},
  search: async () => [],
});

// TaskDB setup
const driver = process.env.TASKDB_DRIVER || 'sqlite';
let primaryDB;

switch (driver) {
  case 'pg':
    // In production, use Postgres
    const { PostgresTaskDB } = await import('../core/taskdb/pg');
    primaryDB = new PostgresTaskDB();
    break;
  case 'jsonl':
    // Fallback mode
    const { JSONLTaskDB } = await import('../core/taskdb/jsonl');
    primaryDB = new JSONLTaskDB();
    break;
  default:
    // Development mode
    primaryDB = new SQLiteTaskDB('./data/taskdb.sqlite');
}

const taskdbQueue = new TaskDBQueue(new FailoverTaskDB(primaryDB));
const logger = makeLogger(taskdbQueue);

// Mock LLM call - replace with your actual LLM implementation
async function callLLM(model: any, task: any): Promise<any> {
  // This is a placeholder - implement your actual LLM call here
  return {
    ok: true,
    data: `Response for ${task.kind} using ${model.id}`,
    meta: { model: model.id, timestamp: Date.now() },
  };
}

export async function executeTask(task: any) {
  return withContext(
    {
      runId: uuid(),
      taskId: task.taskId ?? uuid(),
      spanId: uuid(),
      component: 'orchestrator',
      actor: 'cursor',
    },
    async () => {
      const startTime = Date.now();

      try {
        logger.log('run.start', { kind: task.kind });

        // 1) Guardrails entrada
        inG.validate(task);
        logger.log('guardrail.input', { ok: true });

        // 2) Memoria
        const ctx = await memory.injectContext(task.topic || task.kind);
        logger.log('memory.inject', { topic: task.topic || task.kind, contextLength: ctx.length });

        // 3) Router
        const model = pickModel({ kind: task.kind, maxTokens: task.maxTokens });
        logger.log('router.decision', { model: model.id, reason: model.reason });

        // 4) Llamada LLM
        logger.log('llm.call', { tokens: task.maxTokens, model: model.id });
        const output = await callLLM(model, { ...task, context: ctx });
        logger.log('llm.result', { success: true, outputLength: JSON.stringify(output).length });

        // 5) Guardrails salida
        outG.validate(output);
        logger.log('guardrail.output', { ok: true });

        const duration = Date.now() - startTime;
        logger.log('run.finish', { ok: true, durationMs: duration });

        return output;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.log('run.error', { error: error.message, durationMs: duration }, 'fail');
        throw error;
      }
    }
  );
}
